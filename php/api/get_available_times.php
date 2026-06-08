<?php
require_once '../database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $masterId = $_GET['master_id'] ?? null;
    $date = $_GET['date'] ?? null;
    $serviceId = $_GET['service_id'] ?? null;
    
    if (!$date) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Не указана дата']);
        exit;
    }

    // Принимаем дату как YYYY-MM-DD 
    if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $date, $m)) {
        $date = $m[3] . '-' . $m[2] . '-' . $m[1];
    }
    
    $db = new Database();
    
    // Получаем информацию об услуге
    $service = null;
    if ($serviceId) {
        $service = $db->getService($serviceId);
        if (!$service) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Услуга не найдена']);
            exit;
        }
        $duration = $service['duration_minutes'] ?? 60;
    } else {
        $duration = 60;
    }
    
    // Получаем рабочее время мастера
    if ($masterId) {
        $master = $db->getMaster($masterId);
        if (!$master || !$master['is_active']) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Мастер не найден или не активен']);
            exit;
        }
        
    
        if (!empty($master['working_hours'])) {
            $workingHours = is_string($master['working_hours'])
                ? json_decode($master['working_hours'], true)
                : $master['working_hours'];
        } else {
            $workingHours = null;
        }
    } else {
        // Если мастер не выбран, используем общее рабочее время
        $workingHours = [
            'start' => 9,
            'end' => 21,
            'break_start' => 13,
            'break_end' => 14
        ];
    }
    
    // Определяем день недели
    $dayOfWeek = date('w', strtotime($date));
    
    // Настройки рабочего времени для дня
    $dayConfig = $workingHours[$dayOfWeek] ?? $workingHours['default'] ?? [
        'start' => 9,
        'end' => 21,
        'break_start' => null,
        'break_end' => null
    ];
    
    // Получаем занятые слоты
    $occupiedSlots = [];
    $sql = "SELECT desired_time, duration_minutes 
            FROM bookings b
            LEFT JOIN services s ON b.service_id = s.id
            WHERE b.desired_date = '" . $db->escape($date) . "'
            AND b.status != 'cancelled'";
    
    if ($masterId) {
        $sql .= " AND b.master_id = " . (int)$masterId;
    }
    
    $result = $db->query($sql);
    while ($row = $result->fetch_assoc()) {
        $occupiedSlots[] = [
            'time' => $row['desired_time'],
            'duration' => $row['duration_minutes'] ?? 60
        ];
    }
    
    // Генерируем доступные временные слоты
    $availableSlots = [];
    $startHour = $dayConfig['start'] ?? 9;
    $endHour = $dayConfig['end'] ?? 21;
    
    for ($hour = $startHour; $hour < $endHour; $hour++) {
        for ($minute = 0; $minute < 60; $minute += 30) {
            // Пропускаем время обеда
            if (isset($dayConfig['break_start']) && isset($dayConfig['break_end'])) {
                $slotTime = $hour + ($minute / 60);
                if ($slotTime >= $dayConfig['break_start'] && $slotTime < $dayConfig['break_end']) {
                    continue;
                }
            }
            
            $time = sprintf('%02d:%02d', $hour, $minute);
            
            // Проверяем, не занят ли слот
            $isOccupied = false;
            foreach ($occupiedSlots as $slot) {
                $slotStart = strtotime($slot['time']);
                $slotEnd = $slotStart + ($slot['duration'] * 60);
                $currentStart = strtotime($time);
                $currentEnd = $currentStart + ($duration * 60);
                
                if ($currentStart < $slotEnd && $currentEnd > $slotStart) {
                    $isOccupied = true;
                    break;
                }
            }
            
            if (!$isOccupied) {
                $availableSlots[] = $time;
            }
        }
    }
    
    echo json_encode([
        'success' => true,
        'date' => $date,
        'master_id' => $masterId,
        'working_hours' => $dayConfig,
        'available_slots' => $availableSlots,
        'count' => count($availableSlots)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>