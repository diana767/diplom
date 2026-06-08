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
    
    if (!$input) {
        $input = $_POST;
    }
    
    // Валидация обязательных полей
    $required = ['client_name', 'phone', 'service_id', 'desired_date', 'desired_time'];
    $missing = [];
    
    foreach ($required as $field) {
        if (empty($input[$field])) {
            $missing[] = $field;
        }
    }
    
    if (!empty($missing)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Не заполнены обязательные поля: ' . implode(', ', $missing)
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Валидация имени и телефона
    if (!preg_match('/^[А-Яа-яЁёA-Za-z\s-]{2,80}$/u', trim((string)$input['client_name']))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Некорректное имя клиента'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    $phone = preg_replace('/[^0-9]/', '', $input['phone']);
    if (strlen($phone) < 10 || strlen($phone) > 15) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Некорректный номер телефона'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$|^\d{2}\.\d{2}\.\d{4}$/', (string)$input['desired_date'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Некорректная дата записи'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    if (!preg_match('/^\d{2}:\d{2}$/', (string)$input['desired_time'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Некорректное время записи'], JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    // Проверка доступности времени 
    $db = new Database();

    // Нормализуем дату
    $desiredDate = $input['desired_date'];
    if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $desiredDate, $m)) {
        $desiredDate = $m[3] . '-' . $m[2] . '-' . $m[1];
    }
    if (strtotime($desiredDate) < strtotime(date('Y-m-d'))) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Нельзя записаться на прошедшую дату'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Длительность выбранной услуги 
    $service = $db->getService((int)$input['service_id']);
    $newDuration = (int)($service['duration_minutes'] ?? 60);

    // Проверяем пересечения по времени у выбранного мастера в этот день
    if (!empty($input['master_id'])) {
        $masterId = (int)$input['master_id'];
        $newStart = strtotime($input['desired_time']);
        $newEnd   = $newStart + ($newDuration * 60);

        $checkSql = "SELECT b.desired_time, COALESCE(s.duration_minutes, 60) AS duration_minutes
                     FROM bookings b
                     LEFT JOIN services s ON b.service_id = s.id
                     WHERE b.master_id = $masterId
                       AND b.desired_date = '" . $db->escape($desiredDate) . "'
                       AND b.status != 'cancelled'";

        $result = $db->query($checkSql);
        while ($row = $result->fetch_assoc()) {
            $existingStart = strtotime($row['desired_time']);
            $existingEnd   = $existingStart + (((int)$row['duration_minutes']) * 60);

            // Пересечение интервалов 
            if ($newStart < $existingEnd && $newEnd > $existingStart) {
                http_response_code(409);
                echo json_encode([
                    'success' => false,
                    'error' => 'Выбранное время занято. Пожалуйста, выберите другое время.'
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
    }
    
    // Сохраняем запись
    $bookingData = [
        'client_name' => $input['client_name'],
        'phone' => $input['phone'],
        'service_id' => (int)$input['service_id'],
        'master_id' => !empty($input['master_id']) ? (int)$input['master_id'] : null,
        'desired_date' => $desiredDate,
        'desired_time' => $input['desired_time'],
        'comment' => $input['comment'] ?? '',
        'package_info' => !empty($input['package_info']) ? json_encode($input['package_info']) : null
    ];
    
    $sql = "INSERT INTO bookings (client_name, phone, service_id, master_id, 
            desired_date, desired_time, comment, package_info, status, created_at) 
            VALUES ('" . $db->escape($bookingData['client_name']) . "', 
                    '" . $db->escape($bookingData['phone']) . "', 
                    " . $bookingData['service_id'] . ", 
                    " . ($bookingData['master_id'] ?: 'NULL') . ", 
                    '" . $db->escape($bookingData['desired_date']) . "', 
                    '" . $db->escape($bookingData['desired_time']) . "', 
                    '" . $db->escape($bookingData['comment']) . "', 
                    " . ($bookingData['package_info'] ? "'" . $db->escape($bookingData['package_info']) . "'" : 'NULL') . ", 
                    'new', 
                    NOW())";
    
    if ($db->query($sql)) {
        $bookingId = $db->getLastId();
        
        // Создаем уведомление
        $notificationSql = "INSERT INTO notifications (booking_id, client_name, phone, message, type) 
                           VALUES ($bookingId, 
                                   '" . $db->escape($bookingData['client_name']) . "', 
                                   '" . $db->escape($bookingData['phone']) . "', 
                                   'Создана новая запись на " . $bookingData['desired_date'] . " " . $bookingData['desired_time'] . "', 
                                   'admin')";
        $db->query($notificationSql);
        
        echo json_encode([
            'success' => true,
            'message' => 'Запись успешно создана',
            'booking_id' => $bookingId,
            'booking_number' => 'B' . str_pad($bookingId, 6, '0', STR_PAD_LEFT)
        ], JSON_UNESCAPED_UNICODE);
    } else {
        throw new Exception('Ошибка при сохранении в базу данных');
    }
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>