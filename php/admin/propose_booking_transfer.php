<?php
require_once '../config.php';
require_once '../database.php';
require_once '../schema_additions.php';
require_once '../booking_helpers.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Не авторизован'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Метод не поддерживается'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = new Database();
    ensureProjectAdditions($db);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) $input = $_POST;

    $bookingId = (int)($input['booking_id'] ?? 0);
    $newMasterId = (int)($input['new_master_id'] ?? 0);
    $newDate = normalizeBookingDateValue($input['new_date'] ?? '');
    $newTime = trim((string)($input['new_time'] ?? ''));
    $adminMessage = trim((string)($input['message'] ?? ''));

    if ($bookingId <= 0) throw new Exception('Выберите запись для переноса');
    if ($newMasterId <= 0) throw new Exception('Выберите нового мастера из списка');
    if ($newDate === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $newDate)) throw new Exception('Выберите корректную дату переноса');
    if (!preg_match('/^\d{2}:\d{2}$/', $newTime)) throw new Exception('Выберите свободный временной слот');
    if (strtotime($newDate) < strtotime(date('Y-m-d'))) throw new Exception('Нельзя перенести запись на прошедшую дату');

    $bookingRes = $db->query("SELECT b.*, s.name AS service_name, s.duration_minutes, m.name AS old_master_name
                              FROM bookings b
                              LEFT JOIN services s ON b.service_id = s.id
                              LEFT JOIN masters m ON b.master_id = m.id
                              WHERE b.id = $bookingId LIMIT 1");
    if (!$bookingRes || $bookingRes->num_rows === 0) throw new Exception('Запись не найдена');
    $booking = $bookingRes->fetch_assoc();

    $mRes = $db->query("SELECT id, name, specialization, is_active FROM masters WHERE id = $newMasterId LIMIT 1");
    if (!$mRes || $mRes->num_rows === 0) throw new Exception('Выбранный мастер не найден');
    $newMaster = $mRes->fetch_assoc();
    if ((string)$newMaster['is_active'] === '0') throw new Exception('Выбранный мастер неактивен');
    if (!masterCanServeBookingService($db, $newMasterId, (int)$booking['service_id'])) {
        throw new Exception('Выбранный мастер не выполняет услугу этой записи');
    }

    // Повторно проверяем слот на сервере, чтобы админ не мог отправить занятое время вручную из консоли.
    $slotsResult = getBookingAvailableSlots($db, $newMasterId, $newDate, (int)$booking['service_id'], $bookingId);
    if (!in_array($newTime, $slotsResult['slots'], true)) {
        throw new Exception('Выбранный слот уже занят или не входит в рабочее время мастера. Обновите список слотов.');
    }

    $db->beginTransaction();
    try {
        $oldMasterId = !empty($booking['master_id']) ? (int)$booking['master_id'] : 'NULL';
        $db->query("INSERT INTO booking_transfer_requests
                    (booking_id, old_master_id, proposed_master_id, proposed_date, proposed_time, admin_message, status, created_at)
                    VALUES ($bookingId, $oldMasterId, $newMasterId,
                    '".$db->escape($newDate)."', '".$db->escape($newTime)."', '".$db->escape($adminMessage)."', 'pending', NOW())");
        $requestId = $db->getLastId();

        $db->query("UPDATE bookings SET status = 'transfer_proposed', updated_at = NOW() WHERE id = $bookingId");

        $dateText = date('d.m.Y', strtotime($newDate));
        $message = "Администратор предлагает перенести вашу запись №B" . str_pad($bookingId, 6, '0', STR_PAD_LEFT) .
                   " на услугу \"" . $booking['service_name'] . "\" на $dateText в $newTime" .
                   " к мастеру " . $newMaster['name'] . ".";
        if ($adminMessage !== '') $message .= " Комментарий: " . $adminMessage;

        $db->query("INSERT INTO notifications (booking_id, transfer_request_id, client_name, phone, message, type, created_at)
                    VALUES ($bookingId, $requestId, '".$db->escape($booking['client_name'])."', '".$db->escape($booking['phone'])."', '".$db->escape($message)."', 'transfer', NOW())");

        $db->commit();
        echo json_encode([
            'success' => true,
            'message' => 'Предложение переноса отправлено клиенту',
            'transfer_request_id' => $requestId,
            'new_master_name' => $newMaster['name'],
            'new_date' => $newDate,
            'new_time' => $newTime
        ], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $inner) {
        $db->rollback();
        throw $inner;
    }
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
