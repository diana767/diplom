<?php
require_once '../database.php';
require_once '../schema_additions.php';
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); echo json_encode(['success'=>false,'error'=>'Метод не поддерживается']); exit; }
try {
    $in=json_decode(file_get_contents('php://input'),true) ?: $_POST;
    $phone=preg_replace('/[^0-9]/','',$in['phone']??''); $phone=substr($phone,-10);
    $name=trim($in['full_name']??''); $email=trim($in['email']??''); $birth=trim($in['birth_date']??''); $notes=trim($in['notes']??'');
    if(strlen($phone)!==10) throw new Exception('Некорректный телефон');
    if(!preg_match('/^[А-Яа-яЁёA-Za-z\s-]{2,120}$/u',$name)) throw new Exception('Введите корректное имя');
    if($email!=='' && !filter_var($email,FILTER_VALIDATE_EMAIL)) throw new Exception('Введите корректный email');
    if($birth!=='' && !preg_match('/^\d{4}-\d{2}-\d{2}$/',$birth)) throw new Exception('Некорректная дата рождения');
    if((function_exists('mb_strlen') ? mb_strlen($notes, 'UTF-8') : strlen($notes)) > 500) throw new Exception('Примечание не должно превышать 500 символов');
    $db=new Database(); ensureProjectAdditions($db);
    $pe=$db->escape($phone); $ne=$db->escape($name); $ee=$db->escape($email); $no=$db->escape($notes);
    $birthSql=$birth!==''?"'".$db->escape($birth)."'":'NULL';
    $db->query("INSERT INTO clients(phone,full_name,email,birth_date,notes,updated_at) VALUES('$pe','$ne',".($email!==''?"'$ee'":'NULL').",$birthSql,".($notes!==''?"'$no'":'NULL').",NOW()) ON DUPLICATE KEY UPDATE full_name=VALUES(full_name),email=VALUES(email),birth_date=VALUES(birth_date),notes=VALUES(notes),updated_at=NOW()");
    $expr="REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone,'+',''),'(',''),')',''),'-',''),' ','')";
    $db->query("UPDATE bookings SET client_name='$ne' WHERE RIGHT($expr,10)='$pe'");
    echo json_encode(['success'=>true,'message'=>'Профиль сохранён'],JSON_UNESCAPED_UNICODE);
} catch(Throwable $e){ http_response_code(400); echo json_encode(['success'=>false,'error'=>$e->getMessage()],JSON_UNESCAPED_UNICODE); }
