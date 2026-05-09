<?php
require __DIR__ . '/../inc/bootstrap.php';
$user = require_login();

$stmt = db()->prepare($user['is_admin'] ? 'SELECT id,name FROM rooms ORDER BY name' : 'SELECT r.id,r.name FROM rooms r JOIN room_permissions p ON p.room_id=r.id WHERE p.user_id=? ORDER BY r.name');
$stmt->execute($user['is_admin'] ? [] : [$user['id']]);
$rooms = $stmt->fetchAll();
?>
<!doctype html><html><head><meta charset="utf-8"><title>Rooms</title><link rel="stylesheet" href="/public/style.css"></head><body><div class="container">
<div class="card"><div class="row"><h2 style="margin-right:auto">Welcome, <?= e($user['username']) ?></h2>
<?php if ($user['is_admin']): ?><a href="/admin/index.php">Admin</a><?php endif; ?><a href="/public/logout.php">Logout</a></div>
<h3>Your chat rooms</h3><ul>
<?php foreach ($rooms as $room): ?><li><a href="/public/room.php?room_id=<?= (int)$room['id'] ?>"><?= e($room['name']) ?></a></li><?php endforeach; ?>
</ul></div></div></body></html>
