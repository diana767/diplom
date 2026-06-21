<?php
require_once '../config.php';
require_once '../database.php';
require_once '../booking_helpers.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

if (empty($_SESSION['admin_logged_in'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Необходимо заново войти в админ-панель'], JSON_UNESCAPED_UNICODE);
    exit;
}

function scheduleLower($value) {
    return function_exists('mb_strtolower') ? mb_strtolower((string)$value, 'UTF-8') : strtolower((string)$value);
}
function scheduleContains($haystack, $needle) {
    return function_exists('mb_strpos')
        ? mb_strpos($haystack, $needle, 0, 'UTF-8') !== false
        : strpos($haystack, $needle) !== false;
}
function scheduleServiceMatchesMaster($service, $specialization) {
    $serviceText = scheduleLower(($service['category'] ?? '') . ' ' . ($service['name'] ?? ''));
    $masterText = scheduleLower($specialization ?? '');
    $groups = [
        [['ресниц', 'lash', 'лэш'], ['ресниц', 'lash', 'лэш']],
        [['бров', 'визаж', 'макияж'], ['бров', 'визаж', 'макияж']],
        [['маник', 'ногт', 'педик'], ['маник', 'ногт', 'педик']],
        [['стриж', 'волос', 'окраш', 'парикмах'], ['стилист', 'колорист', 'парикмах', 'волос']],
        [['космет', 'массаж', 'чистк'], ['космет', 'массаж']],
    ];
    foreach ($groups as $group) {
        $serviceHit = false;
        foreach ($group[0] as $word) {
            if (scheduleContains($serviceText, $word)) { $serviceHit = true; break; }
        }
        if (!$serviceHit) continue;
        foreach ($group[1] as $word) {
            if (scheduleContains($masterText, $word)) return true;
        }
        return false;
    }
    return false;
}
function scheduleBuildSlots($workingHours, $date, $duration, $occupied) {
    $day = normalizeWorkingHoursConfig($workingHours, $date);
    if (!empty($day['closed'])) return [];

    $duration = max(15, (int)$duration);
    // Те же интервалы, что и в форме записи: следующий старт через длительность услуги.
    $step = $duration;
    $slots = [];
    for ($start = (int)$day['start_minutes']; $start + $duration <= (int)$day['end_minutes']; $start += $step) {
        $end = $start + $duration;
        $blocked = false;
        foreach ($day['breaks'] as $break) {
            if ($start < (int)$break['end'] && $end > (int)$break['start']) { $blocked = true; break; }
        }
        if ($blocked) continue;
        foreach ($occupied as $busy) {
            if ($start < (int)$busy['end'] && $end > (int)$busy['start']) { $blocked = true; break; }
        }
        if (!$blocked) {
            $slots[] = ['start' => minutesToTimeValue($start), 'end' => minutesToTimeValue($end)];
        }
    }
    return $slots;
}

try {
    $date = normalizeBookingDateValue($_GET['date'] ?? date('Y-m-d'));
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        throw new Exception('Некорректная дата');
    }

    $db = new Database();

    $mastersResult = $db->query("SELECT id, name, specialization, photo, working_hours
                                 FROM masters WHERE is_active = 1 ORDER BY name");
    $masters = [];
    while ($row = $mastersResult->fetch_assoc()) {
        $id = (int)$row['id'];
        $masters[$id] = [
            'id' => $id,
            'name' => $row['name'],
            'specialization' => $row['specialization'],
            'photo' => $row['photo'] ?: '',
            'working_hours' => $row['working_hours'],
            'services' => [],
            'busy_slots' => []
        ];
    }

    $servicesResult = $db->query("SELECT id, name, category, duration_minutes
                                  FROM services WHERE is_active = 1 ORDER BY category, name");
    $services = [];
    while ($row = $servicesResult->fetch_assoc()) {
        $row['id'] = (int)$row['id'];
        $row['duration_minutes'] = max(15, (int)($row['duration_minutes'] ?? 60));
        $services[$row['id']] = $row;
    }

    $relations = [];
    $tableCheck = $db->query("SHOW TABLES LIKE 'master_services'");
    if ($tableCheck && $tableCheck->num_rows > 0) {
        $relResult = $db->query("SELECT master_id, service_id FROM master_services");
        while ($rel = $relResult->fetch_assoc()) {
            $mid = (int)$rel['master_id'];
            $sid = (int)$rel['service_id'];
            if (isset($masters[$mid], $services[$sid])) $relations[$mid][] = $sid;
        }
    }

    $escapedDate = $db->escape($date);
    $occupied = [];
    $busyResult = $db->query("SELECT b.id, b.master_id, b.desired_time, b.client_name, b.status,
                                     COALESCE(s.name, 'Услуга') AS service_name,
                                     COALESCE(s.duration_minutes, 60) AS duration_minutes
                              FROM bookings b
                              LEFT JOIN services s ON s.id = b.service_id
                              WHERE b.desired_date = '$escapedDate'
                                AND b.master_id IS NOT NULL
                                AND b.status NOT IN ('cancelled','Отменена','Отклонена')
                              ORDER BY b.master_id, b.desired_time");
    while ($booking = $busyResult->fetch_assoc()) {
        $mid = (int)$booking['master_id'];
        if (!isset($masters[$mid])) continue;
        $start = timeToMinutesValue($booking['desired_time']);
        if ($start === null) continue;
        $duration = max(15, (int)$booking['duration_minutes']);
        $occupied[$mid][] = ['start' => $start, 'end' => $start + $duration];
        $masters[$mid]['busy_slots'][] = [
            'start_time' => minutesToTimeValue($start),
            'end_time' => minutesToTimeValue($start + $duration),
            'service_name' => $booking['service_name'],
            'client_name' => $booking['client_name'],
            'status' => $booking['status']
        ];
    }

    foreach ($masters as $mid => &$master) {
        $serviceIds = $relations[$mid] ?? [];
        if (!$serviceIds) {
            foreach ($services as $sid => $service) {
                if (scheduleServiceMatchesMaster($service, $master['specialization'])) $serviceIds[] = $sid;
            }
        }
        foreach ($serviceIds as $sid) {
            if (!isset($services[$sid])) continue;
            $service = $services[$sid];
            $master['services'][] = [
                'id' => $service['id'],
                'name' => $service['name'],
                'category' => $service['category'],
                'duration_minutes' => $service['duration_minutes'],
                'slots' => scheduleBuildSlots(
                    $master['working_hours'],
                    $date,
                    $service['duration_minutes'],
                    $occupied[$mid] ?? []
                )
            ];
        }
        unset($master['working_hours']);
    }
    unset($master);

    echo json_encode(['success' => true, 'date' => $date, 'data' => array_values($masters)], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => 'Не удалось получить расписание: ' . $e->getMessage(), 'data' => []], JSON_UNESCAPED_UNICODE);
}
