#!/usr/bin/env python3
"""
bsi-post: posts approved Berg+Schmidt India batches to Instagram and Facebook
through Meta's official Graph API. Runs on the GX-10 from a systemd timer.

Safety rules built in (see README.md):
  * Nothing posts unless its weekly batch is on origin/main AND carries an
    approval record naming an approver listed in APPROVERS.
  * One call at a time, paced. At most MAX_POSTS_PER_RUN posts per run.
  * Any rate-limit, block, or token error writes a HALT file and stops. No
    retries. Nothing runs again until a person clears the HALT.
  * A post interrupted mid-publish is never retried automatically: it is
    marked needs_check, so a crash can never cause a duplicate post.
  * Posts more than MISSED_AFTER_MIN late are marked missed, never sent, so a
    server outage cannot turn into a burst of catch-up posts.
  * LIVE=0 (the default) does everything except call Meta.

Commands: validate | plan | run | status | check-quota | set-token |
          clear-halt | resolve
"""
from __future__ import annotations

import argparse
import datetime as dt
import fcntl
import hashlib
import json
import logging
import os
import re
import smtplib
import sqlite3
import ssl
from email.message import EmailMessage
from email.utils import formatdate, make_msgid
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

try:
    import requests
except ImportError:  # validate/plan still work without it
    requests = None

IST = dt.timezone(dt.timedelta(hours=5, minutes=30))
BATCH_RE = re.compile(r"^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$")
ITEM_ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,62}$")
FORMATS = {"image", "carousel", "reel", "story"}
PLATFORMS = ("instagram", "facebook")
FINAL = {"done", "skipped", "missed", "needs_check", "failed"}

# Meta error codes (code or subcode) that mean "stop everything and let a
# person look":
#   4, 17, 32, 613, 80001-80014: rate limits     368: temporarily blocked
#   190: token invalid/expired   10, 200-299: permission    341: app limit
#   25 / 2207050: account restricted or checkpointed
#   2207042 (code 9): Instagram publishing limit reached
#   2207051 (code 4): action blocked as spam
HALT_CODES = {4, 17, 25, 32, 341, 368, 613, 190, 10, 2207042, 2207050, 2207051}


class Halt(Exception):
    """Stop the run and write the HALT file."""


class ItemError(Exception):
    """This item failed; do not retry it automatically."""


class Transient(Exception):
    """Network trouble before anything was published; retry next run."""


# --------------------------------------------------------------------------
# Configuration
# --------------------------------------------------------------------------
DEFAULTS = {
    "IG_HOST": "graph.facebook.com",
    "SITE_URL": "https://www.berg-schmidt.co.in",
    "REPO_URL": "https://github.com/yash008-VHPL/bs-india-website.git",
    "DATA_DIR": "/var/lib/bsi-post",
    "ENABLED_PLATFORMS": "instagram,facebook",
    "LIVE": "0",
    "MAX_POSTS_PER_RUN": "2",
    "POST_GAP_SEC": "120",
    "CALL_GAP_SEC": "3",
    "POLL_EVERY_SEC": "30",
    "POLL_MAX_MIN": "15",
    "MISSED_AFTER_MIN": "360",
    "IG_REFRESH_DAYS": "20",
    "ALERT_TO": "",
    "SMTP_HOST": "",
    "SMTP_PORT": "587",
    "SMTP_USER": "",
    "SMTP_FROM": "",
    "ALERTS_PER_DAY": "6",
}
NOTES: list[str] = []  # problems found this run that are not post states (batch errors, git)
REQUIRED = ["GRAPH_VERSION", "APPROVERS"]


def load_config(path: str) -> dict:
    cfg = dict(DEFAULTS)
    p = Path(path)
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            cfg[k.strip()] = v.strip().strip('"').strip("'")
    for k in list(cfg):
        if os.environ.get("BSI_" + k) is not None:
            cfg[k] = os.environ["BSI_" + k]
    cfg["_path"] = str(p)
    return cfg


def need(cfg: dict, *keys: str) -> None:
    missing = [k for k in keys if not cfg.get(k)]
    if missing:
        sys.exit(f"config {cfg['_path']}: missing {', '.join(missing)}")


def data(cfg: dict, *parts: str) -> Path:
    return Path(cfg["DATA_DIR"]).joinpath(*parts)


# --------------------------------------------------------------------------
# State (SQLite)
# --------------------------------------------------------------------------
SCHEMA = """
CREATE TABLE IF NOT EXISTS posts (
  key TEXT PRIMARY KEY,             -- batch/item/platform
  batch TEXT, item TEXT, platform TEXT,
  status TEXT NOT NULL,             -- pending|staged|publishing|done|failed|missed|needs_check|skipped
  stage TEXT,                       -- JSON: ids created so far
  post_id TEXT, permalink TEXT, error TEXT,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
"""


class State:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(str(path))
        self.db.row_factory = sqlite3.Row
        self.db.executescript(SCHEMA)

    def get(self, key: str):
        return self.db.execute("SELECT * FROM posts WHERE key=?", (key,)).fetchone()

    def put(self, key: str, **f):
        batch, item, platform = key.split("/")
        now = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
        row = self.get(key)
        if row is None:
            self.db.execute(
                "INSERT INTO posts(key,batch,item,platform,status,updated_at) VALUES(?,?,?,?,?,?)",
                (key, batch, item, platform, f.get("status", "pending"), now))
        cols = ", ".join(f"{k}=?" for k in f) + ", updated_at=?"
        self.db.execute(f"UPDATE posts SET {cols} WHERE key=?", (*f.values(), now, key))
        self.db.commit()

    def all(self):
        return self.db.execute("SELECT * FROM posts ORDER BY key").fetchall()

    def meta_get(self, k, default=None):
        r = self.db.execute("SELECT v FROM meta WHERE k=?", (k,)).fetchone()
        return r[0] if r else default

    def meta_set(self, k, v):
        self.db.execute("INSERT INTO meta(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v", (k, v))
        self.db.commit()


# --------------------------------------------------------------------------
# Tokens (kept out of the config file so the service can refresh them)
# --------------------------------------------------------------------------
def tokens_path(cfg) -> Path:
    return data(cfg, "tokens.json")


def load_tokens(cfg) -> dict:
    p = tokens_path(cfg)
    return json.loads(p.read_text()) if p.exists() else {}


