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

    $contactId = (int)($input['contact_id'] ?? 0);
    $message = trim((string)($input['message'] ?? ''));
    if ($contactId <= 0 || $message === '') throw new Exception('Заполните сообщение');

    $contactRes = $db->query("SELECT phone FROM contact_messages WHERE id = $contactId LIMIT 1");
    if (!$contactRes || $contactRes->num_rows === 0) throw new Exception('Диалог не найден');
    $contact = $contactRes->fetch_assoc();

    $db->query("INSERT INTO chat_messages (contact_message_id, sender_type, sender_name, phone, message, is_read, created_at)
                VALUES ($contactId, 'admin', 'Администратор', '".$db->escape($contact['phone'])."', '".$db->escape($message)."', 0, NOW())");

    echo json_encode(['success' => true, 'message_id' => $db->getLastId()], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
