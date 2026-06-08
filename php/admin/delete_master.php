<?php
require_once '../config.php';
require_once '../database.php';
require_once '../schema_additions.php';

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
    $masterId = $input['master_id'] ?? null;
    
    if (!$masterId) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Не указан ID мастера']);
        exit;
    }
    
    $db = new Database();
    ensureProjectAdditions($db);
    
    // Проверяем, есть ли активные записи у мастера
    $checkSql = "SELECT COUNT(*) as count FROM bookings 
                 WHERE master_id = " . (int)$masterId . "
                 AND status != 'cancelled'
                 AND desired_date >= CURDATE()";
    
    $result = $db->query($checkSql);
    $row = $result->fetch_assoc();
    
    if ($row['count'] > 0) {
        // Вместо удаления делаем мастера неактивным
        $updateSql = "UPDATE masters SET is_active = 0 WHERE id = " . (int)$masterId;
        
        if ($db->query($updateSql)) {
            echo json_encode([
                'success' => true,
                'message' => 'Мастер деактивирован. У него есть будущие записи — откройте раздел мастеров и нажмите кнопку решения записей.',
                'needs_transfer' => true,
                'affected_bookings' => (int)$row['count']
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception('Ошибка при деактивации мастера');
        }
        
    } else {
        // Удаляем мастера
        $sql = "DELETE FROM masters WHERE id = " . (int)$masterId;
        
        if ($db->query($sql)) {
            echo json_encode([
                'success' => true,
                'message' => 'Мастер удален'
            ], JSON_UNESCAPED_UNICODE);
        } else {
            throw new Exception('Ошибка при удалении мастера');
        }
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>