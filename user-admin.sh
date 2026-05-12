#!/usr/bin/env bash
set -euo pipefail

USERS_FILE="/etc/blat-chat/users.json"

if [[ $EUID -ne 0 ]]; then
  echo "Run as root: sudo ./user-admin.sh ..."
  exit 1
fi

if [[ ! -f "$USERS_FILE" ]]; then
  echo "Missing $USERS_FILE. Run setup.sh first."
  exit 1
fi

cmd="${1:-}"
user="${2:-}"

case "$cmd" in
  add)
    if [[ -z "$user" ]]; then
      echo "Usage: $0 add <username>"
      exit 1
    fi
    read -rsp "Password for $user: " pass; echo
    hash=$(php -r 'echo password_hash($argv[1], PASSWORD_DEFAULT);' "$pass")
    php -r '
      $f=$argv[1]; $u=$argv[2]; $h=$argv[3];
      $d=json_decode(file_get_contents($f), true); if(!is_array($d)) $d=[];
      $d[$u]=$h;
      file_put_contents($f, json_encode($d, JSON_PRETTY_PRINT));
    ' "$USERS_FILE" "$user" "$hash"
    chown root:www-data "$USERS_FILE"
    chmod 0640 "$USERS_FILE"
    echo "User added/updated: $user"
    ;;
  del)
    if [[ -z "$user" ]]; then
      echo "Usage: $0 del <username>"
      exit 1
    fi
    php -r '
      $f=$argv[1]; $u=$argv[2];
      $d=json_decode(file_get_contents($f), true); if(!is_array($d)) $d=[];
      unset($d[$u]);
      file_put_contents($f, json_encode($d, JSON_PRETTY_PRINT));
    ' "$USERS_FILE" "$user"
    echo "User deleted: $user"
    ;;
  list)
    php -r '$d=json_decode(file_get_contents($argv[1]), true); foreach(array_keys($d?:[]) as $u) echo $u,PHP_EOL;' "$USERS_FILE"
    ;;
  *)
    echo "Usage: $0 {add|del|list} [username]"
    exit 1
    ;;
esac
