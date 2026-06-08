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
    
    $masterId = $input['id'] ?? null;
    $name = $input['name'] ?? '';
    $specialization = $input['specialization'] ?? '';
    $experience = $input['experience_years'] ?? 0;
    $bio = $input['bio'] ?? '';
    $photo = $input['photo'] ?? null;
    $isActive = $input['is_active'] ?? true;
    $workingHours = $input['working_hours'] ?? null;
    
    if (empty($name) || empty($specialization)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Заполните все обязательные поля']);
        exit;
    }
    
    $db = new Database();
    
    // Подготавливаем рабочие часы
    $workingHoursJson = null;
    if ($workingHours) {
        $workingHoursJson = json_encode($workingHours, JSON_UNESCAPED_UNICODE);
    }
    
    if ($masterId) {
        // Обновление существующего мастера
        $sql = "UPDATE masters SET 
                name = '" . $db->escape($name) . "',
                specialization = '" . $db->escape($specialization) . "',
                experience_years = " . (int)$experience . ",
                bio = '" . $db->escape($bio) . "',
                photo = " . ($photo ? "'" . $db->escape($photo) . "'" : 'NULL') . ",
                is_active = " . ($isActive ? 1 : 0) . ",
                working_hours = " . ($workingHoursJson ? "'" . $db->escape($workingHoursJson) . "'" : 'NULL') . ",
                updated_at = NOW()
                WHERE id = " . (int)$masterId;
        
        $message = 'Мастер обновлен';
    } else {
        // Добавление нового мастера
        $defaultWorkingHours = json_encode([
            '0' => ['start' => 10, 'end' => 20], // Воскресенье
            '1' => ['start' => 9, 'end' => 21],  // Понедельник
            '2' => ['start' => 9, 'end' => 21],
            '3' => ['start' => 9, 'end' => 21],
            '4' => ['start' => 9, 'end' => 21],
            '5' => ['start' => 9, 'end' => 21],
            '6' => ['start' => 10, 'end' => 20]  // Суббота
        ], JSON_UNESCAPED_UNICODE);
        
        $sql = "INSERT INTO masters (name, specialization, experience_years, bio, photo, is_active, working_hours, created_at) 
                VALUES ('" . $db->escape($name) . "',
                        '" . $db->escape($specialization) . "',
                        " . (int)$experience . ",
                        '" . $db->escape($bio) . "',
                        " . ($photo ? "'" . $db->escape($photo) . "'" : 'NULL') . ",
                        " . ($isActive ? 1 : 0) . ",
                        '" . $db->escape($workingHoursJson ?: $defaultWorkingHours) . "',
                        NOW())";
        
        $message = 'Мастер добавлен';
    }
    
    if ($db->query($sql)) {
        $newId = $masterId ?: $db->getLastId();
        
        echo json_encode([
            'success' => true,
            'message' => $message,
            'master_id' => $newId
        ], JSON_UNESCAPED_UNICODE);
        
    } else {
        throw new Exception('Ошибка при сохранении мастера');
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>