def save_tokens(cfg, t: dict) -> None:
    p = tokens_path(cfg)
    tmp = p.with_suffix(".tmp")
    fd = os.open(str(tmp), os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w") as f:
        json.dump(t, f)
    os.replace(tmp, p)


def redact(s) -> str:
    s = re.sub(r"(access_token=|OAuth )[A-Za-z0-9._\-|%]+", r"\1[redacted]", str(s))
    return re.sub(r"(https?://)[^/@\s]+@", r"\1[redacted]@", s)


# --------------------------------------------------------------------------
# Batch loading and validation (offline)
# --------------------------------------------------------------------------
BRAND_RULES = [
    (re.compile(r"Berg\s*\+\s+Schmidt|Berg\s+\+\s*Schmidt|Berg\s*&\s*Schmidt|Berg\s+Schmidt"
                r"|Berg-Schmidt(?![\w.-]*\.(?:co|com|in)\b)", re.I),
     'write "Berg+Schmidt" with no spaces'),
    (re.compile("\u2014"), "em dash found; use a normal dash"),
]


def parse_time(s: str) -> dt.datetime:
    t = dt.datetime.fromisoformat(s)
    if t.tzinfo is None:
        raise ValueError("publish_at needs a UTC offset, e.g. 2026-11-16T10:00:00+05:30")
    return t


def ffprobe(path: Path) -> dict:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
        capture_output=True, text=True, timeout=60)
    if out.returncode != 0:
        raise ValueError(f"ffprobe could not read {path.name}")
    return json.loads(out.stdout)


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


class Batch:
    def __init__(self, name: str, doc: dict, repo: Path):
        self.name, self.doc, self.repo = name, doc, repo
        self.items = doc.get("items", [])

    @property
    def approved_by(self):
        return (self.doc.get("approval") or {}).get("approved_by", "")


def load_batches(repo: Path) -> list[tuple[str, dict | None, str | None]]:
    out = []
    root = repo / "content" / "social"
    if not root.exists():
        return out
    for d in sorted(root.iterdir()):
        if not d.is_dir() or d.name.startswith("_"):
            continue
        f = d / "batch.json"
        if not f.exists():
            continue
        try:
            out.append((d.name, json.loads(f.read_text()), None))
        except json.JSONDecodeError as e:
            out.append((d.name, None, f"batch.json is not valid JSON: {e}"))
    return out


