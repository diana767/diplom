<?php
require_once '../config.php';
require_once '../database.php';

header('Content-Type: application/json; charset=utf-8');

// Проверяем авторизацию
if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Не авторизован']);
    exit;
}

try {
    $db = new Database();
    
    $today = date('Y-m-d');
    $yesterday = date('Y-m-d', strtotime('-1 day'));
    $tomorrow = date('Y-m-d', strtotime('+1 day'));
    
    // Вспомогательная функция для получения количества записей
    function getCount($db, $sql) {
        $result = $db->query($sql);
        $row = $result->fetch_array();
        return $row[0] ?? 0;
    }
    
    // Основная статистика
    $stats = [
        'new_bookings' => getCount($db, "SELECT COUNT(*) FROM bookings WHERE status = 'new'"),
        'today_bookings' => getCount($db, "SELECT COUNT(*) FROM bookings WHERE DATE(desired_date) = '$today'"),
        'tomorrow_bookings' => getCount($db, "SELECT COUNT(*) FROM bookings WHERE DATE(desired_date) = '$tomorrow'"),
        'total_services' => getCount($db, "SELECT COUNT(*) FROM services WHERE is_active = 1"),
        'active_masters' => getCount($db, "SELECT COUNT(*) FROM masters WHERE is_active = 1"),
        'total_bookings' => getCount($db, "SELECT COUNT(*) FROM bookings"),
        'confirmed_bookings' => getCount($db, "SELECT COUNT(*) FROM bookings WHERE status = 'confirmed'"),
        'cancelled_bookings' => getCount($db, "SELECT COUNT(*) FROM bookings WHERE status = 'cancelled'"),
        'unread_notifications' => getCount($db, "SELECT COUNT(*) FROM notifications WHERE is_read = 0")
    ];
    
    // Статистика по дням (последние 7 дней)
    $dailyStats = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $dayName = date('D', strtotime($date));
        
        $dailyStats[] = [
            'date' => $date,
            'day' => $dayName,
            'bookings' => getCount($db, "SELECT COUNT(*) FROM bookings WHERE DATE(desired_date) = '$date'"),
            'new' => getCount($db, "SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = '$date' AND status = 'new'"),
            'confirmed' => getCount($db, "SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = '$date' AND status = 'confirmed'"),
            'cancelled' => getCount($db, "SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = '$date' AND status = 'cancelled'")
        ];
    }
    
    // Популярные услуги
    $popularServices = [];
    $servicesSql = "SELECT s.id, s.name, s.category, COUNT(b.id) as bookings_count
                    FROM services s
                    LEFT JOIN bookings b ON s.id = b.service_id
                    WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    GROUP BY s.id
                    ORDER BY bookings_count DESC
                    LIMIT 5";
    
    $result = $db->query($servicesSql);
    while ($row = $result->fetch_assoc()) {
        $popularServices[] = $row;
    }
    
    // Активные мастера
    $activeMasters = [];
    $mastersSql = "SELECT m.id, m.name, m.specialization, COUNT(b.id) as bookings_count
                   FROM masters m
                   LEFT JOIN bookings b ON m.id = b.master_id
                   WHERE b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                   AND b.status != 'cancelled'
                   GROUP BY m.id
                   ORDER BY bookings_count DESC
                   LIMIT 5";
    
    $result = $db->query($mastersSql);
    while ($row = $result->fetch_assoc()) {
        $activeMasters[] = $row;
    }
    
    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'daily_stats' => $dailyStats,
        'popular_services' => $popularServices,
        'active_masters' => $activeMasters
    ], JSON_UNESCAPED_UNICODE);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка сервера: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>