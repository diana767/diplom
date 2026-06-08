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
    
    $salonName = $input['salon_name'] ?? '';
    $salonPhone = $input['salon_phone'] ?? '';
    $salonAddress = $input['salon_address'] ?? '';
    $workingHours = $input['working_hours'] ?? '';
    $bookingRules = $input['booking_rules'] ?? null;
    
    if (empty($salonName) || empty($salonPhone)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Заполните обязательные поля']);
        exit;
    }
    
    $db = new Database();
    
    // Проверяем, существуют ли уже настройки
    $checkSql = "SELECT COUNT(*) as count FROM settings";
    $result = $db->query($checkSql);
    $row = $result->fetch_assoc();
    

    $bookingRulesJson = null;
    if ($bookingRules) {
        $bookingRulesJson = json_encode($bookingRules, JSON_UNESCAPED_UNICODE);
    }
    
    if ($row['count'] > 0) {
        // Обновляем существующие настройки
        $sql = "UPDATE settings SET 
                salon_name = '" . $db->escape($salonName) . "',
                salon_phone = '" . $db->escape($salonPhone) . "',
                salon_address = '" . $db->escape($salonAddress) . "',
                working_hours = '" . $db->escape($workingHours) . "',
                booking_rules = " . ($bookingRulesJson ? "'" . $db->escape($bookingRulesJson) . "'" : 'NULL') . ",
                updated_at = NOW()";
        
        $message = 'Настройки обновлены';
    } else {
        // Вставляем новые настройки
        $sql = "INSERT INTO settings (salon_name, salon_phone, salon_address, working_hours, booking_rules, created_at) 
                VALUES ('" . $db->escape($salonName) . "',
                        '" . $db->escape($salonPhone) . "',
                        '" . $db->escape($salonAddress) . "',
                        '" . $db->escape($workingHours) . "',
                        " . ($bookingRulesJson ? "'" . $db->escape($bookingRulesJson) . "'" : 'NULL') . ",
                        NOW())";
        
        $message = 'Настройки сохранены';
    }
    
    if ($db->query($sql)) {
        echo json_encode([
            'success' => true,
            'message' => $message
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        throw new Exception('Ошибка при сохранении настроек');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>