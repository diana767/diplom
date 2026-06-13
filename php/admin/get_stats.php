<?php
require_once '../config.php';
require_once '../database.php';

header('Content-Type: application/json; charset=utf-8');

if (session_status() === PHP_SESSION_NONE) { session_start(); }
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Не авторизован'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = new Database();
    $today = date('Y-m-d');
    $tomorrow = date('Y-m-d', strtotime('+1 day'));

    $confirmedStatuses = "('confirmed','completed','Подтверждена','Подтверждено','Завершена','Завершено')";
    $cancelledStatuses = "('cancelled','Отменена','Отклонена')";

    function adminGetCount($db, $sql) {
        $result = $db->query($sql);
        $row = $result->fetch_array();
        return (int)($row[0] ?? 0);
    }
    function adminGetMoney($db, $sql) {
        $result = $db->query($sql);
        $row = $result->fetch_array();
        return (float)($row[0] ?? 0);
    }

    $stats = [
        'new_bookings' => adminGetCount($db, "SELECT COUNT(*) FROM bookings WHERE status = 'new'"),
        'today_bookings' => adminGetCount($db, "SELECT COUNT(*) FROM bookings WHERE desired_date = '$today'"),
        'tomorrow_bookings' => adminGetCount($db, "SELECT COUNT(*) FROM bookings WHERE desired_date = '$tomorrow'"),
        'total_services' => adminGetCount($db, "SELECT COUNT(*) FROM services WHERE is_active = 1"),
        'active_masters' => adminGetCount($db, "SELECT COUNT(*) FROM masters WHERE is_active = 1"),
        'total_bookings' => adminGetCount($db, "SELECT COUNT(*) FROM bookings"),
        'confirmed_bookings' => adminGetCount($db, "SELECT COUNT(*) FROM bookings WHERE status IN $confirmedStatuses"),
        'cancelled_bookings' => adminGetCount($db, "SELECT COUNT(*) FROM bookings WHERE status IN $cancelledStatuses"),
        'transfer_proposed_bookings' => adminGetCount($db, "SELECT COUNT(*) FROM bookings WHERE status = 'transfer_proposed'"),
        'unread_notifications' => adminGetCount($db, "SELECT COUNT(*) FROM notifications WHERE is_read = 0"),
        'total_revenue' => adminGetMoney($db, "SELECT COALESCE(SUM(s.price),0) FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.status IN $confirmedStatuses"),
        'current_month_revenue' => adminGetMoney($db, "SELECT COALESCE(SUM(s.price),0) FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE DATE_FORMAT(b.desired_date,'%Y-%m') = DATE_FORMAT(CURDATE(),'%Y-%m') AND b.status IN $confirmedStatuses")
    ];

    $dailyStats = [];
    for ($i = 6; $i >= 0; $i--) {
        $date = date('Y-m-d', strtotime("-$i days"));
        $dailyStats[] = [
            'date' => $date,
            'day' => date('D', strtotime($date)),
            'bookings' => adminGetCount($db, "SELECT COUNT(*) FROM bookings WHERE desired_date = '$date'"),
            'created' => adminGetCount($db, "SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = '$date'"),
            'new' => adminGetCount($db, "SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = '$date' AND status = 'new'"),
            'confirmed' => adminGetCount($db, "SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = '$date' AND status IN $confirmedStatuses"),
            'cancelled' => adminGetCount($db, "SELECT COUNT(*) FROM bookings WHERE DATE(created_at) = '$date' AND status IN $cancelledStatuses")
        ];
    }

    $popularServices = [];
    $servicesSql = "SELECT s.id, s.name, s.category, COUNT(b.id) as bookings_count,
                           COALESCE(SUM(CASE WHEN b.status IN $confirmedStatuses THEN s.price ELSE 0 END),0) AS revenue
                    FROM services s
                    LEFT JOIN bookings b ON s.id = b.service_id AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
                    GROUP BY s.id, s.name, s.category
                    ORDER BY bookings_count DESC, s.name ASC
                    LIMIT 5";
    $result = $db->query($servicesSql);
    while ($row = $result->fetch_assoc()) $popularServices[] = $row;

    $activeMasters = [];
    $mastersSql = "SELECT m.id, m.name, m.specialization, COUNT(b.id) as bookings_count,
                          COALESCE(SUM(CASE WHEN b.status IN $confirmedStatuses THEN s.price ELSE 0 END),0) AS revenue
                   FROM masters m
                   LEFT JOIN bookings b ON m.id = b.master_id AND b.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) AND b.status NOT IN $cancelledStatuses
                   LEFT JOIN services s ON s.id = b.service_id
                   WHERE m.is_active = 1
                   GROUP BY m.id, m.name, m.specialization
                   ORDER BY bookings_count DESC, m.name ASC
                   LIMIT 5";
    $result = $db->query($mastersSql);
    while ($row = $result->fetch_assoc()) $activeMasters[] = $row;

    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'daily_stats' => $dailyStats,
        'popular_services' => $popularServices,
        'active_masters' => $activeMasters,
        'note' => 'Дашборд и финансовый отчёт используют одинаковые статусы для подтверждённых, завершённых и отменённых записей.'
    ], JSON_UNESCAPED_UNICODE);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Ошибка сервера: ' . $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
