<?php
require_once '../database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Метод не поддерживается']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    $bookingId = $input['booking_id'] ?? $_POST['booking_id'] ?? null;
    $phone = $input['phone'] ?? $_POST['phone'] ?? null;
    
    if (!$bookingId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Не указан ID записи']);
        exit;
    }
    
    $db = new Database();
    
    // Проверяем, существует ли запись и принадлежит ли она клиенту
    $checkSql = "SELECT b.*, s.name as service_name 
                 FROM bookings b
                 LEFT JOIN services s ON b.service_id = s.id
                 WHERE b.id = " . (int)$bookingId;
    
    if ($phone) {
        $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
        $checkSql .= " AND REPLACE(b.phone, '[^0-9]', '') LIKE '%$cleanPhone%'";
    }
    
    $result = $db->query($checkSql);
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Запись не найдена']);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Проверяем, можно ли отменить запись
    $bookingDate = strtotime($booking['desired_date'] . ' ' . $booking['desired_time']);
    $currentTime = time();
    $hoursDiff = ($bookingDate - $currentTime) / 3600;
    
    if ($hoursDiff < 24 && $booking['status'] === 'confirmed') {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Подтвержденную запись можно отменить не позднее чем за 24 часа'
        ]);
        exit;
    }
    
    if ($bookingDate < $currentTime) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Нельзя отменить прошедшую запись']);
        exit;
    }
    
    if ($booking['status'] === 'cancelled') {
        echo json_encode(['success' => false, 'error' => 'Запись уже отменена']);
        exit;
    }
    
    // Отменяем запись
    $updateSql = "UPDATE bookings SET status = 'cancelled', updated_at = NOW() 
                  WHERE id = " . (int)$bookingId;
    
    if ($db->query($updateSql)) {
        // Создаем уведомление об отмене
        $notificationSql = "INSERT INTO notifications (booking_id, client_name, phone, message, type) 
                           VALUES (" . (int)$bookingId . ", 
                                   '" . $db->escape($booking['client_name']) . "', 
                                   '" . $db->escape($booking['phone']) . "', 
                                   'Ваша запись на услугу \"" . $db->escape($booking['service_name']) . "\" отменена', 
                                   'cancellation')";
        $db->query($notificationSql);
        
        echo json_encode([
            'success' => true,
            'message' => 'Запись успешно отменена'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        throw new Exception('Ошибка при отмене записи');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}


?>

