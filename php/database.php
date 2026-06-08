<?php
require_once 'config.php';

class Database {
    private $conn;
    
    public function __construct() {
        $this->conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($this->conn->connect_error) {
            die("Connection failed: " . $this->conn->connect_error);
        }
        
        $this->conn->set_charset("utf8mb4");
    }
    
    // Базовые методы
    public function query($sql) {
        $result = $this->conn->query($sql);
        if (!$result) {
            error_log("MySQL Error: " . $this->conn->error . " | Query: " . $sql);
            throw new Exception("Database query failed");
        }
        return $result;
    }
    
    public function escape($string) {
        return $this->conn->real_escape_string($string);
    }
    
    public function getLastId() {
        return $this->conn->insert_id;
    }
    
    public function getAffectedRows() {
        return $this->conn->affected_rows;
    }
    
    // Услуги
    public function getServices($category = null, $activeOnly = false) {
        $where = "WHERE 1=1";
        
        if ($category) {
            $where .= " AND category = '" . $this->escape($category) . "'";
        }
        
        if ($activeOnly) {
            $where .= " AND is_active = 1";
        }
        
        $sql = "SELECT * FROM services $where ORDER BY category, name";
        $result = $this->query($sql);
        
        $services = [];
        while($row = $result->fetch_assoc()) {
            $services[] = $row;
        }
        
        return $services;
    }
    
    public function getService($id) {
        $sql = "SELECT * FROM services WHERE id = " . (int)$id;
        $result = $this->query($sql);
        
        return $result->fetch_assoc();
    }
    
    public function addService($data) {
        $sql = "INSERT INTO services (name, category, description, price, duration_minutes, is_active, created_at) 
                VALUES ('" . $this->escape($data['name']) . "', 
                        '" . $this->escape($data['category']) . "', 
                        '" . $this->escape($data['description'] ?? '') . "', 
                        " . (float)$data['price'] . ", 
                        " . (int)($data['duration_minutes'] ?? 60) . ", 
                        " . (isset($data['is_active']) ? (int)$data['is_active'] : 1) . ", 
                        NOW())";
        
        return $this->query($sql);
    }
    
    public function updateService($id, $data) {
        $sql = "UPDATE services SET 
                name = '" . $this->escape($data['name']) . "',
                category = '" . $this->escape($data['category']) . "',
                description = '" . $this->escape($data['description'] ?? '') . "',
                price = " . (float)$data['price'] . ",
                duration_minutes = " . (int)($data['duration_minutes'] ?? 60) . ",
                is_active = " . (isset($data['is_active']) ? (int)$data['is_active'] : 1) . ",
                updated_at = NOW()
                WHERE id = " . (int)$id;
        
        return $this->query($sql);
    }
    
    public function deleteService($id) {
        $sql = "DELETE FROM services WHERE id = " . (int)$id;
        return $this->query($sql);
    }
    
    // Мастера
    public function getMasters($specialization = null, $activeOnly = false) {
        $where = "WHERE 1=1";
        
        if ($specialization) {
            $where .= " AND specialization = '" . $this->escape($specialization) . "'";
        }
        
        if ($activeOnly) {
            $where .= " AND is_active = 1";
        }
        
        $sql = "SELECT * FROM masters $where ORDER BY name";
        $result = $this->query($sql);
        
        $masters = [];
        while($row = $result->fetch_assoc()) {
            
            if (!empty($row['working_hours'])) {
                $row['working_hours'] = json_decode($row['working_hours'], true);
            }
            $masters[] = $row;
        }
        
        return $masters;
    }
    
    public function getMaster($id) {
        $sql = "SELECT * FROM masters WHERE id = " . (int)$id;
        $result = $this->query($sql);
        
        $master = $result->fetch_assoc();
        if ($master && !empty($master['working_hours'])) {
            $master['working_hours'] = json_decode($master['working_hours'], true);
        }
        
        return $master;
    }
    
    public function addMaster($data) {
        $workingHours = !empty($data['working_hours']) ? 
            "'" . $this->escape(json_encode($data['working_hours'], JSON_UNESCAPED_UNICODE)) . "'" : 
            'NULL';
        
        $sql = "INSERT INTO masters (name, specialization, experience_years, bio, photo, 
                is_active, working_hours, created_at) 
                VALUES ('" . $this->escape($data['name']) . "', 
                        '" . $this->escape($data['specialization']) . "', 
                        " . (int)($data['experience_years'] ?? 0) . ", 
                        '" . $this->escape($data['bio'] ?? '') . "', 
                        " . (!empty($data['photo']) ? "'" . $this->escape($data['photo']) . "'" : 'NULL') . ", 
                        " . (isset($data['is_active']) ? (int)$data['is_active'] : 1) . ", 
                        $workingHours, 
                        NOW())";
        
