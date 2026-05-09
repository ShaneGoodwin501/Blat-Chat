<?php
require __DIR__ . '/../inc/bootstrap.php';
$user = require_login();
$roomId = (int)($_POST['room_id'] ?? 0);
if (!can_access_room((int)$user['id'], $roomId)) { http_response_code(403); exit; }

$body = trim($_POST['body'] ?? '');
$mediaName = $mediaPath = $mediaMime = $mediaType = null;

if (!empty($_FILES['media']['tmp_name'])) {
    global $config;
    if ($_FILES['media']['size'] > $config['max_upload_bytes']) { http_response_code(413); exit; }
    $mime = mime_content_type($_FILES['media']['tmp_name']) ?: 'application/octet-stream';
    if (str_starts_with($mime, 'image/')) $mediaType = 'image';
    if (str_starts_with($mime, 'video/')) $mediaType = 'video';
    if (!$mediaType) { http_response_code(400); exit; }

    $name = bin2hex(random_bytes(16));
    $target = rtrim($config['upload_dir'], '/') . '/' . $name;
    if (!move_uploaded_file($_FILES['media']['tmp_name'], $target)) { http_response_code(500); exit; }

    $mediaName = $_FILES['media']['name'];
    $mediaPath = $name;
    $mediaMime = $mime;
}

if ($body === '' && !$mediaPath) { http_response_code(400); exit; }
$stmt = db()->prepare('INSERT INTO messages (room_id,user_id,body,media_name,media_path,media_mime,media_type) VALUES (?,?,?,?,?,?,?)');
$stmt->execute([$roomId,$user['id'],$body ?: null,$mediaName,$mediaPath,$mediaMime,$mediaType]);
http_response_code(204);
