<?php
require_once '../config.php';
require_once '../database.php';

// Проверяем авторизацию
if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    header('HTTP/1.1 401 Unauthorized');
    exit;
}

try {
    $db = new Database();
    
    // Параметры фильтрации
    $dateFrom = $_GET['date_from'] ?? date('Y-m-01'); // Начало текущего месяца
    $dateTo = $_GET['date_to'] ?? date('Y-m-d');
    $status = $_GET['status'] ?? 'all';
    
    
    $where = "WHERE b.desired_date BETWEEN '$dateFrom' AND '$dateTo'";
    
    if ($status !== 'all') {
        $where .= " AND b.status = '" . $db->escape($status) . "'";
    }
    
    // Получаем данные
    $sql = "SELECT b.*, 
                   s.name as service_name, 
                   s.price as service_price,
                   m.name as master_name,
                   DATE_FORMAT(b.desired_date, '%d.%m.%Y') as formatted_date,
                   DATE_FORMAT(b.created_at, '%d.%m.%Y %H:%i') as created_date
            FROM bookings b
            LEFT JOIN services s ON b.service_id = s.id
            LEFT JOIN masters m ON b.master_id = m.id
            $where
            ORDER BY b.desired_date, b.desired_time";
    
    $result = $db->query($sql);
    
    // Устанавливаем заголовки для скачивания CSV
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="bookings_' . date('Y-m-d') . '.csv"');
    
    // Открываем поток вывода
    $output = fopen('php://output', 'w');
    
    // Заголовки CSV
    fputcsv($output, [
        '№ записи', 'Клиент', 'Телефон', 'Услуга', 'Мастер', 
        'Дата записи', 'Время', 'Комментарий', 'Статус', 'Создано', 'Цена'
    ], ';');
    
    // Данные
    while ($row = $result->fetch_assoc()) {
        // Форматируем статус
        $statusText = '';
        switch ($row['status']) {
            case 'new': $statusText = 'Новая'; break;
            case 'confirmed': $statusText = 'Подтверждена'; break;
            case 'cancelled': $statusText = 'Отменена'; break;
        }
        
        fputcsv($output, [
            'B' . str_pad($row['id'], 6, '0', STR_PAD_LEFT),
            $row['client_name'],
            $row['phone'],
            $row['service_name'],
            $row['master_name'] ?: 'Любой',
            $row['formatted_date'],
            $row['desired_time'],
            $row['comment'],
            $statusText,
            $row['created_date'],
            $row['service_price']
        ], ';');
    }
    
    fclose($output);
    
} catch (Exception $e) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error' => 'Ошибка при экспорте: ' . $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
?>