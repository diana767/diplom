<?php
require_once '../database.php';
require_once '../schema_additions.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
try {
    $phone = preg_replace('/[^0-9]/', '', $_GET['phone'] ?? '');
    if (strlen($phone) < 10) throw new Exception('Некорректный номер телефона');
    $db = new Database(); ensureProjectAdditions($db);
    $phone = substr($phone, -10); $esc = $db->escape($phone);
    $res = $db->query("SELECT id, phone, full_name, email, birth_date, notes FROM clients WHERE RIGHT(phone,10)='$esc' LIMIT 1");
    $profile = $res && $res->num_rows ? $res->fetch_assoc() : null;
    if (!$profile) {
        $expr="REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,'+',''),'(',''),')',''),'-',''),' ','')";
        $b=$db->query("SELECT client_name FROM bookings WHERE RIGHT($expr,10)='$esc' ORDER BY created_at DESC LIMIT 1");
        $name=$b&&$b->num_rows?$b->fetch_assoc()['client_name']:'';
        $db->query("INSERT INTO clients(phone,full_name) VALUES ('$esc','".$db->escape($name)."')");
        $profile=['phone'=>$phone,'full_name'=>$name,'email'=>'','birth_date'=>null,'notes'=>''];
    }
    echo json_encode(['success'=>true,'data'=>$profile], JSON_UNESCAPED_UNICODE);
} catch(Throwable $e){ http_response_code(400); echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE); }
