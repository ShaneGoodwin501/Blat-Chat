<?php
require __DIR__ . '/../inc/bootstrap.php';
header('Content-Type: application/json');
$user = require_login();
$roomId = (int)($_GET['room_id'] ?? 0);
$afterId = (int)($_GET['after_id'] ?? 0);
if (!can_access_room((int)$user['id'], $roomId)) { http_response_code(403); echo '[]'; exit; }
$stmt = db()->prepare('SELECT m.id,m.room_id,m.body,m.media_type,m.created_at,u.username, m.id as media_id FROM messages m JOIN users u ON u.id=m.user_id WHERE m.room_id=? AND m.id>? ORDER BY m.id ASC');
$stmt->execute([$roomId,$afterId]);
echo json_encode($stmt->fetchAll());
