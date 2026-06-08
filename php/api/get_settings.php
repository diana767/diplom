<?php
require_once '../database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $db = new Database();
    $result = $db->query("SELECT salon_name, salon_phone, salon_address, working_hours FROM settings LIMIT 1");

    if ($result && $result->num_rows > 0) {
        $settings = $result->fetch_assoc();
        echo json_encode(['success' => true, 'data' => $settings], JSON_UNESCAPED_UNICODE);
        exit;
    }

  
    echo json_encode([
        'success' => true,
        'data' => [
            'salon_name' => 'Элегант',
            'salon_phone' => '+7 (999) 123-45-67',
            'salon_address' => 'г. Екатеринбург, ул. Ленина, 50',
            'working_hours' => 'Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-20:00'
        ]
    ], JSON_UNESCAPED_UNICODE);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
