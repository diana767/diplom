<?php
require_once '../database.php';
require_once '../schema_additions.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => 'Метод не поддерживается'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (!is_array($input)) {
        $input = $_POST;
    }

    $name = trim((string)($input['name'] ?? ''));
    $phone = trim((string)($input['phone'] ?? ''));
    $email = trim((string)($input['email'] ?? ''));
    $message = trim((string)($input['message'] ?? ''));

    if ($name === '' || $phone === '' || $message === '') {
        throw new Exception('Заполните имя, телефон и сообщение');
    }
    if (!preg_match('/^[А-Яа-яЁёA-Za-z\s-]{2,60}$/u', $name)) {
        throw new Exception('Некорректное имя. Используйте буквы, пробел или дефис');
    }
    $cleanPhone = preg_replace('/\D+/', '', $phone);
    if (strlen($cleanPhone) < 10 || strlen($cleanPhone) > 15) {
        throw new Exception('Некорректный номер телефона');
    }
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Некорректный email');
    }
    if (mb_strlen($message, 'UTF-8') < 3 || mb_strlen($message, 'UTF-8') > 1500) {
        throw new Exception('Сообщение должно быть от 3 до 1500 символов');
    }

    $db = new Database();
    ensureProjectAdditions($db);

    $db->beginTransaction();
    try {
        $sql = "INSERT INTO contact_messages (name, phone, email, message, created_at) VALUES ('".
            $db->escape($name)."','".
            $db->escape($phone)."','".
            $db->escape($email)."','".
            $db->escape($message)."',NOW())";
        $db->query($sql);
        $contactId = $db->getLastId();

        $db->query("INSERT INTO chat_messages (contact_message_id, sender_type, sender_name, phone, message, is_read, created_at)
                    VALUES ($contactId, 'client', '".$db->escape($name)."', '".$db->escape($phone)."', '".$db->escape($message)."', 0, NOW())");

        $db->commit();
        echo json_encode([
            'success' => true,
            'message' => 'Сообщение отправлено. Диалог с администратором открыт.',
            'contact_id' => $contactId,
            'conversation_id' => $contactId,
            'phone' => $phone,
            'name' => $name
        ], JSON_UNESCAPED_UNICODE);
    } catch (Throwable $inner) {
        $db->rollback();
        throw $inner;
    }
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