        return $this->query($sql);
    }
    
    public function updateMaster($id, $data) {
        $workingHours = !empty($data['working_hours']) ? 
            "'" . $this->escape(json_encode($data['working_hours'], JSON_UNESCAPED_UNICODE)) . "'" : 
            'NULL';
        
        $sql = "UPDATE masters SET 
                name = '" . $this->escape($data['name']) . "',
                specialization = '" . $this->escape($data['specialization']) . "',
                experience_years = " . (int)($data['experience_years'] ?? 0) . ",
                bio = '" . $this->escape($data['bio'] ?? '') . "',
                photo = " . (!empty($data['photo']) ? "'" . $this->escape($data['photo']) . "'" : 'NULL') . ",
                is_active = " . (isset($data['is_active']) ? (int)$data['is_active'] : 1) . ",
                working_hours = $workingHours,
                updated_at = NOW()
                WHERE id = " . (int)$id;
        
        return $this->query($sql);
    }
    
    public function deleteMaster($id) {
        $sql = "DELETE FROM masters WHERE id = " . (int)$id;
        return $this->query($sql);
    }
    
    // Записи
    public function saveBooking($data) {
        $masterId = !empty($data['master_id']) ? (int)$data['master_id'] : 'NULL';
        $packageInfo = !empty($data['package_info']) ? 
            "'" . $this->escape(json_encode($data['package_info'], JSON_UNESCAPED_UNICODE)) . "'" : 
            'NULL';
        
        $sql = "INSERT INTO bookings (client_name, phone, service_id, master_id, 
                desired_date, desired_time, comment, package_info, status, created_at) 
                VALUES ('" . $this->escape($data['client_name']) . "', 
                        '" . $this->escape($data['phone']) . "', 
                        " . (int)$data['service_id'] . ", 
                        $masterId, 
                        '" . $this->escape($data['desired_date']) . "', 
                        '" . $this->escape($data['desired_time']) . "', 
                        '" . $this->escape($data['comment'] ?? '') . "', 
                        $packageInfo, 
                        'new', 
                        NOW())";
        
        return $this->query($sql);
    }
    
    public function getBooking($id) {
        $sql = "SELECT b.*, 
                       s.name as service_name, 
                       s.price as service_price,
                       s.duration_minutes,
                       m.name as master_name,
                       m.specialization
                FROM bookings b
                LEFT JOIN services s ON b.service_id = s.id
                LEFT JOIN masters m ON b.master_id = m.id
                WHERE b.id = " . (int)$id;
        
        $result = $this->query($sql);
        $booking = $result->fetch_assoc();
        
        if ($booking && !empty($booking['package_info'])) {
            $booking['package_info'] = json_decode($booking['package_info'], true);
        }
        
        return $booking;
    }
    
    public function getBookings($filters = []) {
        $where = "WHERE 1=1";
        
        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where .= " AND b.status = '" . $this->escape($filters['status']) . "'";
        }
        
        if (!empty($filters['date_from'])) {
            $where .= " AND b.desired_date >= '" . $this->escape($filters['date_from']) . "'";
        }
        
        if (!empty($filters['date_to'])) {
            $where .= " AND b.desired_date <= '" . $this->escape($filters['date_to']) . "'";
        }
        
        if (!empty($filters['master_id'])) {
            $where .= " AND b.master_id = " . (int)$filters['master_id'];
        }
        
        if (!empty($filters['service_id'])) {
            $where .= " AND b.service_id = " . (int)$filters['service_id'];
        }
        
        if (!empty($filters['phone'])) {
            $cleanPhone = preg_replace('/[^0-9]/', '', $filters['phone']);
            $where .= " AND REPLACE(b.phone, '[^0-9]', '') LIKE '%$cleanPhone%'";
        }
        
        if (!empty($filters['search'])) {
            $search = $this->escape($filters['search']);
            $where .= " AND (b.client_name LIKE '%$search%' 
                            OR b.phone LIKE '%$search%' 
                            OR s.name LIKE '%$search%'
                            OR m.name LIKE '%$search%')";
        }
        
        $sql = "SELECT b.*, 
                       s.name as service_name, 
                       s.price as service_price,
                       s.duration_minutes,
                       m.name as master_name,
                       m.specialization
                FROM bookings b
                LEFT JOIN services s ON b.service_id = s.id
                LEFT JOIN masters m ON b.master_id = m.id
                $where
                ORDER BY b.created_at DESC";
        
        $result = $this->query($sql);
        
        $bookings = [];
        while ($row = $result->fetch_assoc()) {
            if (!empty($row['package_info'])) {
                $row['package_info'] = json_decode($row['package_info'], true);
            }
            $bookings[] = $row;
        }
        
        return $bookings;
    }
    
    public function updateBookingStatus($id, $status) {
        $sql = "UPDATE bookings SET status = '" . $this->escape($status) . "', 
                updated_at = NOW() 
                WHERE id = " . (int)$id;
        
        return $this->query($sql);
    }
    
    // Статистика
    public function getStats() {
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $tomorrow = date('Y-m-d', strtotime('+1 day'));
        
        $stats = [
            'new' => $this->getCount("SELECT COUNT(*) FROM bookings WHERE status = 'new'"),
            'today' => $this->getCount("SELECT COUNT(*) FROM bookings WHERE DATE(desired_date) = '$today'"),
            'tomorrow' => $this->getCount("SELECT COUNT(*) FROM bookings WHERE DATE(desired_date) = '$tomorrow'"),
            'total' => $this->getCount("SELECT COUNT(*) FROM bookings"),
            'services' => $this->getCount("SELECT COUNT(*) FROM services WHERE is_active = 1"),
            'masters' => $this->getCount("SELECT COUNT(*) FROM masters WHERE is_active = 1")
        ];
        
        return $stats;
    }
    
    private function getCount($sql) {
        $result = $this->query($sql);
        $row = $result->fetch_array();
        return $row[0] ?? 0;
    }
    
    // Вспомогательные методы
    public function beginTransaction() {
        $this->conn->begin_transaction();
    }
    
    public function commit() {
        $this->conn->commit();
    }
    
    public function rollback() {
        $this->conn->rollback();
    }
    
    public function __destruct() {
        $this->conn->close();
    }
}
?>