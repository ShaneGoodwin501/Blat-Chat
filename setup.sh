#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo ./setup.sh"
  exit 1
fi

apt-get update
apt-get install -y apache2 php libapache2-mod-php

install -d -m 0750 /etc/blat-chat
install -d -m 0770 -o www-data -g www-data /var/lib/blat-chat

if [[ ! -f /etc/blat-chat/users.json ]]; then
  echo '{}' > /etc/blat-chat/users.json
  chmod 0640 /etc/blat-chat/users.json
fi

chown root:www-data /etc/blat-chat/users.json

echo "Setup complete. Add users with: ./user-admin.sh add <username>"
