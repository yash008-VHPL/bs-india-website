"""Offline tests for bsi_post. No network: Meta._request is replaced by a fake.
Run: python3 -m unittest -v test_bsi_post.py   (needs ffmpeg/ffprobe on PATH)
"""
import datetime as dt
import hashlib
import json
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

import bsi_post as B

NOW = dt.datetime.now(dt.timezone.utc)


def iso(minutes):
    return (NOW + dt.timedelta(minutes=minutes)).astimezone(B.IST).isoformat(timespec="seconds")


LINK = "https://www.berg-schmidt.co.in/news/x?utm_source=instagram&utm_medium=social&utm_campaign=t"


class Fake:
    """Scripted Graph API. Records every call."""

    def __init__(self):
        self.calls = []
        self.fail = {}      # substring of url -> (status, json) or Exception
        self.n = 0
        self.quota = (0, 100)

    def __call__(self, method, url, *, params=None, data=None, headers=None, body=None, timeout=60):
        self.calls.append((method, url, dict(params or data or {}), dict(headers or {})))
        for k, v in list(self.fail.items()):
            if k in url and (k != "media_publish" or method == "POST"):
                if isinstance(v, Exception):
                    raise v
                return v
        self.n += 1
        if method == "HEAD":
            return 200, {}
        if url.endswith("content_publishing_limit"):
            return 200, {"data": [{"quota_usage": self.quota[0], "config": {"quota_total": self.quota[1]}}]}
        if method == "GET" and (params or {}).get("fields", "").startswith("status_code"):
            return 200, {"status_code": "FINISHED"}
        if method == "GET" and (params or {}).get("fields") == "permalink":
            return 200, {"permalink": "https://instagram.com/p/x"}
        if url.endswith("/media"):
            return 200, {"id": f"c{self.n}"}
        if url.endswith("/media_publish"):
            return 200, {"id": f"m{self.n}"}
        if "rupload" in url:
            return 200, {"success": True}
        if url.endswith("/photos"):
            return 200, {"id": f"p{self.n}", "post_id": f"pp{self.n}"}
        if url.endswith("/feed"):
            return 200, {"id": f"f{self.n}"}
        if url.endswith("/video_reels") or url.endswith("/video_stories"):
            if (data or {}).get("upload_phase") == "start":
                return 200, {"video_id": f"v{self.n}", "upload_url": f"https://rupload.facebook.com/video-upload/v0/v{self.n}"}
            return 200, {"success": True, "post_id": f"vp{self.n}"}
        if url.endswith("/photo_stories"):
            return 200, {"success": True, "post_id": f"ps{self.n}"}
        return 404, {"error": {"code": 100, "message": "unknown in fake"}}

    def posts(self):
        return [c for c in self.calls if c[0] == "POST"]


class Base(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.repo = self.tmp / "repo"
        self.dd = self.tmp / "data"
        (self.repo / "public/social/2026-W46").mkdir(parents=True)
        (self.dd / "media/2026-W46").mkdir(parents=True)
        for n in ("a", "b", "c"):
            subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=green:s=1080x1350",
                            "-frames:v", "1", str(self.repo / f"public/social/2026-W46/{n}.jpg")], check=True)
        subprocess.run(["ffmpeg", "-loglevel", "error", "-f", "lavfi", "-i", "color=c=green:s=720x1280:d=5",
                        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "5", "-c:v", "libx264",
                        "-pix_fmt", "yuv420p", "-c:a", "aac", str(self.dd / "media/2026-W46/r.mp4")], check=True)
        self.vhash = hashlib.sha256((self.dd / "media/2026-W46/r.mp4").read_bytes()).hexdigest()
        self.cfg = dict(B.DEFAULTS)
        self.cfg.update(GRAPH_VERSION="v0", APPROVERS="Approver One", DATA_DIR=str(self.dd), LIVE="1",
                        IG_USER_ID="IG1", FB_PAGE_ID="PG1", POST_GAP_SEC="0", CALL_GAP_SEC="0",
                        POLL_EVERY_SEC="0", MAX_POSTS_PER_RUN="10", _path="test")
        B.save_tokens(self.cfg, {"instagram": "IGTOKEN", "facebook": "FBTOKEN",
                                 "instagram_set_at": 9e12})
        self.fake = Fake()
        B.Meta._request = lambda s, *a, **k: self.fake(*a, **k)
        self._clear_log()

    @staticmethod
    def _clear_log():
        lg = B.logging.getLogger("bsi-post")
        for h in list(lg.handlers):
            h.close()
            lg.removeHandler(h)

    def tearDown(self):
        self._clear_log()
        shutil.rmtree(self.tmp)

    def batch(self, items, approved=True):
        doc = {"batch": "2026-W46", "approval": {"approved_by": "Approver One", "approved_on": "2026-11-13"} if approved else {},
               "items": items}
        d = self.repo / "content/social/2026-W46"
        d.mkdir(parents=True, exist_ok=True)
        (d / "batch.json").write_text(json.dumps(doc))

    def img(self, iid="i1", when=-5, plats=("instagram", "facebook"), **kw):
        it = {"id": iid, "format": "image", "platforms": list(plats), "publish_at": iso(when),
              "caption": "Heat stress tips from Berg+Schmidt. " + LINK, "link": LINK,
              "media": [{"type": "image", "src": "public/social/2026-W46/a.jpg"}]}
        it.update(kw)
        return it

    def run_(self):
        class A: repo = str(self.repo); verbose = False
        return B.cmd_run(self.cfg, A)

    def st(self, key):
        r = B.State(self.dd / "state.db").get(key)
        return r["status"] if r else None


