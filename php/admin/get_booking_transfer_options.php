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

try {
    $db = new Database();
    ensureProjectAdditions($db);

    $bookingId = (int)($_GET['booking_id'] ?? 0);
    $excludeMasterId = (int)($_GET['exclude_master_id'] ?? 0);
    if ($bookingId <= 0) throw new Exception('Не указан ID записи');

    $res = $db->query("SELECT b.*, s.name AS service_name, s.category AS service_category, s.price AS service_price,
                              s.duration_minutes, m.name AS current_master_name, m.specialization AS current_master_specialization,
                              DATE_FORMAT(b.desired_date, '%d.%m.%Y') AS formatted_date
                       FROM bookings b
                       LEFT JOIN services s ON s.id = b.service_id
                       LEFT JOIN masters m ON m.id = b.master_id
                       WHERE b.id = $bookingId
                       LIMIT 1");
    if (!$res || $res->num_rows === 0) throw new Exception('Запись не найдена');
    $booking = $res->fetch_assoc();
    $booking['booking_number'] = 'B' . str_pad($booking['id'], 6, '0', STR_PAD_LEFT);

    if ($excludeMasterId <= 0 && !empty($booking['master_id']) && (string)$booking['status'] === 'transfer_proposed') {
        $excludeMasterId = (int)$booking['master_id'];
    }

    $masters = getTransferCandidateMasters($db, (int)$booking['service_id'], $excludeMasterId);

    echo json_encode([
        'success' => true,
        'booking' => $booking,
        'masters' => $masters,
        'exclude_master_id' => $excludeMasterId,
        'note' => 'Мастера отфильтрованы по услуге записи через master_services.'
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'masters' => []], JSON_UNESCAPED_UNICODE);
}
?>
