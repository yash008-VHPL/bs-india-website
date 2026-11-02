#!/usr/bin/env bash
# Install bsi-post on the GX-10. Run as root from a checkout of the repo:
#   sudo bash tools/bsi-post/install.sh
# Idempotent. Does NOT enable the timer and does NOT overwrite an existing
# config. Uninstall: see README.md.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
[ "$(id -u)" = 0 ] || { echo "run with sudo"; exit 1; }
command -v git >/dev/null || { echo "git missing: apt install git"; exit 1; }
python3 -c "import requests" || { echo "python3-requests missing: apt install python3-requests"; exit 1; }
command -v ffprobe >/dev/null || { echo "ffprobe missing: apt install ffmpeg"; exit 1; }

id bsipost >/dev/null 2>&1 || useradd --system --home-dir /var/lib/bsi-post --shell /usr/sbin/nologin bsipost
install -d -o bsipost -g bsipost -m 700 /var/lib/bsi-post /var/lib/bsi-post/media /var/lib/bsi-post/log
install -d -o root -g root -m 755 /opt/bsi-post
install -o root -g root -m 755 "$here/bsi_post.py" /opt/bsi-post/bsi_post.py
install -d -o root -g bsipost -m 750 /etc/bsi-post
if [ ! -f /etc/bsi-post/config.env ]; then
  install -o root -g bsipost -m 640 "$here/config.env.example" /etc/bsi-post/config.env
  echo "created /etc/bsi-post/config.env (fill it in)"
else
  echo "kept existing /etc/bsi-post/config.env"
fi
cat > /usr/local/bin/bsi-post <<'W'
#!/bin/sh
# Every bsi-post command runs as the bsipost service user.
exec sudo -u bsipost /usr/bin/python3 /opt/bsi-post/bsi_post.py --config /etc/bsi-post/config.env "$@"
W
chmod 755 /usr/local/bin/bsi-post
install -o root -g root -m 644 "$here/systemd/bsi-post.service" /etc/systemd/system/bsi-post.service
install -o root -g root -m 644 "$here/systemd/bsi-post.timer" /etc/systemd/system/bsi-post.timer
systemctl daemon-reload
echo "installed. Timer NOT enabled. Next: fill /etc/bsi-post/config.env"