def items_sha256(items) -> str:
    """Fingerprint of everything that will be posted: captions, times, links,
    and (through each media entry's sha256) every image and video."""
    blob = json.dumps(items, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()
    return hashlib.sha256(blob).hexdigest()


def media_url(cfg, src: str) -> str:
    # public/social/2026-W46/a.jpg  ->  https://www.berg-schmidt.co.in/social/2026-W46/a.jpg
    return cfg["SITE_URL"].rstrip("/") + "/" + src[len("public/"):]


def validate_batch(cfg, name: str, doc: dict, repo: Path, deep: bool = True) -> tuple[list, list]:
    """Return (errors, warnings). deep=True also inspects media files."""
    E, W = [], []
    if not BATCH_RE.match(name):
        E.append(f"folder name {name!r} must be an ISO week, e.g. 2026-W46")
    if doc.get("batch") != name:
        E.append(f'"batch" must equal the folder name {name!r}')
    approvers = [a.strip() for a in cfg.get("APPROVERS", "").split(",") if a.strip()]
    ap = doc.get("approval") or {}
    if ap.get("approved_by") or ap.get("approved_on"):
        if ap.get("approved_by") not in approvers:
            E.append(f"approval.approved_by {ap.get('approved_by')!r} is not in APPROVERS")
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", str(ap.get("approved_on", ""))):
            E.append("approval.approved_on must be YYYY-MM-DD")
        if isinstance(doc.get("items"), list) and ap.get("items_sha256") != items_sha256(doc["items"]):
            E.append("batch changed after approval (approval.items_sha256 does not match the items)")
    items = doc.get("items")
    if not isinstance(items, list) or not items:
        E.append('"items" must be a non-empty list')
        return E, W
    seen = set()
    for i, it in enumerate(items):
        tag = f"item {it.get('id', i)!s}"
        iid = it.get("id", "")
        if not ITEM_ID_RE.match(str(iid)):
            E.append(f"{tag}: id must be lower-case letters, digits, hyphens")
        if iid in seen:
            E.append(f"{tag}: duplicate id")
        seen.add(iid)
        fmt = it.get("format")
        if fmt not in FORMATS:
            E.append(f"{tag}: format must be one of {sorted(FORMATS)}")
            continue
        plats = it.get("platforms") or []
        if not plats or any(p not in PLATFORMS for p in plats):
            E.append(f"{tag}: platforms must be a non-empty subset of {list(PLATFORMS)}")
        try:
            parse_time(str(it.get("publish_at", "")))
        except ValueError as e:
            E.append(f"{tag}: publish_at: {e}")
        cap = it.get("caption", "") or ""
        fbcap = it.get("facebook_caption", cap) or ""
        if fmt == "story":
            if cap or it.get("facebook_caption"):
                E.append(f"{tag}: stories take no caption (the API ignores it)")
        else:
            if not cap.strip():
                E.append(f"{tag}: caption is empty")
            for label, text in (("caption", cap), ("facebook_caption", fbcap)):
                if len(text) > 2200:
                    E.append(f"{tag}: {label} over 2,200 characters")
            if len(re.findall(r"(?<!\w)#\w+", cap)) > 30:
                E.append(f"{tag}: more than 30 hashtags")
            if len(re.findall(r"(?<!\w)@\w+", cap)) > 20:
                E.append(f"{tag}: more than 20 @mentions")
        for label, text in (("caption", cap), ("facebook_caption", fbcap)):
            text = re.sub(r"https?://\S+", " ", text)  # a URL slug may contain berg-schmidt
            for rx, msg in BRAND_RULES:
                if rx.search(text):
                    E.append(f"{tag}: {label}: {msg}")
        link = it.get("link", "")
        if fmt == "story" and not link:
            W.append(f"{tag}: no tracked link (the API cannot add a link sticker to stories)")
        u = urllib.parse.urlparse(link)
        q = urllib.parse.parse_qs(u.query)
        site_host = urllib.parse.urlparse(cfg["SITE_URL"]).hostname
        if fmt == "story" and not link:
            pass
        elif u.scheme != "https" or u.hostname != site_host:
            E.append(f"{tag}: link must be an https link to {site_host}")
        elif not all(k in q for k in ("utm_source", "utm_medium", "utm_campaign")):
            E.append(f"{tag}: link needs utm_source, utm_medium and utm_campaign")
        if fmt != "story" and "facebook" in plats and link and link not in fbcap:
            W.append(f"{tag}: Facebook caption does not contain the tracked link")

        media = it.get("media") or []
        want = {"image": (1, 1), "reel": (1, 1), "story": (1, 1), "carousel": (2, 10)}[fmt]
        if not (want[0] <= len(media) <= want[1]):
            E.append(f"{tag}: {fmt} needs {want[0]}-{want[1]} media, has {len(media)}")
        if "instagram" in plats and cfg.get("IG_HOST") == "graph.instagram.com" \
                and any(m.get("type") == "video" for m in media):
            E.append(f"{tag}: Instagram video needs IG_HOST=graph.facebook.com (Facebook Login); "
                     "resumable upload is not available with Instagram Login")
        for m in media:
            E2, W2 = check_media(cfg, name, fmt, m, repo, deep, plats)
            E += [f"{tag}: {x}" for x in E2]
            W += [f"{tag}: {x}" for x in W2]
        if fmt == "carousel" and "facebook" in plats and any(m.get("type") != "image" for m in media):
            E.append(f"{tag}: Facebook multi-photo posts take images only; drop facebook or the videos")
        if fmt in ("image",) and any(m.get("type") != "image" for m in media):
            E.append(f"{tag}: image post needs an image")
        if fmt == "reel" and any(m.get("type") != "video" for m in media):
            E.append(f"{tag}: reel needs a video")
        if fmt == "reel" and it.get("cover"):
            E2, _ = check_media(cfg, name, "story", it["cover"], repo, deep)
            E += [f"{tag}: cover: {x}" for x in E2]
    return E, W


def check_media(cfg, batch, fmt, m, repo: Path, deep: bool, plats=()):
    E, W = [], []
    kind = m.get("type")
    if kind == "image":
        src = str(m.get("src", ""))
        prefix = f"public/social/{batch}/"
        if not src.startswith(prefix) or ".." in src:
            return [f"image src must be under {prefix}"], W
        if not re.search(r"\.jpe?g$", src, re.I):
            E.append(f"{src}: Instagram only accepts JPEG images")
        p = repo / src
        if not p.exists():
            return E + [f"{src}: file not in the repo"], W
        if not re.fullmatch(r"[0-9a-f]{64}", str(m.get("sha256", ""))):
            E.append(f"{src}: sha256 missing")
        else:
            try:
                if sha256(p) != m["sha256"]:
                    E.append(f"{src}: file differs from its sha256")
            except OSError as e:
                return E + [f"{src}: cannot read ({e.strerror})"], W
        if p.stat().st_size > 8 * 1024 * 1024:
            E.append(f"{src}: over 8 MB")
        if deep:
            try:
                s = next(x for x in ffprobe(p)["streams"] if x.get("codec_type") == "video")
                r = int(s["width"]) / int(s["height"])
                if fmt == "story":
                    if not 0.5 <= r <= 0.6:
                        W.append(f"{src}: stories should be 9:16 (is {s['width']}x{s['height']})")
                elif not 0.8 <= r <= 1.91:
                    E.append(f"{src}: feed images must be between 4:5 and 1.91:1 (is {s['width']}x{s['height']})")
            except (ValueError, StopIteration, KeyError, OSError, subprocess.TimeoutExpired) as e:
                E.append(f"{src}: cannot read image ({e})")
    elif kind == "video":
        f = str(m.get("file", ""))
        if not re.match(rf"^{re.escape(batch)}/[\w.-]+\.(mp4|mov)$", f, re.I):
            return [f"video file must be {batch}/<name>.mp4 (in {data(cfg, 'media')})"], W
        if not re.fullmatch(r"[0-9a-f]{64}", str(m.get("sha256", ""))):
            E.append(f"{f}: sha256 missing; run: sha256sum {data(cfg, 'media', f)}")
        p = data(cfg, "media", f)
        if not p.exists():
            return E + [f"{f}: not found at {p}"], W
        if deep:
            try:
                if m.get("sha256") and sha256(p) != m["sha256"]:
                    E.append(f"{f}: file differs from the approved sha256")
            except OSError as e:
                return E + [f"{f}: cannot read ({e.strerror})"], W
            try:
                info = ffprobe(p)
                v = next(x for x in info["streams"] if x.get("codec_type") == "video")
                dur = float(info["format"]["duration"])
                if v.get("codec_name") not in ("h264", "hevc"):
                    E.append(f"{f}: video codec must be H.264 or HEVC (is {v.get('codec_name')})")
                a = [x for x in info["streams"] if x.get("codec_type") == "audio"]
                if a and a[0].get("codec_name") != "aac":
                    E.append(f"{f}: audio must be AAC")
                lo, hi = (3, 60) if fmt == "story" else (3, 90)
                if not lo <= dur <= hi:
                    E.append(f"{f}: {fmt} video must be {lo}-{hi} s (is {dur:.1f} s)")
                w, h = int(v["width"]), int(v["height"])
                rot = (v.get("tags") or {}).get("rotate") or next(
                    (sd.get("rotation") for sd in v.get("side_data_list") or [] if "rotation" in sd), 0)
                if abs(int(float(rot or 0))) % 180 == 90:
                    w, h = h, w  # phone video stored landscape with a rotation flag
                if fmt in ("reel", "story") and not 0.55 <= w / h <= 0.575:
                    msg = f"{f}: {fmt} should be 9:16 (is {w}x{h})"
                    (E if "facebook" in plats else W).append(msg + ("; Facebook requires it" if "facebook" in plats else ""))
                if fmt in ("reel", "story") and "facebook" in plats and (w < 540 or h < 960):
                    E.append(f"{f}: Facebook needs at least 540x960 (is {w}x{h})")
                if p.stat().st_size > 1024 ** 3:
                    E.append(f"{f}: over 1 GB")
            except (ValueError, StopIteration, KeyError, OSError, subprocess.TimeoutExpired) as e:
                E.append(f"{f}: cannot read video ({e})")
    else:
        E.append('media "type" must be image or video')
    return E, W


# --------------------------------------------------------------------------
# Meta Graph API client: paced, serial, no retries
# --------------------------------------------------------------------------
class Meta:
    def __init__(self, cfg, tokens: dict, log: logging.Logger):
        self.cfg, self.tokens, self.log = cfg, tokens, log
        self.ver = cfg["GRAPH_VERSION"]
        self.gap = float(cfg["CALL_GAP_SEC"])
        self._last = 0.0
        self.s = requests.Session() if requests else None
        if self.s:
            self.s.headers["User-Agent"] = "bsi-post/1.0"

    # -- transport -------------------------------------------------------
    def _pace(self):
        wait = self._last + self.gap - time.monotonic()
        if wait > 0:
            time.sleep(wait)
        self._last = time.monotonic()

    def _request(self, method, url, *, params=None, data=None, headers=None, body=None, timeout=60):
        """The single place that touches the network. Tests replace it."""
        self._pace()
        try:
            r = self.s.request(method, url, params=params, data=body if body is not None else data,
                               headers=headers, timeout=timeout, allow_redirects=(method == "HEAD"))
        except requests.RequestException as e:
            raise Transient(redact(f"{method} {url.split('?')[0]}: {e}")) from None
        if method == "HEAD":
            return r.status_code, {"_content_type": r.headers.get("Content-Type", "")}
        try:
            j = r.json()
        except ValueError:
            j = {"_raw": r.text[:300]}
        return r.status_code, j

    def call(self, method, host, path, token, *, params=None, headers=None, body=None, timeout=60,
             publishing=False):
        url = f"https://{host}/{self.ver}/{path.lstrip('/')}" if not host.startswith("https://") else host
        params = dict(params or {})
        hdr = dict(headers or {})
        if body is None:
            params["access_token"] = token
        else:
            hdr["Authorization"] = f"OAuth {token}"
        try:
            if method == "GET" or body is not None:
                code, j = self._request(method, url, params=params if method == "GET" else None,
                                        data=None, headers=hdr, body=body, timeout=timeout)
            else:
                code, j = self._request(method, url, data=params, headers=hdr, timeout=timeout)
        except Transient:
            if publishing:
                raise ItemError("network error during the publish call; outcome unknown") from None
            raise
        err = j.get("error") if isinstance(j, dict) else None
        if code == 429 or (err and (err.get("code") in HALT_CODES or err.get("error_subcode") in HALT_CODES
                                    or 200 <= int(err.get("code") or 0) < 300 or 80001 <= int(err.get("code") or 0) <= 80014)):
            raise Halt(redact(f"{path.split('?')[0]}: HTTP {code} {json.dumps(err or j)[:400]}"))
        if code >= 500 and not publishing:
            raise Transient(redact(f"{path.split('?')[0]}: HTTP {code} (server error, retry next run)"))
        if code >= 400 or err:
            raise ItemError(redact(f"{path.split('?')[0]}: HTTP {code} {json.dumps(err or j)[:400]}"))
        return j

    # -- tokens ----------------------------------------------------------
    @property
    def ig_token(self):
        # With Facebook Login (IG_HOST=graph.facebook.com) Instagram calls use
        # the same Facebook token as the Page, unless one is set separately.
        if self.cfg["IG_HOST"] == "graph.facebook.com":
            return self.tokens.get("facebook") or ""
        return self.tokens.get("instagram") or ""

    @property
    def fb_token(self):
        return self.tokens.get("facebook") or ""

    @property
    def ig_host(self):
        return self.cfg["IG_HOST"]

    # -- Instagram -------------------------------------------------------
    def ig_quota(self):
        j = self.call("GET", self.ig_host, f"{self.cfg['IG_USER_ID']}/content_publishing_limit",
                      self.ig_token, params={"fields": "quota_usage,config"})
        d = (j.get("data") or [{}])[0]
        return int(d.get("quota_usage", 0)), int((d.get("config") or {}).get("quota_total", 0))

    def ig_container(self, params):
        j = self.call("POST", self.ig_host, f"{self.cfg['IG_USER_ID']}/media", self.ig_token, params=params)
        return j["id"], j.get("uri")

    def ig_upload_video(self, container_id, uri, path: Path):
        size = path.stat().st_size
        url = uri or f"https://rupload.facebook.com/ig-api-upload/{self.ver}/{container_id}"
        with open(path, "rb") as f:
            blob = f.read()
        self.call("POST", url, "", self.ig_token, headers={"offset": "0", "file_size": str(size)},
                  body=blob, timeout=600)

    def ig_wait(self, container_id):
        every, limit = float(self.cfg["POLL_EVERY_SEC"]), float(self.cfg["POLL_MAX_MIN"]) * 60
        t0 = time.monotonic()
        while True:
            j = self.call("GET", self.ig_host, container_id, self.ig_token, params={"fields": "status_code,status"})
            sc = j.get("status_code")
            if sc in ("FINISHED", "PUBLISHED"):
                return
            if sc in ("ERROR", "EXPIRED"):
                raise ItemError(f"container {container_id}: {sc} {j.get('status', '')}")
            if time.monotonic() - t0 > limit:
                raise Transient(f"container {container_id} still {sc} after {limit / 60:.0f} min")
            time.sleep(every)

    def ig_publish(self, creation_id):
        j = self.call("POST", self.ig_host, f"{self.cfg['IG_USER_ID']}/media_publish", self.ig_token,
                      params={"creation_id": creation_id}, publishing=True)
        return j["id"]

    def ig_permalink(self, media_id):
        try:
            return self.call("GET", self.ig_host, media_id, self.ig_token, params={"fields": "permalink"}).get("permalink")
        except (ItemError, Transient):
            return None

    def ig_refresh(self):
        j = self.call("GET", "https://graph.instagram.com/refresh_access_token", "", self.ig_token,
                      params={"grant_type": "ig_refresh_token"})
        return j["access_token"]

    # -- Facebook Page ---------------------------------------------------
    def fb(self, method, path, params=None, publishing=False):
        return self.call(method, "graph.facebook.com", path, self.fb_token, params=params, publishing=publishing)

    def fb_wait_video(self, video_id, need_published=False):
        """After 'finish', wait until Meta has processed the video. Any error or
        a timeout raises ItemError; the post is then marked needs_check."""
        every, limit = float(self.cfg["POLL_EVERY_SEC"]), float(self.cfg["POLL_MAX_MIN"]) * 60
        t0 = time.monotonic()
        while True:
            try:
                j = self.call("GET", "graph.facebook.com", video_id, self.fb_token, params={"fields": "status"})
            except Transient as e:
                raise ItemError(f"video {video_id}: status check failed ({e})") from None
            st = j.get("status") or {}
            phases = [st.get(k) or {} for k in ("uploading_phase", "processing_phase", "publishing_phase")]
            if st.get("video_status") == "error" or any(p.get("status") == "error" for p in phases):
                raise ItemError(f"video {video_id}: Meta reported a processing error {json.dumps(st)[:300]}")
            if phases[2].get("status") == "complete" or st.get("video_status") == "published":
                return
            if not need_published and st.get("video_status") == "ready":
                return
            if time.monotonic() - t0 > limit:
                raise ItemError(f"video {video_id}: still {st.get('video_status')} after {limit / 60:.0f} min")
            time.sleep(every)

    def fb_upload_video(self, upload_url, path: Path):
        size = path.stat().st_size
        with open(path, "rb") as f:
            blob = f.read()
        self.call("POST", upload_url, "", self.fb_token, headers={"offset": "0", "file_size": str(size)},
                  body=blob, timeout=600)


# --------------------------------------------------------------------------
# Posting one item on one platform
# --------------------------------------------------------------------------
class Poster:
    def __init__(self, cfg, state: State, meta: Meta, repo: Path, log):
        self.cfg, self.state, self.meta, self.repo, self.log = cfg, state, meta, repo, log

    def video_path(self, m) -> Path:
        p = data(self.cfg, "media", m["file"])
        try:
            ok = sha256(p) == m["sha256"]
        except OSError as e:
            raise ItemError(f"{m['file']}: cannot read ({e.strerror})") from None
        if not ok:
            raise ItemError(f"{m['file']} changed after approval (sha256 mismatch)")
        return p

    def image_live(self, m) -> bool:
        """The image must already be deployed on the site (Meta fetches it from there)."""
        url = media_url(self.cfg, m["src"])
        try:
            code, j = self.meta._request("HEAD", url, timeout=30)
        except Transient:
            return False
        # A missing file could come back as the site's index.html with 200.
        return code == 200 and str(j.get("_content_type", "")).lower().startswith("image/jpeg")

    def post(self, batch: str, it: dict, platform: str):
        key = f"{batch}/{it['id']}/{platform}"
        row = self.state.get(key)
        stage = json.loads(row["stage"]) if row and row["stage"] else {}
        for m in it["media"] + ([it["cover"]] if it.get("cover") else []):
            if m["type"] == "image" and not self.image_live(m):
                raise Transient(f"{m['src']} is not live on the site yet (deploy pending?)")
        if platform == "instagram":
            used, total = self.meta.ig_quota()
            if total and used >= total:
                raise Transient(f"Instagram publishing quota used ({used}/{total}); deferred")
        fn = getattr(self, f"{platform}_{it['format']}")
        post_id, _ = fn(key, it, stage)
        self.state.put(key, status="done", post_id=post_id, error=None)
        link = None
        if platform == "instagram":
            link = self.meta.ig_permalink(post_id)
            if link:
                self.state.put(key, permalink=link)
        self.log.info("POSTED %s -> %s %s", key, post_id, link or "")

    def _stage(self, key, stage):
        self.state.put(key, status="staged", stage=json.dumps(stage))

    def _publishing(self, key, stage):
        self.state.put(key, status="publishing", stage=json.dumps(stage))

    # -- Instagram ---------------------------------------------------------
    def _ig_child(self, m, *, carousel=False, media_type=None, extra=None):
        p = dict(extra or {})
        if carousel:
            p["is_carousel_item"] = "true"
        if m["type"] == "image":
            p["image_url"] = media_url(self.cfg, m["src"])
            if media_type:
                p["media_type"] = media_type
            cid, _ = self.meta.ig_container(p)
            return cid
        p["media_type"] = media_type or "VIDEO"
        p["upload_type"] = "resumable"
        path = self.video_path(m)
        cid, uri = self.meta.ig_container(p)
        self.meta.ig_upload_video(cid, uri, path)
        return cid

    def _ig_finish(self, key, stage, creation_id):
        self.meta.ig_wait(creation_id)
        self._publishing(key, stage)
        return self.meta.ig_publish(creation_id), None

    def _fresh(self, stage):
        # Containers expire after 24 h; rebuild if older than 23 h.
        t = stage.get("at")
        return t and (time.time() - t) < 23 * 3600

    def instagram_image(self, key, it, stage):
        if not self._fresh(stage) or "creation" not in stage:
            stage = {"at": time.time(), "creation": self._ig_child(it["media"][0], extra={"caption": it["caption"]})}
            self._stage(key, stage)
        return self._ig_finish(key, stage, stage["creation"])

    def instagram_carousel(self, key, it, stage):
        if not self._fresh(stage):
            stage = {"at": time.time(), "children": []}
        kids = stage.setdefault("children", [])
        for m in it["media"][len(kids):]:
            kids.append(self._ig_child(m, carousel=True))
            self._stage(key, stage)
        for c in kids:
            self.meta.ig_wait(c)
        if "creation" not in stage:
            stage["creation"], _ = self.meta.ig_container(
                {"media_type": "CAROUSEL", "children": ",".join(kids), "caption": it["caption"]})
            self._stage(key, stage)
        return self._ig_finish(key, stage, stage["creation"])

    def instagram_reel(self, key, it, stage):
        if not self._fresh(stage) or "creation" not in stage:
            extra = {"caption": it["caption"], "share_to_feed": "true" if it.get("share_to_feed", True) else "false"}
            if it.get("cover"):
                extra["cover_url"] = media_url(self.cfg, it["cover"]["src"])
            elif it.get("thumb_offset_ms") is not None:
                extra["thumb_offset"] = str(int(it["thumb_offset_ms"]))
            stage = {"at": time.time(), "creation": self._ig_child(it["media"][0], media_type="REELS", extra=extra)}
            self._stage(key, stage)
        return self._ig_finish(key, stage, stage["creation"])

    def instagram_story(self, key, it, stage):
        if not self._fresh(stage) or "creation" not in stage:
            stage = {"at": time.time(), "creation": self._ig_child(it["media"][0], media_type="STORIES")}
            self._stage(key, stage)
        return self._ig_finish(key, stage, stage["creation"])

    # -- Facebook Page ----------------------------------------------------
    def _page(self):
        return self.cfg["FB_PAGE_ID"]

    def _fb_caption(self, it):
        return it.get("facebook_caption", it.get("caption", ""))

    def facebook_image(self, key, it, stage):
        self._publishing(key, stage)
        j = self.meta.fb("POST", f"{self._page()}/photos",
                         {"url": media_url(self.cfg, it["media"][0]["src"]), "caption": self._fb_caption(it)},
                         publishing=True)
        return j.get("post_id") or j["id"], None

    def facebook_carousel(self, key, it, stage):
        if any(m["type"] != "image" for m in it["media"]):
            raise ItemError("Facebook multi-photo posts take images only")
        photos = stage.setdefault("photos", [])
        for m in it["media"][len(photos):]:
            j = self.meta.fb("POST", f"{self._page()}/photos",
                             {"url": media_url(self.cfg, m["src"]), "published": "false"})
            photos.append(j["id"])
            self._stage(key, stage)
        params = {"message": self._fb_caption(it)}
        for i, pid in enumerate(photos):
            params[f"attached_media[{i}]"] = json.dumps({"media_fbid": pid})
        self._publishing(key, stage)
        j = self.meta.fb("POST", f"{self._page()}/feed", params, publishing=True)
        return j["id"], None

    def _fb_video(self, key, it, stage, edge, finish_extra):
        path = self.video_path(it["media"][0])
        if "video_id" not in stage:
            j = self.meta.fb("POST", f"{self._page()}/{edge}", {"upload_phase": "start"})
            stage.update(video_id=j["video_id"], upload_url=j.get("upload_url"))
            self._stage(key, stage)
        if not stage.get("uploaded"):
            url = stage.get("upload_url") or f"https://rupload.facebook.com/video-upload/{self.meta.ver}/{stage['video_id']}"
            self.meta.fb_upload_video(url, path)
            stage["uploaded"] = True
            self._stage(key, stage)
        self._publishing(key, stage)
        j = self.meta.fb("POST", f"{self._page()}/{edge}",
                         {"upload_phase": "finish", "video_id": stage["video_id"], **finish_extra}, publishing=True)
        if j.get("success") is False:
            raise ItemError(f"{edge} finish returned success=false")
        self.meta.fb_wait_video(stage["video_id"], need_published=(edge == "video_reels"))
        return j.get("post_id") or stage["video_id"], None

    def facebook_reel(self, key, it, stage):
        return self._fb_video(key, it, stage, "video_reels",
                              {"video_state": "PUBLISHED", "description": self._fb_caption(it)})

    def facebook_story(self, key, it, stage):
        m = it["media"][0]
        if m["type"] == "video":
            return self._fb_video(key, it, stage, "video_stories", {})
        if "photo_id" not in stage:
            j = self.meta.fb("POST", f"{self._page()}/photos",
                             {"url": media_url(self.cfg, m["src"]), "published": "false"})
            stage["photo_id"] = j["id"]
            self._stage(key, stage)
        self._publishing(key, stage)
        j = self.meta.fb("POST", f"{self._page()}/photo_stories", {"photo_id": stage["photo_id"]}, publishing=True)
        return j.get("post_id") or stage["photo_id"], None


# --------------------------------------------------------------------------
# Commands
# --------------------------------------------------------------------------
def setup_log(cfg, verbose=False):
    log = logging.getLogger("bsi-post")
    if log.handlers:
        return log
    log.setLevel(logging.DEBUG if verbose else logging.INFO)
    fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s", "%Y-%m-%dT%H:%M:%S%z")
    h = logging.StreamHandler(sys.stdout)
    h.setFormatter(fmt)
    log.addHandler(h)
    # systemd sends stdout to the journal: journalctl -u bsi-post
    return log


def repo_dir(cfg, args) -> Path:
    return Path(args.repo) if getattr(args, "repo", None) else data(cfg, "repo")


def sync_repo(cfg, log) -> Path:
    repo = data(cfg, "repo")
    git = ["git", "-c", "advice.detachedHead=false"]
    if repo.exists() and subprocess.run(["git", "-C", str(repo), "rev-parse", "--verify", "-q", "HEAD"],
                                        capture_output=True, timeout=60).returncode != 0:
        import shutil
        shutil.rmtree(repo)  # a half-finished clone; start again
    if not (repo / ".git").exists():
        subprocess.run(git + ["clone", "--quiet", "--depth", "1", "--branch", "main", cfg["REPO_URL"], str(repo)],
                       check=True, timeout=600)
    else:
        subprocess.run(git + ["-C", str(repo), "fetch", "--quiet", "--depth", "1", "origin", "main"], check=True, timeout=300)
        subprocess.run(git + ["-C", str(repo), "reset", "--quiet", "--hard", "origin/main"], check=True, timeout=120)
        subprocess.run(git + ["-C", str(repo), "clean", "-qfdx"], check=True, timeout=120)
    head = subprocess.run(["git", "-C", str(repo), "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()
    log.debug("repo at %s", head)
    return repo


def collect(cfg, repo: Path, log, deep=True, skip_old=True):
    """Valid, approved batches -> list of (batch, item). Invalid batches are skipped whole.
    Batches whose every post is more than 7 days old are ignored (already done)."""
    out = []
    old = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=7)
    for name, doc, err in load_batches(repo):
        if skip_old and doc and isinstance(doc.get("items"), list) and doc["items"]:
            try:
                if all(parse_time(str(i.get("publish_at"))) < old for i in doc["items"]):
                    continue
            except ValueError:
                pass
        if err:
            log.error("batch %s skipped: %s", name, err)
            continue
        E, W = validate_batch(cfg, name, doc, repo, deep=deep)
        for w in W:
            log.warning("batch %s: %s", name, w)
        if E:
            log.error("batch %s skipped, %d error(s): %s", name, len(E), "; ".join(E[:5]))
            NOTES.append(f"Batch {name} skipped, nothing from it will post:\n  - " + "\n  - ".join(E[:15]))
            continue
        if not (doc.get("approval") or {}).get("approved_by"):
            log.info("batch %s not approved; nothing from it will post", name)
            continue
        out += [(name, it) for it in doc["items"]]
    return out


def cmd_validate(cfg, args):
    log = setup_log(cfg, args.verbose)
    repo = repo_dir(cfg, args)
    bad = 0
    for name, doc, err in load_batches(repo):
        if args.batch and name != args.batch:
            continue
        if err:
            print(f"{name}: ERROR {err}")
            bad += 1
            continue
        E, W = validate_batch(cfg, name, doc, repo, deep=True)
        ap = (doc.get("approval") or {}).get("approved_by") or "NOT APPROVED"
        print(f"{name}: {len(doc.get('items', []))} items, {len(E)} errors, {len(W)} warnings, approval: {ap}")
        for e in E:
            print(f"  ERROR   {e}")
        for w in W:
            print(f"  WARNING {w}")
        bad += bool(E)
    del log
    return 1 if bad else 0


def cmd_plan(cfg, args):
    log = setup_log(cfg, args.verbose)
    repo = repo_dir(cfg, args)
    state = State(data(cfg, "state.db"))
    enabled = [p.strip() for p in cfg["ENABLED_PLATFORMS"].split(",") if p.strip()]
    rows = []
    for name, it in collect(cfg, repo, log, deep=False, skip_old=False):
        for p in it["platforms"]:
            r = state.get(f"{name}/{it['id']}/{p}")
            st = r["status"] if r else ("pending" if p in enabled else "disabled")
            rows.append((parse_time(it["publish_at"]).astimezone(IST), name, it["id"], it["format"], p, st))
    for t, name, iid, fmt, p, st in sorted(rows):
        print(f"{t:%Y-%m-%d %H:%M} IST  {name}  {iid:<16} {fmt:<8} {p:<9} {st}")
    if not rows:
        print("nothing approved and scheduled")
    return 0


def cmd_run(cfg, args):
    need(cfg, *REQUIRED)
    log = setup_log(cfg, args.verbose)
    live = cfg["LIVE"] == "1"
    halt = data(cfg, "HALT")
    if halt.exists():
        log.error("HALTED: %s  (clear with: bsi-post clear-halt)", halt.read_text().strip())
        send_alerts_safe(cfg, log)  # retries a HALT alert that failed to send
        return 2
    data(cfg).mkdir(parents=True, exist_ok=True)
    with open(data(cfg, "run.lock"), "w") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            log.info("another run is in progress")
            return 0
        NOTES.clear()
        try:
            return _run_locked(cfg, args, log, live, halt)
        finally:
            send_alerts_safe(cfg, log)


def _run_locked(cfg, args, log, live, halt):
    state = State(data(cfg, "state.db"))

    # A row left in 'publishing' means a previous run died mid-publish. The
    # post may or may not exist: never retry it automatically.
    for r in state.all():
        if r["status"] == "publishing":
            state.put(r["key"], status="needs_check",
                      error="interrupted during publish; check the account, then resolve")
            log.error("NEEDS CHECK %s: interrupted during publish", r["key"])

    try:
        repo = sync_repo(cfg, log)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, OSError) as e:
        log.error("git sync failed, nothing posted: %s", redact(e))
        NOTES.append(f"git sync failed, nothing posted: {redact(e)}")
        return 1

    enabled = [p.strip() for p in cfg["ENABLED_PLATFORMS"].split(",") if p.strip()]
    now = dt.datetime.now(dt.timezone.utc)
    missed_after = dt.timedelta(minutes=int(cfg["MISSED_AFTER_MIN"]))
    due = []
    for name, it in collect(cfg, repo, log):
        when = parse_time(it["publish_at"])
        for p in it["platforms"]:
            if p not in enabled:
                continue
            key = f"{name}/{it['id']}/{p}"
            r = state.get(key)
            if r and r["status"] in FINAL:
                continue
            if when > now:
                continue
            if now - when > missed_after:
                if live:
                    state.put(key, status="missed", error=f"not posted within {missed_after} of {it['publish_at']}")
                log.error("MISSED %s (due %s)", key, it["publish_at"])
                continue
            due.append((when, name, it, p))
    due.sort(key=lambda x: (x[0], x[1], x[2]["id"], x[3]))
    tokens = load_tokens(cfg)
    if live:
        try:
            maybe_refresh_ig(cfg, state, Meta(cfg, tokens, log), tokens, log, enabled)
        except Halt as e:
            halt.write_text(f"{dt.datetime.now(IST):%Y-%m-%d %H:%M} IST  {e}\n")
            log.error("HALT written, all posting stopped: %s", e)
            return 2
    if not due:
        log.debug("nothing due")
        return 0

    if live:
        need(cfg, *(["IG_USER_ID"] if "instagram" in enabled else []), *(["FB_PAGE_ID"] if "facebook" in enabled else []))
        for p in {d[3] for d in due}:
            have = tokens.get("facebook") if (p == "instagram" and cfg["IG_HOST"] == "graph.facebook.com") else tokens.get(p)
            if not have:
                log.error("no %s token; run: bsi-post set-token %s", p, p)
                return 1
    meta = Meta(cfg, tokens, log)
    poster = Poster(cfg, state, meta, repo, log)
    limit = int(cfg["MAX_POSTS_PER_RUN"])
    gap = float(cfg["POST_GAP_SEC"])
    posted = 0
    try:
        for when, name, it, p in due:
            if posted >= limit:
                log.info("run limit of %d posts reached; the rest wait for the next run", limit)
                break
            key = f"{name}/{it['id']}/{p}"
            if not live:
                log.info("LIVE=0, would post %s (%s, due %s)", key, it["format"], it["publish_at"])
                continue
            if posted:
                time.sleep(gap)
            try:
                poster.post(name, it, p)
                posted += 1
            except Transient as e:
                log.warning("deferred %s: %s", key, e)
            except ItemError as e:
                r = state.get(key)
                st = "needs_check" if (r and r["status"] == "publishing") else "failed"
                state.put(key, status=st, error=str(e))
                log.error("%s %s: %s", st.upper(), key, e)
                break  # one failure ends the run; a person looks before anything else goes out
    except Halt as e:
        halt.write_text(f"{dt.datetime.now(IST):%Y-%m-%d %H:%M} IST  {e}\n")
        for r in state.all():
            if r["status"] == "publishing":
                state.put(r["key"], status="needs_check", error=f"halted during publish: {e}")
        log.error("HALT written, all posting stopped: %s", e)
        return 2
    return 0


def maybe_refresh_ig(cfg, state, meta, tokens, log, enabled):
    if "instagram" not in enabled or cfg["IG_HOST"] != "graph.instagram.com" or not tokens.get("instagram"):
        return
    last = float(state.meta_get("ig_refreshed_at", tokens.get("instagram_set_at", 0)) or 0)
    if time.time() - last < float(cfg["IG_REFRESH_DAYS"]) * 86400:
        return
    # At most one attempt a day. A second failed day in a row halts.
    tried = float(state.meta_get("ig_refresh_tried_at", 0) or 0)
    if time.time() - tried < 86400:
        return
    state.meta_set("ig_refresh_tried_at", str(time.time()))
    try:
        new = meta.ig_refresh()
    except (ItemError, Transient) as e:
        fails = int(state.meta_get("ig_refresh_fails", 0) or 0) + 1
        state.meta_set("ig_refresh_fails", str(fails))
        if fails >= 2:
            raise Halt(f"Instagram token refresh failed {fails} days running: {e}") from None
        log.warning("Instagram token refresh failed; one more try tomorrow: %s", e)
        return
    tokens["instagram"] = new
    save_tokens(cfg, tokens)
    state.meta_set("ig_refreshed_at", str(time.time()))
    state.meta_set("ig_refresh_fails", "0")
    log.info("Instagram token refreshed")


# --------------------------------------------------------------------------
# Email alerts: one digest per run, only for problems not reported before
# --------------------------------------------------------------------------
def _send_mail(cfg, subject, body):
    pw = load_tokens(cfg).get("smtp", "")
    sender = cfg["SMTP_FROM"] or cfg["SMTP_USER"]
    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = ", ".join(a.strip() for a in cfg["ALERT_TO"].split(",") if a.strip())
    msg["Subject"] = subject
    msg["Date"] = formatdate(localtime=True)
    msg["Message-ID"] = make_msgid(domain=sender.split("@")[-1] if "@" in sender else None)
    msg.set_content(body)
    port = int(cfg["SMTP_PORT"])
    ctx = ssl.create_default_context()
    cls = smtplib.SMTP_SSL if port == 465 else smtplib.SMTP
    kw = {"context": ctx} if port == 465 else {}
    with cls(cfg["SMTP_HOST"], port, timeout=30, **kw) as srv:
        if port != 465:
            srv.starttls(context=ctx)
        if cfg["SMTP_USER"]:
            srv.login(cfg["SMTP_USER"], pw)
        srv.send_message(msg)


def send_alerts_safe(cfg, log):
    """Alerts must never change the outcome of a run."""
    try:
        send_alerts(cfg, State(data(cfg, "state.db")), log)
    except Exception as e:  # noqa: BLE001
        log.error("alert step failed: %s", redact(e))


def send_alerts(cfg, state, log):
    if not (cfg.get("ALERT_TO") and cfg.get("SMTP_HOST")):
        return
    lines, marks = [], []
    halt = data(cfg, "HALT")
    if halt.exists():
        txt = halt.read_text().strip()
        if state.meta_get("alerted:halt") != txt:
            lines.append(f"HALT: all posting stopped.\n  {txt}\n  After checking: bsi-post clear-halt")
            marks.append(("alerted:halt", txt))
    for r in state.all():
        if r["status"] in ("needs_check", "failed", "missed") and state.meta_get(f"alerted:{r['key']}") != r["status"]:
            lines.append(f"{r['status'].upper()}: {r['key']}\n  {r['error'] or ''}")
            marks.append((f"alerted:{r['key']}", r["status"]))
    for n in NOTES:  # repeated every run while the cause lasts; re-sent after 24 h
        h = hashlib.sha256(n.encode()).hexdigest()[:16]
        last = float(state.meta_get(f"alerted:note:{h}", 0) or 0)
        if time.time() - last > 86400:
            lines.append(n)
            marks.append((f"alerted:note:{h}", str(time.time())))
    if not lines:
        return
    today = dt.datetime.now(IST).strftime("%Y-%m-%d")
    sent = int(state.meta_get(f"alerts_sent:{today}", 0) or 0)
    if sent >= int(cfg["ALERTS_PER_DAY"]):
        log.warning("alert cap reached for %s; not emailing", today)
        return
    body = "bsi-post on the GX-10 needs attention.\n\n" + "\n\n".join(lines) + \
           "\n\nDetails: bsi-post status   |   journalctl -u bsi-post\n"
    try:
        _send_mail(cfg, f"[bsi-post] {len(lines)} problem(s) {today}", body)
    except (OSError, smtplib.SMTPException) as e:
        log.error("alert email failed: %s", redact(e))
        return
    state.meta_set(f"alerts_sent:{today}", str(sent + 1))
    cutoff = (dt.datetime.now(IST) - dt.timedelta(days=30)).strftime("%Y-%m-%d")
    state.db.execute("DELETE FROM meta WHERE k LIKE 'alerts_sent:%' AND k < ?", (f"alerts_sent:{cutoff}",))
    state.db.commit()
    for k, v in marks:
        state.meta_set(k, v)
    log.info("alert email sent (%d item(s))", len(lines))


def cmd_test_alert(cfg, args):
    need(cfg, "ALERT_TO", "SMTP_HOST")
    try:
        _send_mail(cfg, "[bsi-post] test alert", "Test alert from bsi-post on the GX-10. Alerts are working.\n")
    except (OSError, smtplib.SMTPException) as e:
        print("failed:", redact(e))
        return 1
    print("sent to", cfg["ALERT_TO"])
    return 0


def cmd_approval_hash(cfg, args):
    repo = repo_dir(cfg, args)
    for name, doc, err in load_batches(repo):
        if name == args.batch and doc:
            print(items_sha256(doc.get("items", [])))
            return 0
    print("batch not found")
    return 1


def cmd_status(cfg, args):
    state = State(data(cfg, "state.db"))
    halt = data(cfg, "HALT")
    print("LIVE:", cfg["LIVE"], "  platforms:", cfg["ENABLED_PLATFORMS"])
    print("HALT:", halt.read_text().strip() if halt.exists() else "none")
    t = load_tokens(cfg)
    for p in PLATFORMS:
        at = t.get(f"{p}_set_at")
        age = f"{(time.time() - at) / 86400:.0f} days old" if at else "not set"
        print(f"{p} token: {'set' if t.get(p) else 'MISSING'} ({age})")
    if cfg["IG_HOST"] == "graph.instagram.com" and t.get("instagram"):
        last = float(state.meta_get("ig_refreshed_at", t.get("instagram_set_at", 0)) or 0)
        d = (time.time() - last) / 86400
        print(f"instagram token last refreshed {d:.0f} days ago" + ("  << REFRESH OVERDUE, expires at 60" if d > 45 else ""))
    counts = {}
    for r in state.all():
        counts[r["status"]] = counts.get(r["status"], 0) + 1
        if r["status"] in ("needs_check", "failed", "missed"):
            print(f"  {r['status'].upper():<11} {r['key']}  {r['error'] or ''}")
    print("totals:", counts or "no posts yet")
    return 0


def cmd_check_quota(cfg, args):
    need(cfg, *REQUIRED, "IG_USER_ID")
    log = setup_log(cfg)
    meta = Meta(cfg, load_tokens(cfg), log)
    try:
        used, total = meta.ig_quota()
    except (Halt, ItemError, Transient) as e:
        print("quota check failed:", e)
        return 1
    print(f"Instagram API publishing: {used} used of {total} per rolling 24 h")
    return 0


def cmd_set_token(cfg, args):
    tok = sys.stdin.readline().strip()
    if args.platform == "smtp":
        tok = tok.replace(" ", "")  # app passwords are often shown in groups of four
    if not tok or " " in tok:
        print("paste the token on stdin")
        return 1
    data(cfg).mkdir(parents=True, exist_ok=True)
    t = load_tokens(cfg)
    t[args.platform] = tok
    t[f"{args.platform}_set_at"] = time.time()
    save_tokens(cfg, t)
    if args.platform == "instagram":
        State(data(cfg, "state.db")).meta_set("ig_refreshed_at", str(time.time()))
    if args.platform == "smtp":
        print("smtp password saved")
        return 0
    print(f"{args.platform} token saved to {tokens_path(cfg)} (mode 600)")
    return 0


def cmd_clear_halt(cfg, args):
    h = data(cfg, "HALT")
    if h.exists():
        print("cleared:", h.read_text().strip())
        h.unlink()
    else:
        print("no HALT")
    return 0


def cmd_resolve(cfg, args):
    state = State(data(cfg, "state.db"))
    r = state.get(args.key)
    if not r:
        print("unknown key; see: bsi-post status")
        return 1
    if args.outcome == "posted":
        state.put(args.key, status="done", post_id=args.post_id or r["post_id"], error="resolved by hand: posted")
    elif args.outcome == "skip":
        state.put(args.key, status="skipped", error="resolved by hand: skipped")
    else:  # retry
        state.put(args.key, status="pending", stage=None, error="resolved by hand: retry")
    state.db.execute("DELETE FROM meta WHERE k=?", (f"alerted:{args.key}",))
    state.db.commit()
    print(args.key, "->", state.get(args.key)["status"])
    return 0


def main(argv=None):
    ap = argparse.ArgumentParser(prog="bsi-post", description=__doc__.split("\n")[1])
    ap.add_argument("--config", default=os.environ.get("BSI_POST_CONFIG", "/etc/bsi-post/config.env"))
    ap.add_argument("-v", "--verbose", action="store_true")
    sub = ap.add_subparsers(dest="cmd", required=True)
    v = sub.add_parser("validate", help="check batches offline")
    v.add_argument("batch", nargs="?")
    v.add_argument("--repo", help="check a local checkout instead of the synced one")
    pl = sub.add_parser("plan", help="list approved posts and their state")
    pl.add_argument("--repo")
    sub.add_parser("run", help="post what is due (the timer runs this)")
    sub.add_parser("status", help="HALT, tokens, problems")
    ah = sub.add_parser("approval-hash", help="print approval.items_sha256 for a batch")
    ah.add_argument("batch")
    ah.add_argument("--repo")
    sub.add_parser("check-quota", help="one call: Instagram publishing quota")
    st = sub.add_parser("set-token", help="store a token read from stdin")
    st.add_argument("platform", choices=PLATFORMS + ("smtp",))
    sub.add_parser("test-alert", help="send one test alert email")
    sub.add_parser("clear-halt")
    rs = sub.add_parser("resolve", help="close a needs_check/failed/missed post by hand")
    rs.add_argument("key", help="batch/item/platform, as shown by status")
    rs.add_argument("outcome", choices=["posted", "skip", "retry"])
    rs.add_argument("--post-id")
    args = ap.parse_args(argv)
    cfg = load_config(args.config)
    fn = {"validate": cmd_validate, "plan": cmd_plan, "run": cmd_run, "status": cmd_status,
          "check-quota": cmd_check_quota, "set-token": cmd_set_token, "clear-halt": cmd_clear_halt,
          "resolve": cmd_resolve, "approval-hash": cmd_approval_hash, "test-alert": cmd_test_alert}[args.cmd]
    return fn(cfg, args)


if __name__ == "__main__":
    sys.exit(main())
