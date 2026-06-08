<?php
require_once '../database.php';
require_once '../schema_additions.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $db = new Database();
    ensureProjectAdditions($db);

    $contactId = (int)($_GET['contact_id'] ?? 0);
    $phone = trim((string)($_GET['phone'] ?? ''));
    if ($contactId <= 0 || $phone === '') {
        echo json_encode(['success' => false, 'error' => 'Не указан номер телефона или ID диалога', 'data' => []], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $check = $db->query("SELECT id FROM contact_messages WHERE id = $contactId AND phone = '".$db->escape($phone)."' LIMIT 1");
    if (!$check || $check->num_rows === 0) {
        echo json_encode(['success' => false, 'error' => 'Диалог не найден', 'data' => []], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db->query("UPDATE chat_messages SET is_read = 1 WHERE contact_message_id = $contactId AND sender_type = 'admin'");

    $res = $db->query("SELECT id, contact_message_id, sender_type, sender_name, message, is_read, created_at,
                       DATE_FORMAT(created_at, '%d.%m.%Y %H:%i') AS created_at_formatted
                       FROM chat_messages
                       WHERE contact_message_id = $contactId
                       ORDER BY created_at ASC, id ASC");
    $data = [];
    while ($row = $res->fetch_assoc()) $data[] = $row;

    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'data' => []], JSON_UNESCAPED_UNICODE);
}
?>
