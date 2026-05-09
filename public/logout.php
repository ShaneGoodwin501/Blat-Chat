<?php
require __DIR__ . '/../inc/bootstrap.php';
session_destroy();
header('Location: /index.php');
