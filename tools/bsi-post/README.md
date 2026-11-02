# bsi-post

Posts approved Berg+Schmidt India batches to Instagram and the Facebook Page through Meta's official Graph API. Runs on the GX-10 every 15 minutes from a systemd timer. LinkedIn, the WhatsApp Channel and the distributor pack stay manual.

## How a post gets out

1. The weekly batch is drafted and reviewed outside GitHub. This repository is **public**, so nothing is committed before approval.
2. Once approved, the batch is committed to `main`:
   - `content/social/<ISO week>/batch.json`, with `approval.approved_by`, `approval.approved_on` and `approval.items_sha256` (from `bsi-post approval-hash <week> --repo <checkout>`)
   - images in `public/social/<ISO week>/` (JPEG; the site serves them, Meta fetches them from there), each with its `sha256` in `batch.json`
   - videos copied to the GX-10 at `/var/lib/bsi-post/media/<ISO week>/`, each with its `sha256` in `batch.json`

   `items_sha256` covers every caption, time, link and file hash, so any edit after approval blocks the whole batch.
3. The timer pulls `main`, validates every batch, and posts items whose `publish_at` has passed.

Approved blog articles follow the same route: `content/blog/YYYY-MM-DD_slug.md` with `status: approved`. The site rebuilds every night at 01:05 India time and shows each article from its `date`.

## What blocks a post

| Rule | Effect |
|---|---|
| Batch not on `main`, or `approved_by` empty or not in `APPROVERS` | Nothing from the batch posts |
| Batch, caption, image or video changed after approval | Nothing from the batch posts |
| Any validation error in a batch | The whole batch is skipped |
| Image not yet live on the site | Post waits for the next run |
| More than `MISSED_AFTER_MIN` late (default 6 h) | Marked `missed`, never sent |
| Rate limit, block, or token error from Meta | `HALT` written; nothing posts until cleared |
| Crash or network loss during the publish call | Marked `needs_check`; never retried by itself |
| Any other API error | Marked `failed`; the run stops |

Pacing: one call at a time, 3 s apart; at most 2 posts per run, 120 s apart. Instagram quota is read from Meta before any Instagram work. The Instagram token (Instagram Login) is refreshed at most once a day; two failed days in a row halt.

Logs: `journalctl -u bsi-post`. No alerts are sent yet: check `bsi-post status`.

Meta app: posts made while the app is in Development mode are visible only to people with a role on the app. Switch it to Live before `LIVE=1` and check the first post from a logged-out browser.

GitHub turns off scheduled workflows on a public repository after 60 days without commits. Weekly content commits keep the nightly blog rebuild alive.

## Batch format

See `content/social/_template/batch.json`. Formats: `image`, `carousel` (2 to 10), `reel`, `story`. Instagram video (reels, video stories, video carousel items) needs `IG_HOST=graph.facebook.com`. Facebook reels and video stories must be 9:16 and at least 540x960. Every non-story item needs a `link` to the site with `utm_source`, `utm_medium` and `utm_campaign`. Captions are checked for "Berg+Schmidt" spelling and em dashes.

## Commands (on the GX-10)

```
bsi-post validate [2026-W46]     check batches, no network
bsi-post plan                    approved posts and their state
bsi-post status                  HALT, tokens, failed / needs_check / missed
bsi-post approval-hash 2026-W46 --repo <checkout>
bsi-post check-quota             one call: Instagram publishing quota
bsi-post set-token instagram     paste token, then Enter (also: facebook)
bsi-post clear-halt
bsi-post resolve <batch/item/platform> posted|skip|retry
```

## Uninstall

```
sudo systemctl disable --now bsi-post.timer
sudo rm /etc/systemd/system/bsi-post.{service,timer} /usr/local/bin/bsi-post
sudo rm -r /opt/bsi-post /etc/bsi-post /var/lib/bsi-post
sudo userdel bsipost
```

## Tests

`python3 -m unittest -v test_bsi_post.py` (offline; needs ffmpeg).