class T(Base):
    def test_unapproved_posts_nothing(self):
        self.batch([self.img()], approved=False)
        self.assertEqual(self.run_(), 0)
        self.assertEqual(self.fake.calls, [])

    def test_wrong_approver_rejected(self):
        self.batch([self.img()])
        self.cfg["APPROVERS"] = "Someone Else"
        self.run_()
        self.assertEqual(self.fake.calls, [])

    def test_image_both_platforms(self):
        self.batch([self.img()])
        self.assertEqual(self.run_(), 0)
        self.assertEqual(self.st("2026-W46/i1/instagram"), "done")
        self.assertEqual(self.st("2026-W46/i1/facebook"), "done")
        urls = [c[1] for c in self.fake.posts()]
        self.assertTrue(any(u.endswith("/IG1/media") for u in urls))
        self.assertTrue(any(u.endswith("/IG1/media_publish") for u in urls))
        self.assertTrue(any(u.endswith("/PG1/photos") for u in urls))
        # no token in any url
        self.assertFalse(any("IGTOKEN" in c[1] or "FBTOKEN" in c[1] for c in self.fake.calls))
        # second run posts nothing new
        n = len(self.fake.posts())
        self.run_()
        self.assertEqual(len(self.fake.posts()), n)

    def test_future_not_posted(self):
        self.batch([self.img(when=+60)])
        self.run_()
        self.assertEqual(self.fake.calls, [])

    def test_missed_never_sent(self):
        self.batch([self.img(when=-8 * 60)])
        self.run_()
        self.assertEqual(self.fake.calls, [])
        self.assertEqual(self.st("2026-W46/i1/instagram"), "missed")

    def test_crash_mid_publish_is_never_retried(self):
        self.batch([self.img(plats=("instagram",))])
        B.State(self.dd / "state.db").put("2026-W46/i1/instagram", status="publishing", stage="{}")
        self.run_()
        self.assertEqual(self.st("2026-W46/i1/instagram"), "needs_check")
        self.assertEqual(self.fake.posts(), [])

    def test_rate_limit_halts_everything(self):
        self.batch([self.img(), self.img("i2")])
        self.fake.fail["/IG1/media"] = (429, {"error": {"code": 4, "message": "limit"}})
        self.assertEqual(self.run_(), 2)
        self.assertTrue((self.dd / "HALT").exists())
        n = len(self.fake.calls)
        self.fake.fail.clear()
        self.assertEqual(self.run_(), 2)
        self.assertEqual(len(self.fake.calls), n, "no calls while halted")

    def test_token_error_halts(self):
        self.batch([self.img(plats=("facebook",))])
        self.fake.fail["/PG1/photos"] = (400, {"error": {"code": 190, "message": "expired"}})
        self.assertEqual(self.run_(), 2)
        self.assertEqual(self.st("2026-W46/i1/facebook"), "needs_check")

    def test_network_error_on_publish_needs_check(self):
        self.batch([self.img(plats=("instagram",))])
        self.fake.fail["media_publish"] = B.Transient("reset")
        self.run_()
        self.assertEqual(self.st("2026-W46/i1/instagram"), "needs_check")

    def test_network_error_before_publish_retries(self):
        self.batch([self.img(plats=("instagram",))])
        self.fake.fail["/IG1/media"] = B.Transient("reset")
        self.run_()
        self.assertNotIn(self.st("2026-W46/i1/instagram"), B.FINAL)
        self.fake.fail.clear()
        self.run_()
        self.assertEqual(self.st("2026-W46/i1/instagram"), "done")

    def test_item_error_stops_run(self):
        self.batch([self.img("i1", plats=("instagram",)), self.img("i2", plats=("instagram",))])
        self.fake.fail["/IG1/media"] = (400, {"error": {"code": 100, "message": "bad"}})
        self.run_()
        self.assertEqual(self.st("2026-W46/i1/instagram"), "failed")
        self.assertIsNone(self.st("2026-W46/i2/instagram"))

    def test_run_limit(self):
        self.cfg["MAX_POSTS_PER_RUN"] = "2"
        self.batch([self.img(f"i{n}", plats=("instagram",)) for n in range(4)])
        self.run_()
        done = [k for k in ("i0", "i1", "i2", "i3") if self.st(f"2026-W46/{k}/instagram") == "done"]
        self.assertEqual(len(done), 2)

    def test_quota_full_defers(self):
        self.batch([self.img(plats=("instagram",))])
        self.fake.quota = (100, 100)
        self.run_()
        self.assertEqual(self.st("2026-W46/i1/instagram"), "staged")
        self.assertFalse(any(c[1].endswith("media_publish") for c in self.fake.calls))
        self.fake.quota = (5, 100)
        creates = sum(c[1].endswith("/media") for c in self.fake.posts())
        self.run_()
        self.assertEqual(self.st("2026-W46/i1/instagram"), "done")
        self.assertEqual(sum(c[1].endswith("/media") for c in self.fake.posts()), creates, "container reused")

    def test_reel_both(self):
        it = {"id": "r1", "format": "reel", "platforms": ["instagram", "facebook"], "publish_at": iso(-5),
              "caption": "Reel " + LINK, "link": LINK,
              "media": [{"type": "video", "file": "2026-W46/r.mp4", "sha256": self.vhash}]}
        self.batch([it])
        self.run_()
        self.assertEqual(self.st("2026-W46/r1/instagram"), "done")
        self.assertEqual(self.st("2026-W46/r1/facebook"), "done")
        up = [c for c in self.fake.calls if "rupload" in c[1]]
        self.assertEqual(len(up), 2)
        self.assertTrue(all(c[3]["Authorization"].startswith("OAuth ") and c[3]["offset"] == "0" for c in up))
        ig = [c for c in self.fake.posts() if c[1].endswith("/IG1/media")][0][2]
        self.assertEqual((ig["media_type"], ig["upload_type"]), ("REELS", "resumable"))

    def test_tampered_video_blocks_batch(self):
        it = {"id": "r1", "format": "reel", "platforms": ["instagram"], "publish_at": iso(-5),
              "caption": "Reel " + LINK, "link": LINK,
              "media": [{"type": "video", "file": "2026-W46/r.mp4", "sha256": "0" * 64}]}
        self.batch([it])
        self.run_()
        self.assertEqual(self.fake.calls, [])

    def test_carousel_both(self):
        it = {"id": "k1", "format": "carousel", "platforms": ["instagram", "facebook"], "publish_at": iso(-5),
              "caption": "Carousel " + LINK, "link": LINK,
              "media": [{"type": "image", "src": f"public/social/2026-W46/{n}.jpg"} for n in "abc"]}
        self.batch([it])
        self.run_()
        self.assertEqual(self.st("2026-W46/k1/instagram"), "done")
        self.assertEqual(self.st("2026-W46/k1/facebook"), "done")
        feed = [c for c in self.fake.posts() if c[1].endswith("/PG1/feed")][0][2]
        self.assertEqual(json.loads(feed["attached_media[2]"]).keys(), {"media_fbid"})
        parent = [c[2] for c in self.fake.posts() if c[2].get("media_type") == "CAROUSEL"][0]
        self.assertEqual(len(parent["children"].split(",")), 3)

    def test_story_image(self):
        it = {"id": "s1", "format": "story", "platforms": ["instagram", "facebook"], "publish_at": iso(-5),
              "media": [{"type": "image", "src": "public/social/2026-W46/a.jpg"}]}
        self.batch([it])
        self.run_()
        self.assertEqual(self.st("2026-W46/s1/instagram"), "done")
        self.assertEqual(self.st("2026-W46/s1/facebook"), "done")

    def test_live0_calls_nothing(self):
        self.cfg["LIVE"] = "0"
        self.batch([self.img()])
        self.run_()
        self.assertEqual(self.fake.calls, [])
        self.assertIsNone(self.st("2026-W46/i1/instagram"))

    def test_validation_rules(self):
        bad = self.img(caption="Berg + Schmidt — tips", link="https://www.berg-schmidt.co.in/news/x")
        E, W = B.validate_batch(self.cfg, "2026-W46", {"batch": "2026-W46", "items": [bad, dict(bad)]}, self.repo)
        text = " | ".join(E)
        for s in ("no spaces", "em dash", "utm_source", "duplicate id"):
            self.assertIn(s, text)

    def test_image_not_deployed_defers(self):
        self.batch([self.img(plats=("instagram",))])
        orig = self.fake.__call__
        self.fake.fail["/social/"] = (404, {})
        self.run_()
        self.assertFalse(any(c[1].endswith("/media") for c in self.fake.calls))
        self.assertNotIn(self.st("2026-W46/i1/instagram"), B.FINAL)
        del orig


if __name__ == "__main__":
    unittest.main()
