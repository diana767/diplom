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
    
    // Получаем все услуги 
    $sql = "SELECT s.*, EXISTS(SELECT 1 FROM bookings b WHERE b.service_id=s.id AND b.status IN ('confirmed','transfer_proposed')) AS is_locked FROM services s ORDER BY s.category, s.name";
    $result = $db->query($sql);
    
    $services = [];
    while ($row = $result->fetch_assoc()) {
        $services[] = $row;
    }
    
    // Получаем категории для фильтрации
    $categoriesSql = "SELECT DISTINCT category FROM services ORDER BY category";
    $categoriesResult = $db->query($categoriesSql);
    
    $categories = [];
    while ($row = $categoriesResult->fetch_assoc()) {
        $categories[] = $row['category'];
    }
    
    echo json_encode([
        'success' => true,
        'data' => $services,
        'categories' => $categories,
        'count' => count($services)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>