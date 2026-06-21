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
    
    $serviceId = $input['id'] ?? null;
    $name = $input['name'] ?? '';
    $category = $input['category'] ?? '';
    $price = $input['price'] ?? 0;
    $description = $input['description'] ?? '';
    $duration = $input['duration_minutes'] ?? 60;
    $isActive = $input['is_active'] ?? true;
    
    if (empty($name) || empty($category) || $price <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Заполните все обязательные поля']);
        exit;
    }
    
    $db = new Database();
    
    if ($serviceId) {
        $lockCheck = $db->query("SELECT COUNT(*) AS cnt FROM bookings WHERE service_id = ".(int)$serviceId." AND status IN ('confirmed','transfer_proposed')");
        $locked = $lockCheck ? (int)$lockCheck->fetch_assoc()['cnt'] : 0;
        if ($locked > 0) {
            http_response_code(409);
            echo json_encode(['success'=>false,'error'=>'Услугу нельзя редактировать: по ней есть подтверждённая запись'], JSON_UNESCAPED_UNICODE);
            exit;
        }
        // Обновление существующей услуги
        $sql = "UPDATE services SET 
                name = '" . $db->escape($name) . "',
                category = '" . $db->escape($category) . "',
                description = '" . $db->escape($description) . "',
                price = " . (float)$price . ",
                duration_minutes = " . (int)$duration . ",
                is_active = " . ($isActive ? 1 : 0) . ",
                updated_at = NOW()
                WHERE id = " . (int)$serviceId;
        
        $message = 'Услуга обновлена';
    } else {
        // Добавление новой услуги
        $sql = "INSERT INTO services (name, category, description, price, duration_minutes, is_active, created_at) 
                VALUES ('" . $db->escape($name) . "',
                        '" . $db->escape($category) . "',
                        '" . $db->escape($description) . "',
                        " . (float)$price . ",
                        " . (int)$duration . ",
                        " . ($isActive ? 1 : 0) . ",
                        NOW())";
        
        $message = 'Услуга добавлена';
    }
    
    if ($db->query($sql)) {
        $newId = $serviceId ?: $db->getLastId();
        
        echo json_encode([
            'success' => true,
            'message' => $message,
            'service_id' => $newId
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        throw new Exception('Ошибка при сохранении услуги');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>