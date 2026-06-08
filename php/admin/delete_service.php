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
    $serviceId = $input['service_id'] ?? null;
    
    if (!$serviceId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Не указан ID услуги']);
        exit;
    }
    
    $db = new Database();
    
    // Проверяем, есть ли активные записи на эту услугу
    $checkSql = "SELECT COUNT(*) as count FROM bookings 
                 WHERE service_id = " . (int)$serviceId . "
                 AND status != 'cancelled'
                 AND desired_date >= CURDATE()";
    
    $result = $db->query($checkSql);
    $row = $result->fetch_assoc();
    
    if ($row['count'] > 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false, 
            'error' => 'Невозможно удалить услугу: есть активные записи'
        ]);
        exit;
    }
    
    // Удаляем услугу
    $sql = "DELETE FROM services WHERE id = " . (int)$serviceId;
    
    if ($db->query($sql)) {
        echo json_encode([
            'success' => true,
            'message' => 'Услуга удалена'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        throw new Exception('Ошибка при удалении услуги');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>