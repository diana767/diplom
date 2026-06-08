<?php
require_once '../config.php';
require_once '../database.php';

header('Content-Type: application/json; charset=utf-8');

// Проверяем авторизацию
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Не авторизован']);
    exit;
}

try {
    $db = new Database();
    
    $filters = [
        'status' => $_GET['status'] ?? 'all',
        'date_from' => $_GET['date_from'] ?? null,
        'date_to' => $_GET['date_to'] ?? null,
        'master_id' => $_GET['master_id'] ?? null,
        'service_id' => $_GET['service_id'] ?? null,
        'search' => $_GET['search'] ?? null,
        'page' => $_GET['page'] ?? 1,
        'limit' => $_GET['limit'] ?? 50
    ];
    
   
    $where = "WHERE 1=1";
    
    if ($filters['status'] !== 'all') {
        $where .= " AND b.status = '" . $db->escape($filters['status']) . "'";
    }
    
    if ($filters['date_from']) {
        $where .= " AND b.desired_date >= '" . $db->escape($filters['date_from']) . "'";
    }
    
    if ($filters['date_to']) {
        $where .= " AND b.desired_date <= '" . $db->escape($filters['date_to']) . "'";
    }
    
    if ($filters['master_id']) {
        $where .= " AND b.master_id = " . (int)$filters['master_id'];
    }
    
    if ($filters['service_id']) {
        $where .= " AND b.service_id = " . (int)$filters['service_id'];
    }
    
    if ($filters['search']) {
        $search = $db->escape($filters['search']);
        $where .= " AND (b.client_name LIKE '%$search%' 
                        OR b.phone LIKE '%$search%' 
                        OR s.name LIKE '%$search%'
                        OR m.name LIKE '%$search%')";
    }
    
  
    $countSql = "SELECT COUNT(*) as total 
                 FROM bookings b
                 LEFT JOIN services s ON b.service_id = s.id
                 LEFT JOIN masters m ON b.master_id = m.id
                 $where";
    
    $countResult = $db->query($countSql);
    $totalCount = $countResult->fetch_assoc()['total'];
    
   
    $offset = ($filters['page'] - 1) * $filters['limit'];
    
    $sql = "SELECT b.*, 
                   s.name as service_name, 
                   s.price as service_price,
                   s.duration_minutes,
                   m.name as master_name,
                   m.specialization,
                   m.photo as master_photo
            FROM bookings b
            LEFT JOIN services s ON b.service_id = s.id
            LEFT JOIN masters m ON b.master_id = m.id
            $where
            ORDER BY b.created_at DESC
            LIMIT $offset, " . $filters['limit'];
    
    $result = $db->query($sql);
    
    $bookings = [];
    while ($row = $result->fetch_assoc()) {
        // Форматируем данные
        $row['booking_number'] = 'B' . str_pad($row['id'], 6, '0', STR_PAD_LEFT);
        $row['formatted_date'] = date('d.m.Y', strtotime($row['desired_date']));
        $row['created_date'] = date('d.m.Y H:i', strtotime($row['created_at']));
        $row['updated_date'] = !empty($row['updated_at']) ? date('d.m.Y H:i', strtotime($row['updated_at'])) : null;
        $row['package_info'] = !empty($row['package_info']) ? json_decode($row['package_info'], true) : null;
        
        // Форматируем телефон
        $phone = preg_replace('/[^0-9]/', '', $row['phone']);
        if (strlen($phone) === 11) {
            $row['formatted_phone'] = '+7 (' . substr($phone, 1, 3) . ') ' . 
                                      substr($phone, 4, 3) . '-' . 
                                      substr($phone, 7, 2) . '-' . 
                                      substr($phone, 9, 2);
        } else {
            $row['formatted_phone'] = $row['phone'];
        }
        
        $bookings[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'data' => $bookings,
        'pagination' => [
            'total' => (int)$totalCount,
            'page' => (int)$filters['page'],
            'limit' => (int)$filters['limit'],
            'pages' => ceil($totalCount / $filters['limit'])
        ],
        'filters' => $filters
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>