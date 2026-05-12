<?php
session_start();

define('USERS_FILE', '/etc/blat-chat/users.json');
define('MESSAGES_FILE', '/var/lib/blat-chat/messages.json');
define('MAX_MESSAGE_LENGTH', 600);

function ensureStorage(): void
{
    $messageDir = dirname(MESSAGES_FILE);
    if (!is_dir($messageDir)) {
        mkdir($messageDir, 0770, true);
    }

    if (!file_exists(MESSAGES_FILE)) {
        file_put_contents(MESSAGES_FILE, json_encode([]), LOCK_EX);
        chmod(MESSAGES_FILE, 0660);
    }
}

function loadUsers(): array
{
    if (!file_exists(USERS_FILE)) {
        return [];
    }

    $raw = file_get_contents(USERS_FILE);
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function loadMessages(): array
{
    if (!file_exists(MESSAGES_FILE)) {
        return [];
    }

    $raw = file_get_contents(MESSAGES_FILE);
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function saveMessages(array $messages): void
{
    file_put_contents(MESSAGES_FILE, json_encode($messages, JSON_PRETTY_PRINT), LOCK_EX);
}

function requireAuthJson(): void
{
    if (empty($_SESSION['username'])) {
        http_response_code(401);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Unauthorized']);
        exit;
    }
}

ensureStorage();

$action = $_GET['action'] ?? '';

if ($action === 'poll') {
    requireAuthJson();
    header('Content-Type: application/json');

    $messages = loadMessages();
    $after = isset($_GET['after']) ? (int) $_GET['after'] : 0;
    $newMessages = array_values(array_filter($messages, static fn($m) => ($m['id'] ?? 0) > $after));

    echo json_encode(['messages' => $newMessages]);
    exit;
}

if ($action === 'send') {
    requireAuthJson();
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        exit;
    }

    $text = trim($_POST['message'] ?? '');
    $text = mb_substr($text, 0, MAX_MESSAGE_LENGTH);

    if ($text !== '') {
        $messages = loadMessages();
        $lastId = empty($messages) ? 0 : (int) end($messages)['id'];
        $messages[] = [
            'id' => $lastId + 1,
            'user' => $_SESSION['username'],
            'text' => $text,
            'time' => gmdate('c'),
        ];
        saveMessages($messages);
    }

    header('Content-Type: application/json');
    echo json_encode(['ok' => true]);
    exit;
}

if ($action === 'logout') {
    session_destroy();
    header('Location: /');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['login'])) {
    $username = trim($_POST['username'] ?? '');
    $password = $_POST['password'] ?? '';

    $users = loadUsers();

    if (isset($users[$username]) && password_verify($password, $users[$username])) {
        $_SESSION['username'] = $username;
        header('Location: /');
        exit;
    }

    $error = 'Invalid username or password.';
}

$isAuthed = !empty($_SESSION['username']);
?><!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <title>Blat Chat</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #e5ddd5;
      color: #111;
      min-height: 100dvh;
      display: flex;
      justify-content: center;
      align-items: stretch;
    }
    .phone {
      width: 100%;
      max-width: 540px;
      min-height: 100dvh;
      background: #efeae2;
      display: flex;
      flex-direction: column;
    }
    .header {
      background: #075e54;
      color: #fff;
      padding: 14px 16px;
      font-weight: 600;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logout {
      color: #fff;
      text-decoration: none;
      font-size: 0.9rem;
      opacity: 0.9;
    }
    .chat {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .msg {
      max-width: 82%;
      padding: 8px 10px;
      border-radius: 10px;
      line-height: 1.3;
      box-shadow: 0 1px 1px rgba(0,0,0,.08);
      word-wrap: break-word;
    }
    .mine { align-self: flex-end; background: #dcf8c6; }
    .theirs { align-self: flex-start; background: #fff; }
    .meta {
      font-size: .72rem;
      color: #666;
      margin-top: 4px;
    }
    .composer {
      display: flex;
      gap: 8px;
      padding: 10px;
      background: #f0f0f0;
      border-top: 1px solid #ddd;
    }
    input, button {
      font: inherit;
      border: 1px solid #ccc;
      border-radius: 999px;
      padding: 10px 14px;
    }
    #message { flex: 1; }
    button {
      border: none;
      background: #128c7e;
      color: white;
      padding-inline: 16px;
    }
    .login-wrap {
      margin: auto;
      width: min(420px, 92vw);
      padding: 20px;
      background: #fff;
      border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,.12);
    }
    .login-wrap h1 { margin-top: 0; }
    .field { display: grid; gap: 6px; margin-bottom: 12px; }
    .error { color: #b00020; margin-bottom: 12px; }
  </style>
</head>
<body>
<?php if (!$isAuthed): ?>
  <form class="login-wrap" method="post" autocomplete="off">
    <h1>Blat Chat Login</h1>
    <?php if ($error): ?><div class="error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <div class="field">
      <label for="username">Username</label>
      <input type="text" name="username" id="username" required>
    </div>
    <div class="field">
      <label for="password">Password</label>
      <input type="password" name="password" id="password" required>
    </div>
    <button type="submit" name="login" value="1">Sign in</button>
  </form>
<?php else: ?>
  <main class="phone">
    <div class="header">
      <span>Blat Chat</span>
      <a class="logout" href="?action=logout">Logout</a>
    </div>
    <section class="chat" id="chat"></section>
    <form class="composer" id="composer">
      <input id="message" maxlength="<?= MAX_MESSAGE_LENGTH ?>" placeholder="Type a message" required>
      <button type="submit">Send</button>
    </form>
  </main>
  <script>
    const chatEl = document.getElementById('chat');
    const composer = document.getElementById('composer');
    const messageInput = document.getElementById('message');
    const currentUser = <?= json_encode($_SESSION['username']) ?>;
    let lastId = 0;

    function renderMessage(m) {
      const msg = document.createElement('article');
      msg.className = 'msg ' + (m.user === currentUser ? 'mine' : 'theirs');
      msg.innerHTML = `<div>${escapeHtml(m.text)}</div><div class="meta">${escapeHtml(m.user)} • ${new Date(m.time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>`;
      chatEl.appendChild(msg);
      chatEl.scrollTop = chatEl.scrollHeight;
      lastId = Math.max(lastId, Number(m.id));
    }

    function escapeHtml(unsafe) {
      return unsafe
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
    }

    async function poll() {
      const res = await fetch(`?action=poll&after=${lastId}`, {cache: 'no-store'});
      if (!res.ok) return;
      const data = await res.json();
      data.messages.forEach(renderMessage);
    }

    composer.addEventListener('submit', async (e) => {
      e.preventDefault();
      const text = messageInput.value.trim();
      if (!text) return;
      const formData = new FormData();
      formData.append('message', text);
      await fetch('?action=send', {method: 'POST', body: formData});
      messageInput.value = '';
      await poll();
    });

    poll();
    setInterval(poll, 1500);
  </script>
<?php endif; ?>
</body>
</html>
