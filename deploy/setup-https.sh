#!/usr/bin/env bash
# Set up HTTPS for a fresh Blat-Chat install on Debian/Ubuntu.
#
# Prereqs (already done by deploy/README.md steps 1-6):
#   - DNS A record for your domain points at this box
#   - nginx is installed and the systemd unit is running the app on :3000
#   - you have sudo
#
# Usage:
#   sudo ./setup-https.sh <domain> <email>
# Example:
#   sudo ./setup-https.sh chat.example.com you@example.com
#
# This script is idempotent — re-running it on an already-HTTPS install
# just refreshes certs and reloads nginx.

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Re-run as root: sudo $0 <domain> <email>" >&2
    exit 1
fi

if [[ $# -ne 2 ]]; then
    echo "Usage: sudo $0 <domain> <email>" >&2
    echo "Example: sudo $0 chat.example.com admin@example.com" >&2
    exit 1
fi

DOMAIN="$1"
EMAIL="$2"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SITES_AVAIL="/etc/nginx/sites-available"
SITES_EN="/etc/nginx/sites-enabled"
SITE_FILE="$SITES_AVAIL/blatchat"

echo "==> Installing certbot (with nginx plugin) if missing"
if ! command -v certbot >/dev/null 2>&1; then
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y -qq certbot python3-certbot-nginx
fi

echo "==> Writing nginx site config for ${DOMAIN}"
# Render the template with the real domain. We use sed because envsubst
# would also expand $host, $http_upgrade, etc. inside the nginx config.
sed "s|chat\.example\.com|${DOMAIN}|g" "$SCRIPT_DIR/nginx.conf" > "$SITE_FILE"

# Enable the site (idempotent — symlink is harmless if it already exists)
ln -sf "$SITE_FILE" "$SITES_EN/blatchat"
# Remove the default site if present so our server_name is unambiguous
rm -f "$SITES_EN/default"

echo "==> Validating nginx config"
nginx -t

echo "==> Reloading nginx"
systemctl reload nginx

echo "==> Requesting/renewing Let's Encrypt cert for ${DOMAIN}"
# --nginx: modify the running nginx config in place to add the 443 block
#          (we've already pre-written the config but the plugin will
#           accept it as-is and just add the cert paths)
# --redirect: 80→443 (we've also pre-written this — harmless idempotent)
# --no-eff-email: opt out of EFF mailing list
certbot --nginx \
    -d "$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --redirect \
    --non-interactive

echo "==> Verifying"
sleep 1
HTTP_CODE=$(curl -sk -o /dev/null -w '%{http_code}' "https://${DOMAIN}/")
echo "    https://${DOMAIN}/ -> HTTP ${HTTP_CODE}"
if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "302" ]]; then
    echo "    OK"
else
    echo "    Unexpected status. Check: journalctl -u nginx -n 20" >&2
    exit 1
fi

echo "==> Done."
echo "    Site:           https://${DOMAIN}/"
echo "    Cert expiry:    $(certbot certificates 2>/dev/null | awk -v d="$DOMAIN" '$0 ~ d{found=1} found && /Expiry Date/ {print; exit}')"
echo "    Auto-renewal:   systemctl status certbot.timer"
