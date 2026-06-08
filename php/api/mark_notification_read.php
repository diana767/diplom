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
    $notificationId = $input['notification_id'] ?? $_POST['notification_id'] ?? null;
    
    if (!$notificationId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Не указан ID уведомления']);
        exit;
    }
    
    $db = new Database();
    
    $sql = "UPDATE notifications SET is_read = 1, read_at = NOW() 
            WHERE id = " . (int)$notificationId;
    
    if ($db->query($sql)) {
        echo json_encode([
            'success' => true,
            'message' => 'Уведомление отмечено как прочитанное'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        throw new Exception('Ошибка при обновлении уведомления');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>