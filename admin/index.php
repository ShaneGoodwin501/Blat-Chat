<?php
require __DIR__ . '/../inc/bootstrap.php';
require_admin();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';
    if ($action === 'create_room') db()->prepare('INSERT INTO rooms (name) VALUES (?)')->execute([trim($_POST['room_name'])]);
    if ($action === 'delete_room') db()->prepare('DELETE FROM rooms WHERE id=?')->execute([(int)$_POST['room_id']]);
    if ($action === 'create_user') {
        $hash = password_hash($_POST['password'], PASSWORD_DEFAULT);
        db()->prepare('INSERT INTO users (username,password_hash,is_admin) VALUES (?,?,?)')->execute([trim($_POST['username']),$hash, !empty($_POST['is_admin']) ? 1 : 0]);
    }
    if ($action === 'delete_user') db()->prepare('DELETE FROM users WHERE id=? AND is_admin=0')->execute([(int)$_POST['user_id']]);
    if ($action === 'reset_password') db()->prepare('UPDATE users SET password_hash=? WHERE id=?')->execute([password_hash($_POST['new_password'], PASSWORD_DEFAULT),(int)$_POST['user_id']]);
    if ($action === 'grant') db()->prepare('INSERT IGNORE INTO room_permissions (user_id,room_id) VALUES (?,?)')->execute([(int)$_POST['user_id'],(int)$_POST['room_id']]);
    if ($action === 'deny') db()->prepare('DELETE FROM room_permissions WHERE user_id=? AND room_id=?')->execute([(int)$_POST['user_id'],(int)$_POST['room_id']]);
    if ($action === 'clear_chat') db()->prepare('DELETE FROM messages WHERE room_id=?')->execute([(int)$_POST['room_id']]);
    header('Location: /admin/index.php'); exit;
}

$users = db()->query('SELECT id,username,is_admin FROM users ORDER BY username')->fetchAll();
$rooms = db()->query('SELECT id,name FROM rooms ORDER BY name')->fetchAll();
?>
<!doctype html><html><head><meta charset="utf-8"><title>Admin</title><link rel="stylesheet" href="<?= url('/style.css') ?>"></head><body><div class="container">
<div class="card"><div class="row"><h2 style="margin-right:auto">Admin Panel</h2><a href="<?= url('/chat.php') ?>">Chat</a></div>
<div class="grid">
<div><h3>Create Room</h3><form method="post"><input type="hidden" name="action" value="create_room"><input name="room_name" required><button>Create</button></form>
<h3>Delete Room</h3><form method="post"><input type="hidden" name="action" value="delete_room"><select name="room_id"><?php foreach($rooms as $r):?><option value="<?=$r['id']?>"><?=e($r['name'])?></option><?php endforeach;?></select><button>Delete</button></form>
<h3>Clear Room Chat</h3><form method="post"><input type="hidden" name="action" value="clear_chat"><select name="room_id"><?php foreach($rooms as $r):?><option value="<?=$r['id']?>"><?=e($r['name'])?></option><?php endforeach;?></select><button>Clear</button></form></div>
<div><h3>Create User</h3><form method="post"><input type="hidden" name="action" value="create_user"><input name="username" required><input name="password" required><label><input type="checkbox" name="is_admin"> Admin</label><button>Create</button></form>
<h3>Delete User</h3><form method="post"><input type="hidden" name="action" value="delete_user"><select name="user_id"><?php foreach($users as $u): if($u['is_admin']) continue;?><option value="<?=$u['id']?>"><?=e($u['username'])?></option><?php endforeach;?></select><button>Delete</button></form>
<h3>Reset Password</h3><form method="post"><input type="hidden" name="action" value="reset_password"><select name="user_id"><?php foreach($users as $u):?><option value="<?=$u['id']?>"><?=e($u['username'])?></option><?php endforeach;?></select><input name="new_password" required><button>Reset</button></form>
<h3>Grant Room Access</h3><form method="post"><input type="hidden" name="action" value="grant"><select name="user_id"><?php foreach($users as $u): if($u['is_admin']) continue;?><option value="<?=$u['id']?>"><?=e($u['username'])?></option><?php endforeach;?></select><select name="room_id"><?php foreach($rooms as $r):?><option value="<?=$r['id']?>"><?=e($r['name'])?></option><?php endforeach;?></select><button>Grant</button></form>
<h3>Deny Room Access</h3><form method="post"><input type="hidden" name="action" value="deny"><select name="user_id"><?php foreach($users as $u): if($u['is_admin']) continue;?><option value="<?=$u['id']?>"><?=e($u['username'])?></option><?php endforeach;?></select><select name="room_id"><?php foreach($rooms as $r):?><option value="<?=$r['id']?>"><?=e($r['name'])?></option><?php endforeach;?></select><button>Deny</button></form></div>
</div></div></div></body></html>
