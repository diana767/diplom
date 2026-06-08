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
    $status = $input['status'] ?? null;
    
    if (!$bookingId || !$status) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Не указаны обязательные параметры']);
        exit;
    }
    
    $allowedStatuses = ['new', 'confirmed', 'cancelled'];
    if (!in_array($status, $allowedStatuses)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Некорректный статус']);
        exit;
    }
    
    $db = new Database();
    
    // Проверяем существование записи
    $checkSql = "SELECT b.*, s.name as service_name 
                 FROM bookings b
                 LEFT JOIN services s ON b.service_id = s.id
                 WHERE b.id = " . (int)$bookingId;
    
    $result = $db->query($checkSql);
    
    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Запись не найдена']);
        exit;
    }
    
    $booking = $result->fetch_assoc();
    
    // Обновляем статус
    $updateSql = "UPDATE bookings SET status = '" . $db->escape($status) . "', 
                  updated_at = NOW() 
                  WHERE id = " . (int)$bookingId;
    
    if ($db->query($updateSql)) {
        // Создаем уведомление для клиента
        $message = '';
        
        switch ($status) {
            case 'confirmed':
                $message = "Ваша запись на услугу \"{$booking['service_name']}\" на " . 
                          date('d.m.Y', strtotime($booking['desired_date'])) . " в " . 
                          $booking['desired_time'] . " подтверждена. Ждем вас в салоне!";
                break;
                
            case 'cancelled':
                $message = "Ваша запись на услугу \"{$booking['service_name']}\" на " . 
                          date('d.m.Y', strtotime($booking['desired_date'])) . " в " . 
                          $booking['desired_time'] . " отменена. Для уточнения деталей свяжитесь с администратором.";
                break;
        }
        
        if (!empty($message)) {
            $notificationSql = "INSERT INTO notifications (booking_id, client_name, phone, message, type) 
                               VALUES (" . (int)$bookingId . ", 
                                       '" . $db->escape($booking['client_name']) . "', 
                                       '" . $db->escape($booking['phone']) . "', 
                                       '" . $db->escape($message) . "', 
                                       'admin')";
            $db->query($notificationSql);
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Статус записи обновлен',
            'booking_id' => $bookingId,
            'new_status' => $status
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        throw new Exception('Ошибка при обновлении статуса');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>