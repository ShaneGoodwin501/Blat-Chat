<?php
require __DIR__ . '/../inc/bootstrap.php';
$user = require_login();
$id = (int)($_GET['message_id'] ?? 0);
$roomId = (int)($_GET['room_id'] ?? 0);
if (!can_access_room((int)$user['id'], $roomId)) { http_response_code(403); exit; }
$stmt = db()->prepare('SELECT media_type FROM messages WHERE id=? AND room_id=?');
$stmt->execute([$id,$roomId]);
$m = $stmt->fetch(); if(!$m){http_response_code(404);exit;}
?>
<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="<?= url('/style.css') ?>"><title>Media</title></head><body><div class="container card">
<?php if($m['media_type']==='image'): ?><img class="full-media" src="<?= url('/media.php') ?>?message_id=<?=$id?>"><?php else: ?><video class="full-media" controls src="<?= url('/media.php') ?>?message_id=<?=$id?>"></video><?php endif; ?>
<div><a href="<?= url('/room.php') ?>?room_id=<?=$roomId?>">Back</a></div></div></body></html>
