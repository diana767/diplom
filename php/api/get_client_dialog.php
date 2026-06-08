<?php
require_once '../database.php';
require_once '../schema_additions.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

function cleanPhoneSql($column) {
    return "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE($column, '+', ''), ' ', ''), '-', ''), '(', ''), ')', '')";
}

try {
    $phone = trim((string)($_GET['phone'] ?? ''));
    if ($phone === '') {
        echo json_encode(['success' => false, 'error' => 'Не указан телефон', 'has_dialog' => false], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $clean = preg_replace('/\D+/', '', $phone);
    $db = new Database();
    ensureProjectAdditions($db);

    $phoneExpr = cleanPhoneSql('cm.phone');
    $res = $db->query("SELECT cm.*,
        DATE_FORMAT(cm.created_at, '%d.%m.%Y %H:%i') AS created_at_formatted
        FROM contact_messages cm
        WHERE cm.phone = '".$db->escape($phone)."' OR $phoneExpr = '".$db->escape($clean)."'
        ORDER BY cm.created_at DESC, cm.id DESC
        LIMIT 1");

    if (!$res || $res->num_rows === 0) {
        echo json_encode(['success' => true, 'has_dialog' => false, 'data' => null], JSON_UNESCAPED_UNICODE);
        exit;
    }

    $contact = $res->fetch_assoc();
    $contactId = (int)$contact['id'];
    $cnt = $db->query("SELECT COUNT(*) AS c FROM chat_messages WHERE contact_message_id = $contactId")->fetch_assoc();
    if ((int)($cnt['c'] ?? 0) === 0) {
        $db->query("INSERT INTO chat_messages (contact_message_id, sender_type, sender_name, phone, message, is_read, created_at)
                    VALUES ($contactId, 'client', '".$db->escape($contact['name'])."', '".$db->escape($contact['phone'])."', '".$db->escape($contact['message'])."', 0, '".$db->escape($contact['created_at'])."')");
    }

    echo json_encode(['success' => true, 'has_dialog' => true, 'data' => $contact, 'contact_id' => $contactId], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'has_dialog' => false], JSON_UNESCAPED_UNICODE);
}
?>
