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
    
    // Получаем всех мастеров 
    $sql = "SELECT m.*, 
                   (SELECT COUNT(*) FROM bookings WHERE master_id = m.id AND status != 'cancelled' AND desired_date >= CURDATE()) as active_bookings
            FROM masters m
            ORDER BY m.is_active DESC, m.name";
    
    $result = $db->query($sql);
    
    $masters = [];
    while ($row = $result->fetch_assoc()) {
        // Парсим рабочие часы из JSON
        $row['working_hours'] = !empty($row['working_hours']) ? json_decode($row['working_hours'], true) : null;
        $masters[] = $row;
    }
    
    // Получаем специализации для фильтрации
    $specializationsSql = "SELECT DISTINCT specialization FROM masters ORDER BY specialization";
    $specializationsResult = $db->query($specializationsSql);
    
    $specializations = [];
    while ($row = $specializationsResult->fetch_assoc()) {
        $specializations[] = $row['specialization'];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $masters,
        'specializations' => $specializations,
        'count' => count($masters)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>