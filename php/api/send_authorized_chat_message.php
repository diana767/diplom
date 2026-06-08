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
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) $input = $_POST;

    $contactId = (int)($input['contact_id'] ?? 0);
    $phone = trim((string)($input['phone'] ?? ''));
    $name = trim((string)($input['name'] ?? 'Клиент'));
    $message = trim((string)($input['message'] ?? ''));

    if ($phone === '' || $message === '') {
        echo json_encode(['success' => false, 'error' => 'Не указан телефон или текст сообщения'], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $db = new Database();
    ensureProjectAdditions($db);

    $db->beginTransaction();
    try {
        if ($contactId <= 0) {
            $db->query("INSERT INTO contact_messages (name, phone, email, message, created_at)
                        VALUES ('".$db->escape($name)."', '".$db->escape($phone)."', '', '".$db->escape($message)."', NOW())");
            $contactId = $db->getLastId();
        } else {
            $check = $db->query("SELECT id FROM contact_messages WHERE id = $contactId LIMIT 1");
            if (!$check || $check->num_rows === 0) throw new Exception('Диалог не найден');
        }

        $db->query("INSERT INTO chat_messages (contact_message_id, sender_type, sender_name, phone, message, is_read, created_at)
                    VALUES ($contactId, 'client', '".$db->escape($name)."', '".$db->escape($phone)."', '".$db->escape($message)."', 0, NOW())");
        $messageId = $db->getLastId();
        $db->commit();

        echo json_encode(['success' => true, 'contact_id' => $contactId, 'message_id' => $messageId], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $inner) {
        $db->rollback();
        throw $inner;
    }
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
