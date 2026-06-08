<?php
require_once '../config.php';
require_once '../database.php';
require_once '../schema_additions.php';
header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Не авторизован']);
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
    $newMasterId = !empty($input['new_master_id']) ? (int)$input['new_master_id'] : 'NULL';
    $newDate = trim((string)($input['new_date'] ?? ''));
    $newTime = trim((string)($input['new_time'] ?? ''));
    $adminMessage = trim((string)($input['message'] ?? ''));

    if ($bookingId <= 0 || $newDate === '' || $newTime === '') {
        throw new Exception('Выберите запись, новую дату и время');
    }

    $bookingRes = $db->query("SELECT b.*, s.name AS service_name, m.name AS old_master_name
                              FROM bookings b
                              LEFT JOIN services s ON b.service_id = s.id
                              LEFT JOIN masters m ON b.master_id = m.id
                              WHERE b.id = $bookingId LIMIT 1");
    if (!$bookingRes || $bookingRes->num_rows === 0) throw new Exception('Запись не найдена');
    $booking = $bookingRes->fetch_assoc();

    $newMasterName = 'другой мастер';
    if ($newMasterId !== 'NULL') {
        $mRes = $db->query("SELECT name FROM masters WHERE id = $newMasterId LIMIT 1");
        if ($mRes && $mRes->num_rows > 0) {
            $newMasterName = $mRes->fetch_assoc()['name'];
        }
    }

    $db->beginTransaction();
    try {
        $db->query("INSERT INTO booking_transfer_requests
                    (booking_id, old_master_id, proposed_master_id, proposed_date, proposed_time, admin_message, status, created_at)
                    VALUES ($bookingId, ".(!empty($booking['master_id']) ? (int)$booking['master_id'] : 'NULL').", $newMasterId,
                    '".$db->escape($newDate)."', '".$db->escape($newTime)."', '".$db->escape($adminMessage)."', 'pending', NOW())");
        $requestId = $db->getLastId();

        $db->query("UPDATE bookings SET status = 'transfer_proposed', updated_at = NOW() WHERE id = $bookingId");

        $dateText = date('d.m.Y', strtotime($newDate));
        $message = "Администратор предлагает перенести вашу запись №B" . str_pad($bookingId, 6, '0', STR_PAD_LEFT) .
                   " на услугу \"" . $booking['service_name'] . "\" на $dateText в $newTime" .
                   ($newMasterId !== 'NULL' ? " к мастеру $newMasterName" : "") . ".";
        if ($adminMessage !== '') $message .= " Комментарий: " . $adminMessage;

        $db->query("INSERT INTO notifications (booking_id, transfer_request_id, client_name, phone, message, type, created_at)
                    VALUES ($bookingId, $requestId, '".$db->escape($booking['client_name'])."', '".$db->escape($booking['phone'])."', '".$db->escape($message)."', 'transfer', NOW())");

        $db->commit();
        echo json_encode(['success' => true, 'message' => 'Предложение переноса отправлено клиенту', 'transfer_request_id' => $requestId], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $inner) {
        $db->rollback();
        throw $inner;
    }
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
