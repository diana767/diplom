<?php
require_once '../config.php';
require_once '../database.php';
require_once '../booking_helpers.php';

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Не авторизован'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $date = normalizeBookingDateValue($_GET['date'] ?? '');
    if ($date === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        throw new Exception('Некорректная дата');
    }

    $db = new Database();
    $masters = [];
    $mastersResult = $db->query("SELECT id, name, specialization, photo, working_hours, is_active FROM masters WHERE is_active = 1 ORDER BY name");
    while ($master = $mastersResult->fetch_assoc()) {
        $masterId = (int)$master['id'];
        $services = [];

        $serviceResult = $db->query("SELECT s.id, s.name, s.duration_minutes, s.category
                                    FROM services s
                                    INNER JOIN master_services ms ON ms.service_id = s.id
                                    WHERE ms.master_id = $masterId AND s.is_active = 1
                                    ORDER BY s.category, s.name");
        while ($service = $serviceResult->fetch_assoc()) {
            $serviceId = (int)$service['id'];
            $availability = getBookingAvailableSlots($db, $masterId, $date, $serviceId);
            $services[] = [
                'id' => $serviceId,
                'name' => $service['name'],
                'category' => $service['category'] ?? '',
                'duration_minutes' => (int)($availability['duration'] ?? $service['duration_minutes'] ?? 60),
                'available_slots' => $availability['slots'] ?? []
            ];
        }

        // Для старых баз, где связи master_services не заполнены.
        if (count($services) === 0) {
            $allServices = $db->query("SELECT id, name, duration_minutes, category FROM services WHERE is_active = 1 ORDER BY category, name");
            while ($service = $allServices->fetch_assoc()) {
                $serviceId = (int)$service['id'];
                if (!masterCanServeBookingService($db, $masterId, $serviceId)) continue;
                $availability = getBookingAvailableSlots($db, $masterId, $date, $serviceId);
                $services[] = [
                    'id' => $serviceId,
                    'name' => $service['name'],
                    'category' => $service['category'] ?? '',
                    'duration_minutes' => (int)($availability['duration'] ?? $service['duration_minutes'] ?? 60),
                    'available_slots' => $availability['slots'] ?? []
                ];
            }
        }

        $bookings = [];
        $bookingResult = $db->query("SELECT b.desired_time, b.client_name, b.status, s.name AS service_name,
                                           COALESCE(s.duration_minutes, 60) AS duration_minutes
                                    FROM bookings b
                                    LEFT JOIN services s ON s.id = b.service_id
                                    WHERE b.master_id = $masterId
                                      AND b.desired_date = '" . $db->escape($date) . "'
                                      AND b.status NOT IN ('cancelled','Отменена','Отклонена')
                                    ORDER BY b.desired_time");
        if ($bookingResult) {
            while ($booking = $bookingResult->fetch_assoc()) {
                $startMinutes = timeToMinutesValue($booking['desired_time']);
                $duration = max(15, (int)$booking['duration_minutes']);
                $bookings[] = [
                    'start' => substr((string)$booking['desired_time'], 0, 5),
                    'end' => $startMinutes === null ? '' : minutesToTimeValue($startMinutes + $duration),
                    'client_name' => $booking['client_name'] ?? '',
                    'service_name' => $booking['service_name'] ?? 'Услуга',
                    'status' => $booking['status'] ?? ''
                ];
            }
        }

        $masters[] = [
            'id' => $masterId,
            'name' => $master['name'],
            'specialization' => $master['specialization'] ?? '',
            'photo' => $master['photo'] ?: 'master1.jpg',
            'services' => $services,
            'bookings' => $bookings
        ];
    }

    echo json_encode([
        'success' => true,
        'date' => $date,
        'masters' => $masters
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error' => 'Не удалось получить расписание: ' . $e->getMessage(),
        'masters' => []
    ], JSON_UNESCAPED_UNICODE);
}
