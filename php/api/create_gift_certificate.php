<?php
require_once '../database.php';
require_once '../schema_additions.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

function cert_only_digits($value) { return preg_replace('/\D+/', '', (string)$value); }
function cert_valid_phone($value) { $d = cert_only_digits($value); return strlen($d) >= 10 && strlen($d) <= 15; }
function cert_text_len($value) { return function_exists('mb_strlen') ? mb_strlen((string)$value, 'UTF-8') : strlen((string)$value); }
function cert_random_code() {
    if (function_exists('random_bytes')) {
        return 'ELG-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }
    return 'ELG-' . strtoupper(substr(md5(uniqid('', true)), 0, 8));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Метод не поддерживается'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) $input = $_POST;

    $amount = (float)($input['amount'] ?? 0);
    $recipientName = trim((string)($input['recipient_name'] ?? ''));
    $senderName = trim((string)($input['sender_name'] ?? ''));
    $message = trim((string)($input['message'] ?? ''));
    $phone = trim((string)($input['phone'] ?? ''));
    $email = trim((string)($input['email'] ?? ''));
    $payment = is_array($input['payment'] ?? null) ? $input['payment'] : [];

    if ($amount < 500) throw new Exception('Минимальная сумма сертификата — 500 ₽');
    if ($amount > 200000) throw new Exception('Максимальная сумма сертификата — 200 000 ₽');
    if (!preg_match('/^[А-Яа-яЁёA-Za-z\s-]{2,80}$/u', $recipientName)) throw new Exception('Укажите корректное имя получателя');
    if ($senderName !== '' && !preg_match('/^[А-Яа-яЁёA-Za-z\s-]{2,80}$/u', $senderName)) throw new Exception('Укажите корректное имя отправителя');
    if (!cert_valid_phone($phone)) throw new Exception('Укажите корректный номер телефона');
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new Exception('Укажите корректный email');
    if (cert_text_len($message) > 500) throw new Exception('Пожелание слишком длинное');

    // Учебная демо-оплата: деньги не списываются. Чтобы сертификаты не падали на тестовых данных,
    // строгая проверка банка заменена на мягкую проверку формата, а пустые поля подставляются демо-значениями.
    $cardNumber = cert_only_digits($payment['card_number'] ?? '4111111111111111');
    if ($cardNumber === '') $cardNumber = '4111111111111111';
    if (strlen($cardNumber) < 12 || strlen($cardNumber) > 19) {
        throw new Exception('Номер демо-карты должен содержать от 12 до 19 цифр');
    }
    $last4 = substr($cardNumber, -4);

    $db = new Database();
    ensureProjectAdditions($db);

    do {
        $code = cert_random_code();
        $check = $db->query("SELECT id FROM gift_certificates WHERE code = '".$db->escape($code)."' LIMIT 1");
    } while ($check && $check->num_rows > 0);

    $db->query("INSERT INTO gift_certificates (code, amount, recipient_name, sender_name, buyer_phone, buyer_email, card_last4, payment_demo_status, paid_at, message, status, created_at)
                VALUES ('".$db->escape($code)."', ".number_format($amount, 2, '.', '').", '".$db->escape($recipientName)."', '".$db->escape($senderName)."', '".$db->escape($phone)."', '".$db->escape($email)."', '".$db->escape($last4)."', 'paid_demo', NOW(), '".$db->escape($message)."', 'active', NOW())");

    echo json_encode([
        'success' => true,
        'data' => [
            'id' => $db->getLastId(),
            'code' => $code,
            'amount' => $amount,
            'recipient_name' => $recipientName,
            'sender_name' => $senderName,
            'buyer_phone' => $phone,
            'buyer_email' => $email,
            'card_last4' => $last4,
            'payment_demo_status' => 'paid_demo',
            'message' => $message,
            'created_at' => date('d.m.Y H:i')
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
