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

try {
    $db = new Database();
    
    $sql = "SELECT * FROM settings LIMIT 1";
    $result = $db->query($sql);
    
    if ($result->num_rows > 0) {
        $settings = $result->fetch_assoc();
        
       
        if (!empty($settings['booking_rules'])) {
            $settings['booking_rules'] = json_decode($settings['booking_rules'], true);
        } else {
            $settings['booking_rules'] = [
                'min_advance_booking' => 2, // часа
                'max_advance_booking' => 90, // дней
                'cancellation_time' => 24, // часа
                'penalty_percent' => 50 
            ];
        }
        
        echo json_encode([
            'success' => true,
            'data' => $settings
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        // Возвращаем настройки по умолчанию
        echo json_encode([
            'success' => true,
            'data' => [
                'salon_name' => 'Элегант',
                'salon_phone' => '+7 (999) 123-45-67',
                'salon_address' => 'г. Екатеринбург, ул. Ленина, 50',
                'working_hours' => 'Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-20:00',
                'booking_rules' => [
                    'min_advance_booking' => 2,
                    'max_advance_booking' => 90,
                    'cancellation_time' => 24,
                    'penalty_percent' => 50
                ]
            ]
        ], JSON_UNESCAPED_UNICODE);
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>