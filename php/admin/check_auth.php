<?php
require_once '../config.php';

header('Content-Type: application/json; charset=utf-8');

if (isset($_SESSION['admin_logged_in']) && $_SESSION['admin_logged_in'] === true) {
    echo json_encode([
        'success' => true,
        'authenticated' => true,
        'admin' => [
            'id' => $_SESSION['admin_id'] ?? null,
            'username' => $_SESSION['admin_username'] ?? null,
            'full_name' => $_SESSION['admin_full_name'] ?? null
        ]
    ]);
} else {
    echo json_encode([
        'success' => false,
        'authenticated' => false,
        'error' => 'Не авторизован'
    ]);
}
?>