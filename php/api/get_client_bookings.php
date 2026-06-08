<?php
require_once '../database.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $phone = $_GET['phone'] ?? '';
    
    if (empty($phone)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Не указан телефон']);
        exit;
    }
    
    // Очищаем телефон от нецифровых символов для поиска
    $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
    
    $db = new Database();
   
    $cleanPhoneEsc = $db->escape($cleanPhone);
    $phoneExpr = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(b.phone,'+',''),'(',''),')',''),'-',''),' ','')";

    $sql = "SELECT b.*, 
                   s.name as service_name, 
                   s.price as service_price,
                   s.duration_minutes,
                   m.name as master_name,
                   m.specialization
            FROM bookings b
            LEFT JOIN services s ON b.service_id = s.id
            LEFT JOIN masters m ON b.master_id = m.id
            WHERE $phoneExpr LIKE '%" . $cleanPhoneEsc . "%' 
               OR RIGHT($phoneExpr, 10) = RIGHT('" . $cleanPhoneEsc . "', 10)
            ORDER BY b.desired_date DESC, b.desired_time DESC";
    
    $result = $db->query($sql);
    
    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        // Форматируем данные для клиента
        $row['booking_number'] = 'B' . str_pad($row['id'], 6, '0', STR_PAD_LEFT);
        $row['formatted_date'] = date('d.m.Y', strtotime($row['desired_date']));
        $row['package_info'] = !empty($row['package_info']) ? json_decode($row['package_info'], true) : null;
        $bookings[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $bookings,
        'count' => count($bookings)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>