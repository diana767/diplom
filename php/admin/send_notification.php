<?php
require_once '../config.php';
require_once '../database.php';

header('Content-Type: application/json; charset=utf-8');

// Проверяем авторизацию
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Не авторизован']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Метод не поддерживается']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $bookingId = $input['booking_id'] ?? null;
    $message = $input['message'] ?? '';
    $notificationType = $input['type'] ?? 'admin';
    
    if (!$bookingId || empty($message)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Заполните все обязательные поля']);
        exit;
    }
    
    $db = new Database();
    
    // Получаем информацию о записи
    $bookingSql = "SELECT b.*, s.name as service_name 
                   FROM bookings b
                   LEFT JOIN services s ON b.service_id = s.id
                   WHERE b.id = " . (int)$bookingId;
    
    $result = $db->query($bookingSql);
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Запись не найдена']);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Создаем уведомление
    $sql = "INSERT INTO notifications (booking_id, client_name, phone, message, type, created_at) 
            VALUES (" . (int)$bookingId . ",
                    '" . $db->escape($booking['client_name']) . "',
                    '" . $db->escape($booking['phone']) . "',
                    '" . $db->escape($message) . "',
                    '" . $db->escape($notificationType) . "',
                    NOW())";
    
    if ($db->query($sql)) {
        echo json_encode([
            'success' => true,
            'message' => 'Уведомление отправлено',
            'notification_id' => $db->getLastId()
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        throw new Exception('Ошибка при отправке уведомления');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>