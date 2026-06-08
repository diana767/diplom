<?php
require_once '../config.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit; }
$input = json_decode(file_get_contents('php://input'), true) ?: [];
$phone = preg_replace('/\D+/', '', $input['phone'] ?? '');
$code = (string)($input['code'] ?? '');
$ok = isset($_SESSION['verification_phone'], $_SESSION['verification_code'], $_SESSION['verification_expires'])
    && $_SESSION['verification_phone'] === $phone
    && $_SESSION['verification_code'] === $code
    && time() <= $_SESSION['verification_expires'];
echo json_encode(['success'=>$ok], JSON_UNESCAPED_UNICODE);
