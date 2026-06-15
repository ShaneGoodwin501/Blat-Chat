# Deploying Blat-Chat to a fresh Linode Nanode 1GB

This is a quick reference for getting the app running on a fresh Ubuntu 24.04
(or similar) box. Adjust to your distro of choice.

## 1. Provision the box

Create a Linode Nanode 1GB (or any 1GB+ Ubuntu 24.04 LTS VM) in
`ap-southeast` (closest to Australia). Set a root password at create time,
then SSH in and add your public key.

```sh
ssh root@<linode-ip>
apt update && apt -y upgrade
```

## 2. Create a non-root user + firewall

```sh
adduser blatchat --disabled-password --gecos ""
# Allow SSH, HTTP, HTTPS; nothing else
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## 3. Install Node.js (NodeSource, v22)

```sh
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
node --version   # should print v22.x
```

## 4. Lay out the app

```sh
mkdir -p /opt/blatchat /var/lib/blatchat
chown -R blatchat:blatchat /opt/blatchat /var/lib/blatchat
# Pull the code (clone or scp)
su - blatchat -c "git clone https://github.com/ShaneGoodwin501/Blat-Chat.git /opt/blatchat"
cd /opt/blatchat
sudo -u blatchat npm install --omit=dev
```

## 5. Configure the app

Generate a strong SESSION_SECRET:

```sh
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Create `/opt/blatchat/.env`:

```
SESSION_SECRET=<paste-the-long-hex-string>
ADMIN_USERNAME=shane
ADMIN_PASSWORD=<a-real-strong-password>
DATA_DIR=/var/lib/blatchat
TRUST_PROXY=1
PUBLIC_ORIGIN=https://chat.example.com
```

Fix permissions:

```sh
chmod 600 /opt/blatchat/.env
chown blatchat:blatchat /opt/blatchat/.env
```

## 6. Install the systemd unit

```sh
cp /opt/blatchat/deploy/blatchat.service /etc/systemd/system/blatchat.service
systemctl daemon-reload
systemctl enable --now blatchat
systemctl status blatchat
journalctl -u blatchat -f   # watch logs
```

On first start, the bootstrap admin (`shane`) is created from `.env`.
After that, add more users via the admin page.

## 7. Set up nginx + Let's Encrypt

Either run the included script (recommended) or do it by hand.

**Recommended — one command:**

```sh
sudo ./deploy/setup-https.sh <your-domain> <your-email>
# e.g. sudo ./deploy/setup-https.sh chat.example.com you@example.com
```

The script installs certbot, renders `deploy/nginx.conf` with your domain,
requests the cert, sets up the 80→443 redirect, and verifies. It's
idempotent — re-run it any time to refresh certs or recover from drift.

**By hand:**

```sh
apt install -y nginx certbot python3-certbot-nginx
# Replace `chat.example.com` with your domain (two places: server_name and the cert paths).
sed "s|chat\.example\.com|chat.your-domain.com|g" deploy/nginx.conf \
    | sudo tee /etc/nginx/sites-available/blatchat
sudo ln -s /etc/nginx/sites-available/blatchat /etc/nginx/sites-enabled/blatchat
sudo rm -f /etc/nginx/sites-enabled/default   # so our server_name is unambiguous
sudo nginx -t
sudo certbot --nginx -d chat.your-domain.com --redirect
sudo systemctl reload nginx
```

Either way, certs auto-renew via `certbot.timer` (installed by the certbot
package). Verify with `systemctl status certbot.timer`.

## 8. DNS

Point an A record for `chat.example.com` (or whatever you used) at the
Linode's IP. Wait for propagation, then visit `https://chat.example.com/`.

## 9. Backups

The state that matters lives in `/var/lib/blatchat/`:

- `blatchat.db` — messages, users
- `uploads/` — photos

Add a daily cron that tars this directory somewhere off-box:

```sh
# /etc/cron.daily/blatchat-backup
tar -czf /var/backups/blatchat-$(date +%F).tgz -C /var/lib blatchat
# then ship /var/backups to S3 / rsync / wherever
```

## 10. Updates

```sh
cd /opt/blatchat
sudo -u blatchat git pull
sudo -u blatchat npm install --omit=dev
systemctl restart blatchat
```
