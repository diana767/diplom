<?php
require_once '../config.php';
require_once '../database.php';
require_once '../schema_additions.php';
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
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) $input = $_POST;
    $messageId = (int)($input['message_id'] ?? 0);
    if ($messageId <= 0) throw new Exception('Не указан ID сообщения');

    $db = new Database();
    ensureProjectAdditions($db);

    $check = $db->query("SELECT contact_message_id FROM chat_messages WHERE id = $messageId LIMIT 1");
    if (!$check || $check->num_rows === 0) throw new Exception('Сообщение не найдено');
    $row = $check->fetch_assoc();
    $contactId = (int)($row['contact_message_id'] ?? 0);

    $db->query("DELETE FROM chat_messages WHERE id = $messageId");

    echo json_encode(['success' => true, 'contact_id' => $contactId, 'message' => 'Сообщение удалено'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
