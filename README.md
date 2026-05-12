# Blat Chat (Single-page PHP chat)

A WhatsApp-style, mobile-responsive web chat with file-system managed users.

## Server requirements (Ubuntu repository only)

- `apache2`
- `php`
- `libapache2-mod-php`

Install + initialize:

```bash
sudo ./setup.sh
```

## Deploy

Copy `index.php` into Apache document root (example `/var/www/html/index.php`).

This app serves a single endpoint/page:
- `/` (login + authenticated chat UI)
- The same page handles AJAX actions (`?action=poll` and `?action=send`).

## User management (server admin only)

Users are stored in `/etc/blat-chat/users.json` as password hashes.

- Add/update user:
  ```bash
  sudo ./user-admin.sh add alice
  ```
- Delete user:
  ```bash
  sudo ./user-admin.sh del alice
  ```
- List users:
  ```bash
  sudo ./user-admin.sh list
  ```

## Chat storage

Messages are stored in `/var/lib/blat-chat/messages.json`.
