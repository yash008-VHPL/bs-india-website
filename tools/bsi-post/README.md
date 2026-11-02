# bsi-post

Posts approved Berg+Schmidt India batches to Instagram and the Facebook Page through Meta's official Graph API. Runs on the GX-10 every 15 minutes from a systemd timer. LinkedIn, the WhatsApp Channel and the distributor pack stay manual.

## How a post gets out

1. The weekly batch is drafted and reviewed outside GitHub. This repository is **public**, so nothing is committed before approval.
2. Once approved, the batch is committed to `main`:
   - `content/social/<ISO week>/batch.json`, with `approval.approved_by` and `approval.approved_on` filled in
   - images in `public/social/<ISO week>/` (JPEG; the site serves them, Meta fetches them from there)
   - videos copied to the GX-10 at `/var/lib/bsi-post/media/<ISO week>/`, each with its `sha256` in `batch.json`
3. The timer pulls `main`, validates every batch, and posts items whose `publish_at` has passed.

Approved blog articles follow the same route: `content/blog/YYYY-MM-DD_slug.md` with `status: approved`. The site rebuilds every night at 01:05 India time and shows each article from its `date`.

## What blocks a post

| Rule | Effect |
|---|---|
| Batch not on `main`, or `approved_by` empty or not in `APPROVERS` | Nothing from the batch posts |
| Any validation error in a batch | The whole batch is skipped |
| Video changed after approval (sha256) | Batch skipped |
| Image not yet live on the site | Post waits for the next run |
| More than `MISSED_AFTER_MIN` late (default 6 h) | Marked `missed`, never sent |
| Rate limit, block, or token error from Meta | `HALT` written; nothing posts until cleared |
| Crash or network loss during the publish call | Marked `needs_check`; never retried by itself |
| Any other API error | Marked `failed`; the run stops |

Pacing: one call at a time, 3 s apart; at most 2 posts per run, 120 s apart.

## Batch format

See `content/social/_template/batch.json`. Formats: `image`, `carousel` (2 to 10), `reel`, `story`. Every non-story item needs a `link` to the site with `utm_source`, `utm_medium` and `utm_campaign`. Captions are checked for "Berg+Schmidt" spelling and em dashes.

## Commands (on the GX-10)

```
bsi-post validate [2026-W46]     check batches, no network
bsi-post plan                    approved posts and their state
bsi-post status                  HALT, tokens, failed / needs_check / missed
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
