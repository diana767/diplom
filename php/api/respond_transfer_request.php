<?php
require_once '../database.php';
require_once '../schema_additions.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Метод не поддерживается'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = new Database();
    ensureProjectAdditions($db);
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) $input = $_POST;

    $requestId = (int)($input['transfer_request_id'] ?? 0);
    $phone = trim((string)($input['phone'] ?? ''));
    $action = trim((string)($input['action'] ?? ''));
    $comment = trim((string)($input['comment'] ?? ''));

    if ($requestId <= 0 || $phone === '' || !in_array($action, ['accept', 'decline'], true)) {
        throw new Exception('Некорректные данные ответа');
    }

    $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
    $cleanPhoneEsc = $db->escape($cleanPhone);
    $phoneExpr = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(b.phone,'+',''),'(',''),')',''),'-',''),' ','')";

    $res = $db->query("SELECT tr.*, b.client_name, b.phone, b.service_id
                       FROM booking_transfer_requests tr
                       JOIN bookings b ON b.id = tr.booking_id
                       WHERE tr.id = $requestId AND ($phoneExpr LIKE '%$cleanPhoneEsc%' OR RIGHT($phoneExpr, 10) = RIGHT('$cleanPhoneEsc', 10)) LIMIT 1");
    if (!$res || $res->num_rows === 0) throw new Exception('Предложение переноса не найдено');
    $tr = $res->fetch_assoc();
    if ($tr['status'] !== 'pending') throw new Exception('На это предложение уже ответили');

    $db->beginTransaction();
    try {
        if ($action === 'accept') {
            $db->query("UPDATE bookings SET master_id = ".(!empty($tr['proposed_master_id']) ? (int)$tr['proposed_master_id'] : 'NULL').",
                        desired_date = '".$db->escape($tr['proposed_date'])."',
                        desired_time = '".$db->escape($tr['proposed_time'])."',
                        status = 'confirmed', updated_at = NOW()
                        WHERE id = ".(int)$tr['booking_id']);
            $status = 'accepted';
            $clientMessage = 'Клиент согласился на перенос записи.';
        } else {
            $db->query("UPDATE bookings SET status = 'new', updated_at = NOW() WHERE id = ".(int)$tr['booking_id']);
            $status = 'declined';
            $clientMessage = 'Клиент отказался от предложенного переноса.';
        }

        $db->query("UPDATE booking_transfer_requests SET status = '$status', client_response = '".$db->escape($comment)."', responded_at = NOW() WHERE id = $requestId");
        $db->query("INSERT INTO notifications (booking_id, transfer_request_id, client_name, phone, message, type, created_at)
                    VALUES (".(int)$tr['booking_id'].", $requestId, '".$db->escape($tr['client_name'])."', '".$db->escape($phone)."', '".$db->escape($clientMessage)."', 'client_response', NOW())");

        $db->commit();
        echo json_encode(['success' => true, 'message' => $action === 'accept' ? 'Запись перенесена' : 'Ответ отправлен администратору'], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $inner) {
        $db->rollback();
        throw $inner;
    }
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
