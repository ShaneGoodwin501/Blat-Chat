<?php
require __DIR__ . '/../inc/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $stmt = db()->prepare('SELECT id, password_hash FROM users WHERE username = ?');
    $stmt->execute([trim($_POST['username'] ?? '')]);
    $user = $stmt->fetch();
    if ($user && password_verify($_POST['password'] ?? '', $user['password_hash'])) {
        $_SESSION['uid'] = $user['id'];
        header('Location: ' . url('/chat.php'));
        exit;
    }
    $error = 'Invalid credentials.';
}
?>
<!doctype html><html><head><meta charset="utf-8"><title>Blat Chat Login</title><link rel="stylesheet" href="<?= url('/style.css') ?>"></head><body>
<div class="container"><div class="card"><h2>Login</h2>
<?php if (!empty($error)): ?><p><?= e($error) ?></p><?php endif; ?>
<form method="post" class="row">
<input name="username" placeholder="Username" required>
<input type="password" name="password" placeholder="Password" required>
<button>Login</button>
</form>
</div></div></body></html>
