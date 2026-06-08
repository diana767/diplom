<?php
require_once '../database.php';
require_once '../schema_additions.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

function only_digits($value) { return preg_replace('/\D+/', '', (string)$value); }
function valid_phone($value) { $d = only_digits($value); return strlen($d) >= 10 && strlen($d) <= 15; }
function luhn_check($number) {
    $digits = only_digits($number);
    $len = strlen($digits);
    if ($len < 13 || $len > 19) return false;
    $sum = 0;
    $double = false;
    for ($i = $len - 1; $i >= 0; $i--) {
        $n = (int)$digits[$i];
        if ($double) { $n *= 2; if ($n > 9) $n -= 9; }
        $sum += $n;
        $double = !$double;
    }
    return $sum % 10 === 0;
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
    if (!preg_match('/^[А-Яа-яЁёA-Za-z\s-]{2,60}$/u', $recipientName)) throw new Exception('Укажите корректное имя получателя');
    if ($senderName !== '' && !preg_match('/^[А-Яа-яЁёA-Za-z\s-]{2,60}$/u', $senderName)) throw new Exception('Укажите корректное имя отправителя');
    if (!valid_phone($phone)) throw new Exception('Укажите корректный номер телефона');
    if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) throw new Exception('Укажите корректный email');
    if (mb_strlen($message, 'UTF-8') > 500) throw new Exception('Пожелание слишком длинное');

    $cardNumber = only_digits($payment['card_number'] ?? '');
    $cardHolder = trim((string)($payment['card_holder'] ?? ''));
    $expMonth = (int)($payment['exp_month'] ?? 0);
    $expYear = (int)($payment['exp_year'] ?? 0);
    $cvv = only_digits($payment['cvv'] ?? '');

    if (!luhn_check($cardNumber)) throw new Exception('Введите корректный номер карты. Для теста можно использовать 4111 1111 1111 1111');
    if (!preg_match('/^[А-Яа-яЁёA-Za-z\s-]{2,80}$/u', $cardHolder)) throw new Exception('Укажите имя держателя карты');
    if ($expMonth < 1 || $expMonth > 12) throw new Exception('Некорректный месяц карты');
    if ($expYear < (int)date('Y') || $expYear > ((int)date('Y') + 20)) throw new Exception('Некорректный год карты');
    $lastValidDay = strtotime(sprintf('%04d-%02d-01 +1 month -1 day 23:59:59', $expYear, $expMonth));
    if ($lastValidDay < time()) throw new Exception('Срок действия карты истёк');
    if (!preg_match('/^\d{3,4}$/', $cvv)) throw new Exception('CVV должен содержать 3 или 4 цифры');

    $db = new Database();
    ensureProjectAdditions($db);

    do {
        $code = 'ELG-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
        $check = $db->query("SELECT id FROM gift_certificates WHERE code = '".$db->escape($code)."' LIMIT 1");
    } while ($check && $check->num_rows > 0);

    $last4 = substr($cardNumber, -4);
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
