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
    $contactId = (int)($_GET['contact_id'] ?? 0);
    if ($contactId <= 0) throw new Exception('Не указан ID диалога');

    $contactRes = $db->query("SELECT * FROM contact_messages WHERE id = $contactId LIMIT 1");
    if (!$contactRes || $contactRes->num_rows === 0) throw new Exception('Диалог не найден');
    $contact = $contactRes->fetch_assoc();

    $db->query("UPDATE chat_messages SET is_read = 1 WHERE contact_message_id = $contactId AND sender_type = 'client'");

    $res = $db->query("SELECT id, contact_message_id, sender_type, sender_name, message, is_read, created_at,
                       DATE_FORMAT(created_at, '%d.%m.%Y %H:%i') AS created_at_formatted
                       FROM chat_messages
                       WHERE contact_message_id = $contactId
                       ORDER BY created_at ASC, id ASC");
    $messages = [];
    while ($row = $res->fetch_assoc()) $messages[] = $row;

    echo json_encode(['success' => true, 'contact' => $contact, 'data' => $messages], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'data' => []], JSON_UNESCAPED_UNICODE);
}
?>
