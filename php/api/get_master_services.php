<?php
require_once '../database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $db = new Database();

  
    $check = $db->query("SHOW TABLES LIKE 'master_services'");
    if ($check->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'error' => 'Таблица master_services не найдена'
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $sql = "SELECT master_id, service_id FROM master_services";
    $res = $db->query($sql);

    $map = []; 
    while ($row = $res->fetch_assoc()) {
        $m = (string)$row['master_id'];
        $s = (string)$row['service_id'];
        if (!isset($map[$m])) $map[$m] = [];
        $map[$m][] = $s;
    }

    echo json_encode([
        'success' => true,
        'data' => $map
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
