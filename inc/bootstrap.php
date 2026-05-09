<?php
session_start();

$configPath = __DIR__ . '/../config.php';
if (!file_exists($configPath)) {
    http_response_code(500);
    echo 'Server is not configured. Copy config.example.php to config.php.';
    exit;
}

$config = require $configPath;


if (!defined('BASE_URL')) {
    define('BASE_URL', rtrim(getenv('BLATCHAT_BASE_URL') ?: '', '/'));
}

function url(string $path = ''): string
{
    $path = '/' . ltrim($path, '/');
    return BASE_URL . $path;
}


function db(): PDO
{
    static $pdo = null;
    global $config;

    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', $config['db_host'], $config['db_name']);
        $pdo = new PDO($dsn, $config['db_user'], $config['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    }

    return $pdo;
}

function current_user(): ?array
{
    if (empty($_SESSION['uid'])) {
        return null;
    }

    $stmt = db()->prepare('SELECT id, username, is_admin FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['uid']]);
    return $stmt->fetch() ?: null;
}

function require_login(): array
{
    $user = current_user();
    if (!$user) {
        header('Location: /index.php');
        exit;
    }
    return $user;
}

function require_admin(): array
{
    $user = require_login();
    if (!(bool)$user['is_admin']) {
        http_response_code(403);
        echo 'Forbidden';
        exit;
    }
    return $user;
}

function can_access_room(int $userId, int $roomId): bool
{
    $stmt = db()->prepare('SELECT is_admin FROM users WHERE id = ?');
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    if ($user && (bool)$user['is_admin']) {
        return true;
    }

    $stmt = db()->prepare('SELECT 1 FROM room_permissions WHERE user_id = ? AND room_id = ?');
    $stmt->execute([$userId, $roomId]);
    return (bool)$stmt->fetchColumn();
}

function e(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}
