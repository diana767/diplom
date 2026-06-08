<?php
require_once '../database.php';
require_once '../schema_additions.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $db = new Database();
    ensureProjectAdditions($db);
    $masterId = (int)($_GET['master_id'] ?? 0);
    if ($masterId <= 0) throw new Exception('Не указан мастер');

    $res = $db->query("SELECT id, master_id, image, title, description FROM master_portfolio WHERE master_id = $masterId ORDER BY id ASC");
    $items = [];
    while ($row = $res->fetch_assoc()) $items[] = $row;

    echo json_encode(['success' => true, 'data' => $items], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'data' => []], JSON_UNESCAPED_UNICODE);
}
?>
