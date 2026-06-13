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
    $contactId = (int)($input['contact_id'] ?? 0);
    if ($contactId <= 0) throw new Exception('Не указан ID диалога');

    $db = new Database();
    ensureProjectAdditions($db);

    $check = $db->query("SELECT id FROM contact_messages WHERE id = $contactId LIMIT 1");
    if (!$check || $check->num_rows === 0) throw new Exception('Диалог не найден');

    // Сначала удаляем сообщения явно, чтобы работало и в старой базе без CASCADE.
    $db->beginTransaction();
    try {
        $db->query("DELETE FROM chat_messages WHERE contact_message_id = $contactId");
        $db->query("DELETE FROM contact_messages WHERE id = $contactId");
        $db->commit();
    } catch (Throwable $inner) {
        $db->rollback();
        throw $inner;
    }

    echo json_encode(['success' => true, 'message' => 'Диалог удалён'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
