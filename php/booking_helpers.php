<?php
/**
 * Общие функции для проверки доступных слотов записи и переноса.
 * Подключается из публичных и админских API.
 */

function normalizeBookingDateValue($date) {
    $date = trim((string)$date);
    if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $date, $m)) {
        return $m[3] . '-' . $m[2] . '-' . $m[1];
    }
    return $date;
}

function timeToMinutesValue($time) {
    $time = trim((string)$time);
    if (!preg_match('/^(\d{1,2}):(\d{2})/', $time, $m)) return null;
    $h = (int)$m[1];
    $min = (int)$m[2];
    if ($h < 0 || $h > 23 || $min < 0 || $min > 59) return null;
    return $h * 60 + $min;
}

function minutesToTimeValue($minutes) {
    $minutes = (int)$minutes;
    return sprintf('%02d:%02d', floor($minutes / 60), $minutes % 60);
}

function parseHourMinuteValue($value, $fallback = null) {
    if ($value === null || $value === '') return $fallback;
    if (is_numeric($value)) return (int)round(((float)$value) * 60);
    $value = trim((string)$value);
    if (preg_match('/^(\d{1,2}):(\d{2})$/', $value, $m)) {
        return ((int)$m[1]) * 60 + (int)$m[2];
    }
    if (preg_match('/^(\d{1,2})(?:\.(\d+))?$/', $value, $m)) {
        return (int)round(((float)$value) * 60);
    }
    return $fallback;
}

function normalizeWorkingHoursConfig($workingHours, $date) {
    if (is_string($workingHours) && $workingHours !== '') {
        $decoded = json_decode($workingHours, true);
        if (is_array($decoded)) $workingHours = $decoded;
    }
    if (!is_array($workingHours)) {
        $workingHours = ['start' => 9, 'end' => 21, 'break_start' => null, 'break_end' => null];
    }

    $dayNum = (int)date('w', strtotime($date)); // 0 = воскресенье
    $dayKeys = [0 => 'sun', 1 => 'mon', 2 => 'tue', 3 => 'wed', 4 => 'thu', 5 => 'fri', 6 => 'sat'];
    $dayKey = $dayKeys[$dayNum];

    $raw = $workingHours[$dayKey] ?? $workingHours[(string)$dayNum] ?? $workingHours[$dayNum] ?? $workingHours['default'] ?? $workingHours;

    if ($raw === null || $raw === false || $raw === '' || (is_array($raw) && count($raw) === 0)) {
        return ['closed' => true, 'start' => 9, 'end' => 21, 'start_minutes' => 540, 'end_minutes' => 1260, 'breaks' => []];
    }

    // Формат из демо SQL: "09:00-21:00".
    if (is_string($raw) && preg_match('/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/', $raw, $m)) {
        $start = timeToMinutesValue($m[1]);
        $end = timeToMinutesValue($m[2]);
        return ['closed' => false, 'start' => $start / 60, 'end' => $end / 60, 'start_minutes' => $start, 'end_minutes' => $end, 'breaks' => []];
    }

    // Формат из install.php: ['10:00-19:00'].
    if (is_array($raw) && isset($raw[0]) && is_string($raw[0]) && preg_match('/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/', $raw[0], $m)) {
        $start = timeToMinutesValue($m[1]);
        $end = timeToMinutesValue($m[2]);
        return ['closed' => false, 'start' => $start / 60, 'end' => $end / 60, 'start_minutes' => $start, 'end_minutes' => $end, 'breaks' => []];
    }

    // Формат: ['start'=>9,'end'=>21,'break_start'=>13,'break_end'=>14].
    if (is_array($raw)) {
        $start = parseHourMinuteValue($raw['start'] ?? ($raw['from'] ?? null), 9 * 60);
        $end = parseHourMinuteValue($raw['end'] ?? ($raw['to'] ?? null), 21 * 60);
        $breaks = [];
        $bs = parseHourMinuteValue($raw['break_start'] ?? null, null);
        $be = parseHourMinuteValue($raw['break_end'] ?? null, null);
        if ($bs !== null && $be !== null && $be > $bs) {
            $breaks[] = ['start' => $bs, 'end' => $be];
        }
        if (!empty($raw['breaks']) && is_array($raw['breaks'])) {
            foreach ($raw['breaks'] as $br) {
                if (is_array($br)) {
                    $b1 = parseHourMinuteValue($br['start'] ?? null, null);
                    $b2 = parseHourMinuteValue($br['end'] ?? null, null);
                    if ($b1 !== null && $b2 !== null && $b2 > $b1) $breaks[] = ['start' => $b1, 'end' => $b2];
                } elseif (is_string($br) && preg_match('/^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/', $br, $m)) {
                    $b1 = timeToMinutesValue($m[1]);
                    $b2 = timeToMinutesValue($m[2]);
                    if ($b2 > $b1) $breaks[] = ['start' => $b1, 'end' => $b2];
                }
            }
        }
        return ['closed' => false, 'start' => $start / 60, 'end' => $end / 60, 'start_minutes' => $start, 'end_minutes' => $end, 'breaks' => $breaks];
    }

    return ['closed' => false, 'start' => 9, 'end' => 21, 'start_minutes' => 540, 'end_minutes' => 1260, 'breaks' => []];
}

