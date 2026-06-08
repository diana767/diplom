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

try {
    $db = new Database();
    ensureProjectAdditions($db);
    $masterId = (int)($_GET['master_id'] ?? 0);
    if ($masterId <= 0) throw new Exception('Не указан мастер');

    $masterRes = $db->query("SELECT * FROM masters WHERE id = $masterId LIMIT 1");
    if (!$masterRes || $masterRes->num_rows === 0) throw new Exception('Мастер не найден');
    $master = $masterRes->fetch_assoc();

    $res = $db->query("SELECT b.*, s.name AS service_name, s.price AS service_price, m.name AS master_name,
                       DATE_FORMAT(b.desired_date, '%d.%m.%Y') AS formatted_date
                       FROM bookings b
                       LEFT JOIN services s ON b.service_id = s.id
                       LEFT JOIN masters m ON b.master_id = m.id
                       WHERE b.master_id = $masterId
                         AND b.status != 'cancelled'
                         AND b.desired_date >= CURDATE()
                       ORDER BY b.desired_date ASC, b.desired_time ASC");
    $bookings = [];
    while ($row = $res->fetch_assoc()) {
        $row['booking_number'] = 'B' . str_pad($row['id'], 6, '0', STR_PAD_LEFT);
        $bookings[] = $row;
    }

    $mastersRes = $db->query("SELECT id, name, specialization FROM masters WHERE is_active = 1 AND id <> $masterId ORDER BY name");
    $masters = [];
    while ($row = $mastersRes->fetch_assoc()) $masters[] = $row;

    echo json_encode(['success' => true, 'master' => $master, 'bookings' => $bookings, 'available_masters' => $masters], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'bookings' => []], JSON_UNESCAPED_UNICODE);
}
?>
