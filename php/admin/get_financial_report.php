<?php
require_once '../config.php';
require_once '../database.php';
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Не авторизован'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $db = new Database();
    $confirmedStatuses = "('confirmed','completed','Подтверждена','Подтверждено','Завершена','Завершено')";
    $cancelledStatuses = "('cancelled','Отменена','Отклонена')";

    $summarySql = "SELECT
        COUNT(b.id) AS all_count,
        SUM(CASE WHEN b.status = 'new' THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN b.status = 'transfer_proposed' THEN 1 ELSE 0 END) AS transfer_count,
        SUM(CASE WHEN b.status IN $confirmedStatuses THEN 1 ELSE 0 END) AS confirmed_count,
        SUM(CASE WHEN b.status IN $cancelledStatuses THEN 1 ELSE 0 END) AS cancelled_count,
        COALESCE(SUM(CASE WHEN b.status IN $confirmedStatuses THEN s.price ELSE 0 END),0) AS total_revenue,
        COALESCE(AVG(CASE WHEN b.status IN $confirmedStatuses THEN s.price ELSE NULL END),0) AS avg_check,
        COALESCE(SUM(CASE WHEN DATE_FORMAT(b.desired_date,'%Y-%m') = DATE_FORMAT(CURDATE(),'%Y-%m') AND b.status IN $confirmedStatuses THEN s.price ELSE 0 END),0) AS current_month_revenue,
        COALESCE(SUM(CASE WHEN b.status NOT IN $cancelledStatuses THEN s.price ELSE 0 END),0) AS potential_revenue
        FROM bookings b
        LEFT JOIN services s ON b.service_id = s.id";

    $summaryResult = $db->query($summarySql);
    $summary = $summaryResult ? $summaryResult->fetch_assoc() : [];

    $monthlySql = "SELECT
        DATE_FORMAT(b.desired_date,'%m.%Y') AS period,
        COUNT(b.id) AS bookings_count,
        SUM(CASE WHEN b.status = 'new' THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN b.status = 'transfer_proposed' THEN 1 ELSE 0 END) AS transfer_count,
        SUM(CASE WHEN b.status IN $confirmedStatuses THEN 1 ELSE 0 END) AS confirmed_count,
        SUM(CASE WHEN b.status IN $cancelledStatuses THEN 1 ELSE 0 END) AS cancelled_count,
        ROUND(COALESCE(SUM(CASE WHEN b.status IN $confirmedStatuses THEN s.price ELSE 0 END),0),2) AS revenue
        FROM bookings b
        LEFT JOIN services s ON b.service_id = s.id
        GROUP BY DATE_FORMAT(b.desired_date,'%Y-%m'), DATE_FORMAT(b.desired_date,'%m.%Y')
        ORDER BY DATE_FORMAT(b.desired_date,'%Y-%m') DESC
        LIMIT 12";

    $res = $db->query($monthlySql);
    $monthly = [];
    if ($res) while($row = $res->fetch_assoc()) $monthly[] = $row;

    foreach (['all_count','new_count','transfer_count','confirmed_count','cancelled_count','total_revenue','avg_check','current_month_revenue','potential_revenue'] as $k) {
        $summary[$k] = isset($summary[$k]) ? (float)$summary[$k] : 0;
    }

    echo json_encode([
        'success' => true,
        'summary' => $summary,
        'monthly' => $monthly,
        'note' => 'Выручка считается по подтверждённым и завершённым записям. Новые заявки и предложенные переносы не включаются в доход.'
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка формирования отчёта: ' . $e->getMessage(),
        'summary' => [
            'all_count' => 0,
            'new_count' => 0,
            'transfer_count' => 0,
            'confirmed_count' => 0,
            'cancelled_count' => 0,
            'total_revenue' => 0,
            'avg_check' => 0,
            'current_month_revenue' => 0,
            'potential_revenue' => 0
        ],
        'monthly' => []
    ], JSON_UNESCAPED_UNICODE);
}
?>