function getServiceDurationMinutes($db, $serviceId) {
    $serviceId = (int)$serviceId;
    if ($serviceId <= 0) return 60;
    $res = $db->query("SELECT duration_minutes FROM services WHERE id = $serviceId LIMIT 1");
    if ($res && $res->num_rows > 0) {
        $row = $res->fetch_assoc();
        return max(15, (int)($row['duration_minutes'] ?? 60));
    }
    return 60;
}

function getBookingAvailableSlots($db, $masterId, $date, $serviceId = null, $excludeBookingId = 0, $clientPhone = '') {
    $date = normalizeBookingDateValue($date);
    $masterId = (int)$masterId;
    $duration = getServiceDurationMinutes($db, (int)$serviceId);

    $workingHours = ['start' => 9, 'end' => 21, 'break_start' => 13, 'break_end' => 14];
    $master = null;
    if ($masterId > 0) {
        $master = $db->getMaster($masterId);
        if (!$master || (string)($master['is_active'] ?? '0') === '0') {
            throw new Exception('Мастер не найден или не активен');
        }
        $workingHours = $master['working_hours'] ?? $workingHours;
    }

    $dayConfig = normalizeWorkingHoursConfig($workingHours, $date);
    if (!empty($dayConfig['closed'])) {
        return ['slots' => [], 'working_hours' => $dayConfig, 'duration' => $duration];
    }

    $occupiedSlots = [];
    $sql = "SELECT b.id, b.desired_time, COALESCE(s.duration_minutes, 60) AS duration_minutes
            FROM bookings b
            LEFT JOIN services s ON b.service_id = s.id
            WHERE b.desired_date = '" . $db->escape($date) . "'
              AND b.status NOT IN ('cancelled','Отменена','Отклонена')";
    if ($masterId > 0) $sql .= " AND b.master_id = $masterId";
    if ((int)$excludeBookingId > 0) $sql .= " AND b.id <> " . (int)$excludeBookingId;

    $result = $db->query($sql);
    while ($row = $result->fetch_assoc()) {
        $start = timeToMinutesValue($row['desired_time']);
        if ($start === null) continue;
        $occupiedSlots[] = ['start' => $start, 'end' => $start + (int)$row['duration_minutes'], 'id' => (int)$row['id']];
    }

    // Дополнительно исключаем интервалы, на которые уже записан сам клиент,
    // даже если выбраны другой мастер или другая услуга.
    $cleanPhone = preg_replace('/[^0-9]/', '', (string)$clientPhone);
    if ($cleanPhone !== '') {
        $phoneEsc = $db->escape($cleanPhone);
        $phoneExpr = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(b.phone,'+',''),'(',''),')',''),'-',''),' ','')";
        $clientSql = "SELECT b.id, b.desired_time, COALESCE(s.duration_minutes, 60) AS duration_minutes
                      FROM bookings b
                      LEFT JOIN services s ON b.service_id = s.id
                      WHERE b.desired_date = '" . $db->escape($date) . "'
                        AND b.status NOT IN ('cancelled','Отменена','Отклонена')
                        AND (RIGHT($phoneExpr, 10) = RIGHT('$phoneEsc', 10))";
        if ((int)$excludeBookingId > 0) $clientSql .= " AND b.id <> " . (int)$excludeBookingId;
        $clientResult = $db->query($clientSql);
        if ($clientResult) while ($row = $clientResult->fetch_assoc()) {
            $start = timeToMinutesValue($row['desired_time']);
            if ($start === null) continue;
            $occupiedSlots[] = ['start' => $start, 'end' => $start + (int)$row['duration_minutes'], 'id' => (int)$row['id']];
        }
    }

    $available = [];
    // Начала записей идут блоками по длительности выбранной услуги.
    // Например, для услуги 120 минут: 09:00, 11:00, 13:00, а не каждые 30 минут.
    $step = max(15, $duration);
    for ($start = (int)$dayConfig['start_minutes']; $start + $duration <= (int)$dayConfig['end_minutes']; $start += $step) {
        $end = $start + $duration;
        $blocked = false;
        foreach ($dayConfig['breaks'] as $break) {
            if ($start < $break['end'] && $end > $break['start']) { $blocked = true; break; }
        }
        if ($blocked) continue;
        foreach ($occupiedSlots as $slot) {
            if ($start < $slot['end'] && $end > $slot['start']) { $blocked = true; break; }
        }
        if (!$blocked) $available[] = minutesToTimeValue($start);
    }

    return ['slots' => $available, 'working_hours' => $dayConfig, 'duration' => $duration];
}

