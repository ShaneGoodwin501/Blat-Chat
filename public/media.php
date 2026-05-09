<?php
require __DIR__ . '/../inc/bootstrap.php';
$user = require_login();
$id = (int)($_GET['message_id'] ?? 0);
$stmt = db()->prepare('SELECT room_id, media_path, media_mime FROM messages WHERE id=? AND media_path IS NOT NULL');
$stmt->execute([$id]);
$m = $stmt->fetch();
if (!$m || !can_access_room((int)$user['id'], (int)$m['room_id'])) { http_response_code(403); exit; }
$config = require __DIR__ . '/../config.php';
$path = rtrim($config['upload_dir'], '/') . '/' . $m['media_path'];
if (!is_file($path)) { http_response_code(404); exit; }
header('Content-Type: ' . $m['media_mime']);
readfile($path);
