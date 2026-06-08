<?php
require_once '../database.php';

$data = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $db = new Database();
    
    $required = ['client_name', 'phone', 'service_id', 'desired_date', 'desired_time'];
    foreach ($required as $field) {
        if (empty($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => 'Missing required field: ' . $field]);
            exit;
        }
    }
    
    $result = $db->saveBooking($data);
    
    if ($result) {
        $bookingId = $db->getLastId();
        echo json_encode([
            'success' => true,
            'booking_id' => $bookingId,
            'message' => 'Запись успешно создана'
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Ошибка при сохранении записи']);
    }
}
?>