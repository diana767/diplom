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
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Метод не поддерживается']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);

    $masterId = isset($input['id']) ? (int)$input['id'] : (isset($input['master_id']) ? (int)$input['master_id'] : 0);
    $isActive = isset($input['is_active']) ? (int)$input['is_active'] : 0;

    if ($masterId <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Некорректный ID мастера']);
        exit;
    }

    $db = new Database();
    ensureProjectAdditions($db);
    $sql = "UPDATE masters SET is_active = " . ($isActive ? 1 : 0) . ", updated_at = NOW() WHERE id = " . $masterId;

    if ($db->query($sql)) {
        $futureBookings = 0;
        if (!$isActive) {
            $cnt = $db->query("SELECT COUNT(*) AS c FROM bookings WHERE master_id = " . $masterId . " AND status != 'cancelled' AND desired_date >= CURDATE()");
            $futureBookings = (int)(($cnt && ($r = $cnt->fetch_assoc())) ? $r['c'] : 0);
        }
        echo json_encode([
            'success' => true,
            'master_id' => $masterId,
            'is_active' => ($isActive ? 1 : 0),
            'needs_transfer' => (!$isActive && $futureBookings > 0),
            'affected_bookings' => $futureBookings,
            'message' => (!$isActive && $futureBookings > 0) ? 'Мастер отключён. Есть будущие записи, им нужно предложить перенос.' : 'Статус мастера обновлён'
        ], JSON_UNESCAPED_UNICODE);
    } else {
        throw new Exception('Ошибка при обновлении статуса мастера');
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Ошибка сервера: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