function masterCanServeBookingService($db, $masterId, $serviceId) {
    $masterId = (int)$masterId;
    $serviceId = (int)$serviceId;
    if ($masterId <= 0 || $serviceId <= 0) return false;

    $relation = $db->query("SELECT 1 FROM master_services WHERE master_id = $masterId AND service_id = $serviceId LIMIT 1");
    if ($relation && $relation->num_rows > 0) return true;

    // Фолбэк для старой базы без заполненной master_services: сверяем категорию услуги и специализацию мастера.
    $res = $db->query("SELECT s.category, s.name AS service_name, m.specialization
                       FROM services s CROSS JOIN masters m
                       WHERE s.id = $serviceId AND m.id = $masterId LIMIT 1");
    if (!$res || $res->num_rows === 0) return false;
    $row = $res->fetch_assoc();
    $lower = function($v) { return function_exists('mb_strtolower') ? mb_strtolower((string)$v, 'UTF-8') : strtolower((string)$v); };
    $contains = function($haystack, $needle) {
        if (function_exists('mb_strpos')) return mb_strpos($haystack, $needle, 0, 'UTF-8') !== false;
        return strpos($haystack, $needle) !== false;
    };
    $text = $lower(($row['category'] ?? '') . ' ' . ($row['service_name'] ?? ''));
    $spec = $lower($row['specialization'] ?? '');

    $groups = [
        ['service' => ['парикмах', 'стриж', 'окраш', 'волос'], 'master' => ['парикмах', 'стилист', 'колорист', 'волос']],
        ['service' => ['маник', 'ногт', 'педик'], 'master' => ['маник', 'ногт', 'педик']],
        ['service' => ['ресниц', 'lash', 'лэш'], 'master' => ['ресниц', 'лэш']],
        ['service' => ['бров', 'визаж', 'макияж'], 'master' => ['бров', 'визаж', 'макияж']],
        ['service' => ['космет', 'массаж', 'чистка'], 'master' => ['космет', 'массаж']]
    ];
    foreach ($groups as $g) {
        $serviceHit = false;
        foreach ($g['service'] as $needle) { if ($contains($text, $needle)) { $serviceHit = true; break; } }
        if (!$serviceHit) continue;
        foreach ($g['master'] as $needle) { if ($contains($spec, $needle)) return true; }
        return false;
    }
    return true;
}

function getTransferCandidateMasters($db, $serviceId, $excludeMasterId = 0) {
    $serviceId = (int)$serviceId;
    $excludeMasterId = (int)$excludeMasterId;

    $sql = "SELECT DISTINCT m.id, m.name, m.specialization, m.photo, m.is_active
            FROM masters m
            INNER JOIN master_services ms ON ms.master_id = m.id AND ms.service_id = $serviceId
            WHERE m.is_active = 1";
    if ($excludeMasterId > 0) $sql .= " AND m.id <> $excludeMasterId";
    $sql .= " ORDER BY m.name";

    $res = $db->query($sql);
    $masters = [];
    if ($res) while ($row = $res->fetch_assoc()) $masters[] = $row;

    if (count($masters) === 0) {
        $res = $db->query("SELECT id, name, specialization, photo, is_active FROM masters WHERE is_active = 1" . ($excludeMasterId > 0 ? " AND id <> $excludeMasterId" : "") . " ORDER BY name");
        if ($res) {
            while ($row = $res->fetch_assoc()) {
                if (masterCanServeBookingService($db, (int)$row['id'], $serviceId)) $masters[] = $row;
            }
        }
    }
    return $masters;
}
?>
