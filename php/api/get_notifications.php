<?php
require_once '../database.php';
require_once '../schema_additions.php';

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');

try {
    $phone = $_GET['phone'] ?? '';
    $unreadOnly = $_GET['unread_only'] ?? false;
    
    if (empty($phone)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Не указан телефон']);
        exit;
    }
    
    $db = new Database();
    ensureProjectAdditions($db);
    $cleanPhone = preg_replace('/[^0-9]/', '', $phone);
    $cleanPhoneEsc = $db->escape($cleanPhone);
    $phoneExpr = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(n.phone,'+',''),'(',''),')',''),'-',''),' ','')";
    
    $sql = "SELECT n.*, b.desired_date, b.desired_time,
                   tr.status AS transfer_status,
                   tr.proposed_date, tr.proposed_time, tr.admin_message,
                   pm.name AS proposed_master_name,
                   DATE_FORMAT(n.created_at, '%d.%m.%Y %H:%i') AS formatted_date
            FROM notifications n
            LEFT JOIN bookings b ON n.booking_id = b.id
            LEFT JOIN booking_transfer_requests tr ON n.transfer_request_id = tr.id
            LEFT JOIN masters pm ON tr.proposed_master_id = pm.id
            WHERE ($phoneExpr LIKE '%$cleanPhoneEsc%' OR RIGHT($phoneExpr, 10) = RIGHT('$cleanPhoneEsc', 10))";
    
    if ($unreadOnly) {
        $sql .= " AND n.is_read = 0";
    }
    
    $sql .= " ORDER BY n.created_at DESC";
    
    $result = $db->query($sql);
    
    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        if (empty($row['formatted_date']) && !empty($row['created_at'])) {
            $row['formatted_date'] = date('d.m.Y H:i', strtotime($row['created_at']));
        }
        $notifications[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $notifications,
        'count' => count($notifications)
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>
