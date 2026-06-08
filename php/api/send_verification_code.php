<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$phone = $input['phone'] ?? '';
$clean = preg_replace('/\D+/', '', $phone);
if (strlen($clean) < 10) {
    http_response_code(400);
    echo json_encode(['success'=>false,'error'=>'Некорректный номер телефона'], JSON_UNESCAPED_UNICODE);
    exit;
}
$code = (string)random_int(100000, 999999);
$_SESSION['verification_phone'] = $clean;
$_SESSION['verification_code'] = $code;
$_SESSION['verification_expires'] = time() + 300;
echo json_encode(['success'=>true,'message'=>'Код сгенерирован','code'=>$code,'dev_mode'=>true], JSON_UNESCAPED_UNICODE);
