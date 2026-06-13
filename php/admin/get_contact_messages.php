<?php
require_once '../config.php';
require_once '../database.php';
require_once '../schema_additions.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Не авторизован'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = new Database();
    ensureProjectAdditions($db);

    $res = $db->query("SELECT cm.id, cm.name, cm.phone, cm.email, cm.message, cm.created_at,
               DATE_FORMAT(cm.created_at, '%d.%m.%Y %H:%i') AS created_at_formatted,
               (SELECT ch.message FROM chat_messages ch WHERE ch.contact_message_id = cm.id ORDER BY ch.created_at DESC, ch.id DESC LIMIT 1) AS latest_message,
               (SELECT ch.sender_type FROM chat_messages ch WHERE ch.contact_message_id = cm.id ORDER BY ch.created_at DESC, ch.id DESC LIMIT 1) AS latest_sender_type,
               (SELECT DATE_FORMAT(ch.created_at, '%d.%m.%Y %H:%i') FROM chat_messages ch WHERE ch.contact_message_id = cm.id ORDER BY ch.created_at DESC, ch.id DESC LIMIT 1) AS latest_at_formatted,
               (SELECT MAX(ch.created_at) FROM chat_messages ch WHERE ch.contact_message_id = cm.id AND ch.sender_type = 'client') AS last_client_message_at,
               (SELECT MAX(ch.created_at) FROM chat_messages ch WHERE ch.contact_message_id = cm.id AND ch.sender_type = 'admin') AS last_admin_message_at,
               (SELECT COUNT(*) FROM chat_messages ch WHERE ch.contact_message_id = cm.id AND ch.sender_type = 'client' AND ch.is_read = 0) AS unread_count,
               (SELECT COUNT(*) FROM chat_messages ch WHERE ch.contact_message_id = cm.id AND ch.sender_type = 'admin') AS admin_replies_count,
               (SELECT COUNT(*) FROM chat_messages ch WHERE ch.contact_message_id = cm.id) AS chat_count
        FROM contact_messages cm
        ORDER BY COALESCE((SELECT MAX(ch.created_at) FROM chat_messages ch WHERE ch.contact_message_id = cm.id), cm.created_at) DESC, cm.id DESC");

    $data = [];
    if ($res) {
        while($row = $res->fetch_assoc()) {
            $latestSender = $row['latest_sender_type'] ?: 'client';
            $row['is_answered'] = ($latestSender === 'admin') ? 1 : 0;
            $row['reply_status'] = ($latestSender === 'admin') ? 'answered' : 'unanswered';
            $row['reply_status_text'] = ($latestSender === 'admin') ? 'Отвечено' : 'Не отвечено';
            $data[] = $row;
        }
    }
    echo json_encode(['success' => true, 'data' => $data], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage(), 'data' => []], JSON_UNESCAPED_UNICODE);
}
?>
