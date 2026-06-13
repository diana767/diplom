<?php
require_once '../database.php';
require_once '../booking_helpers.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $masterId = isset($_GET['master_id']) && $_GET['master_id'] !== '' && $_GET['master_id'] !== 'any' ? (int)$_GET['master_id'] : 0;
    $date = normalizeBookingDateValue($_GET['date'] ?? '');
    $serviceId = isset($_GET['service_id']) && $_GET['service_id'] !== '' ? (int)$_GET['service_id'] : 0;
    $excludeBookingId = isset($_GET['exclude_booking_id']) ? (int)$_GET['exclude_booking_id'] : 0;
    $clientPhone = $_GET['client_phone'] ?? '';

    if ($date === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Не указана корректная дата'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = new Database();

    if ($serviceId > 0 && !$db->getService($serviceId)) {
        http_response_code(404);
        echo json_encode(['success' => false, 'error' => 'Услуга не найдена'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $result = getBookingAvailableSlots($db, $masterId, $date, $serviceId, $excludeBookingId, $clientPhone);

    echo json_encode([
        'success' => true,
        'date' => $date,
        'master_id' => $masterId ?: null,
        'service_id' => $serviceId ?: null,
        'duration_minutes' => $result['duration'],
        'working_hours' => $result['working_hours'],
        'available_slots' => $result['slots'],
        'count' => count($result['slots'])
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка получения свободных слотов: ' . $e->getMessage(),
        'available_slots' => []
    ], JSON_UNESCAPED_UNICODE);
}
?>
