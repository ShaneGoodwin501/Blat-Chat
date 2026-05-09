# Blat Chat

Secure multi-room chat application with admin management, built for Apache2 + PHP + MySQL on Ubuntu.

## Requirements (Ubuntu packages)

```bash
sudo apt update
sudo apt install -y apache2 php php-mysql php-mbstring php-gd php-curl php-xml mysql-server
```

## Setup

1. Create a MySQL database and user.
2. Copy `config.example.php` to `config.php` and update DB credentials.
3. Import schema:
   ```bash
   mysql -u root -p < sql/schema.sql
   ```
4. Ensure writable upload storage:
   ```bash
   sudo mkdir -p /var/www/blatchat/storage/uploads
   sudo chown -R www-data:www-data /var/www/blatchat/storage
   ```
5. Place all project files in one directory under Apache document root (for example `/var/www/blatchat`).

## Default admin bootstrap

After schema import, create first admin:

```sql
INSERT INTO users (username, password_hash, is_admin)
VALUES ('admin', '<PASSWORD_HASH>', 1);
```

Generate `<PASSWORD_HASH>` with:

```bash
php -r "echo password_hash('ChangeMeNow!', PASSWORD_DEFAULT), PHP_EOL;"
```

## Security notes

- Passwords are stored only as `password_hash` hashes.
- Media is served via `media.php` after permission checks (not directly web browsable).
- Admin-only area is protected in server-side checks.
