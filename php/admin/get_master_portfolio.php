<?php
require_once '../config.php';
require_once '../database.php';
require_once '../schema_additions.php';

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Не авторизован'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $masterId = isset($_GET['master_id']) ? (int)$_GET['master_id'] : 0;
    if ($masterId <= 0) {
        throw new Exception('Некорректный ID мастера');
    }

    $db = new Database();
    ensureProjectAdditions($db);

    $masterRes = $db->query("SELECT id, name, specialization FROM masters WHERE id = $masterId LIMIT 1");
    $master = $masterRes->fetch_assoc();
    if (!$master) {
        throw new Exception('Мастер не найден');
    }

    $res = $db->query("SELECT id, master_id, image, title, description, DATE_FORMAT(created_at, '%d.%m.%Y %H:%i') AS created_at_formatted
                       FROM master_portfolio
                       WHERE master_id = $masterId
                       ORDER BY created_at DESC, id DESC");
    $items = [];
    while ($row = $res->fetch_assoc()) {
        $items[] = $row;
    }

    echo json_encode(['success' => true, 'master' => $master, 'data' => $items], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
