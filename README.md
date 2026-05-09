# Blat Chat

Secure multi-room chat application with admin management, built for:

- Apache2
- PHP
- MySQL
- Ubuntu Linux

---

# Features

- Multi-room chat
- User authentication
- Admin management
- Secure password hashing
- Permission-controlled media access
- Server-side admin protection
- Upload storage support

---

# Requirements

Recommended OS:

- Ubuntu 22.04 LTS or newer

Required packages:

- apache2
- php
- php-mysql
- php-mbstring
- php-gd
- php-curl
- php-xml
- mysql-server

---

# Installation

## 1. Update Ubuntu

```bash
sudo apt update
sudo apt upgrade -y
```

---

## 2. Install Apache, PHP and MySQL

```bash
sudo apt install -y apache2 php php-mysql php-mbstring php-gd php-curl php-xml mysql-server
```

---

## 3. Enable and Start Services

```bash
sudo systemctl enable apache2
sudo systemctl enable mysql

sudo systemctl start apache2
sudo systemctl start mysql
```

---

# Project Installation

## 4. Copy Project Files

Place the project inside the Apache web root.

Example:

```bash
sudo mkdir -p /var/www/blatchat
```

Copy all repository files into:

```text
/var/www/blatchat
```

---

## 5. Set File Permissions

Create upload storage:

```bash
sudo mkdir -p /var/www/blatchat/storage/uploads
```

Assign Apache ownership:

```bash
sudo chown -R www-data:www-data /var/www/blatchat/storage
```

Set permissions:

```bash
sudo chmod -R 755 /var/www/blatchat
```

---

# MySQL Database Setup

## 6. Open MySQL

```bash
sudo mysql
```

---

## 7. Create Database

Inside MySQL:

```sql
CREATE DATABASE blatchat
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
```

---

## 8. Create Database User

Example user:

- Username: `shane`
- Password: `PASSWORD`

```sql
CREATE USER 'shane'@'localhost'
IDENTIFIED BY 'PASSWORD';
```

---

## 9. Grant Permissions

```sql
GRANT ALL PRIVILEGES
ON blatchat.*
TO 'shane'@'localhost';
```

Apply changes:

```sql
FLUSH PRIVILEGES;
```

Exit MySQL:

```sql
EXIT;
```

---

# Database Schema Import

## 10. Import SQL Schema

From the project directory:

```bash
mysql -u shane -p blatchat < sql/schema.sql
```

Enter the password when prompted.

---

# Application Configuration

## 11. Create Config File

Copy:

```text
config.example.php
```

to:

```text
config.php
```

Example:

```bash
cp config.example.php config.php
```

---

## 12. Configure Database Credentials

Edit:

```text
config.php
```

Example configuration:

```php
<?php

define('DB_HOST', 'localhost');
define('DB_NAME', 'blatchat');
define('DB_USER', 'shane');
define('DB_PASS', 'PASSWORD');
```

---

# Create Initial Admin User

## 13. Generate Password Hash

Run:

```bash
php -r 'echo password_hash("ChangeMeNow!", PASSWORD_DEFAULT), PHP_EOL;'
```

Copy the generated hash.

Example output:

```text
$2y$10$abcdefghijklmnopqrstuv1234567890abcdefghijklmnopqrstuv
```

---

## 14. Insert Admin User

Open MySQL:

```bash
mysql -u shane -p blatchat
```

Insert admin:

```sql
INSERT INTO users (username, password_hash, is_admin)
VALUES (
    'admin',
    'PASTE_HASH_HERE',
    1
);
```

Exit MySQL:

```sql
EXIT;
```

---

# Apache Configuration

## 15. Create Apache Site Configuration

Create:

```text
/etc/apache2/sites-available/blatchat.conf
```

Example configuration:

```apache
<VirtualHost *:80>
    ServerName localhost

    DocumentRoot /var/www/blatchat

    <Directory /var/www/blatchat>
        AllowOverride All
        Require all granted
    </Directory>

    ErrorLog ${APACHE_LOG_DIR}/blatchat_error.log
    CustomLog ${APACHE_LOG_DIR}/blatchat_access.log combined
</VirtualHost>
```

---

## 16. Enable Site

```bash
sudo a2ensite blatchat.conf
```

Optional Apache modules:

```bash
sudo a2enmod rewrite
```

Disable default site:

```bash
sudo a2dissite 000-default.conf
```

Reload Apache:

```bash
sudo systemctl reload apache2
```

---

# Accessing the Application

Open:

```text
http://SERVER-IP/
```

or:

```text
http://localhost/
```

Default login:

| Username | Password |
|---|---|
| admin | ChangeMeNow! |

IMPORTANT:

Change the admin password immediately after first login.

---

# Security Notes

## Password Security

Passwords are stored using PHP:

```php
password_hash()
```

Only hashes are stored in the database.

---

## Media Security

Uploaded media is NOT directly web accessible.

Media is served through:

```text
media.php
```

after permission validation.

---

## Admin Security

Admin functionality is protected with server-side authorization checks.

Never rely on client-side checks alone.

---

# Recommended Production Hardening

## Enable HTTPS

Install Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-apache -y
```

Generate SSL certificate:

```bash
sudo certbot --apache
```

---

## Firewall

Enable UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Apache Full'
sudo ufw enable
```

---

## Disable Directory Listing

Ensure Apache config contains:

```apache
Options -Indexes
```

---

## Protect Config Files

Recommended `.htaccess`:

```apache
<Files "config.php">
    Require all denied
</Files>
```

---

# Useful Commands

## Restart Apache

```bash
sudo systemctl restart apache2
```

## Restart MySQL

```bash
sudo systemctl restart mysql
```

## View Apache Errors

```bash
sudo tail -f /var/log/apache2/error.log
```

## View MySQL Status

```bash
sudo systemctl status mysql
```

---

# Troubleshooting

## Apache Permission Errors

Fix ownership:

```bash
sudo chown -R www-data:www-data /var/www/blatchat
```

---

## MySQL Access Denied

Reset permissions:

```sql
FLUSH PRIVILEGES;
```

Verify user exists:

```sql
SELECT user, host FROM mysql.user;
```

---

## PHP Extensions Missing

Check installed modules:

```bash
php -m
```

Install missing extension:

```bash
sudo apt install php-EXTENSIONNAME
```

Restart Apache:

```bash
sudo systemctl restart apache2
```

---

# Development Notes

Recommended directory structure:

```text
blatchat/
├── admin/
├── assets/
├── sql/
├── storage/
│   └── uploads/
├── config.php
├── config.example.php
├── index.php
├── media.php
└── README.md
```

---

# License

Add your preferred license here.

Example:

```text
MIT License
```
