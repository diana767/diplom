<?php
require_once __DIR__ . '/config.php';

header('Content-Type: text/plain; charset=utf-8');

function fail(string $msg): void {
    http_response_code(500);
    echo "ERROR: {$msg}\n";
    exit;
}

$mysqli = new mysqli(DB_HOST, DB_USER, DB_PASS);
if ($mysqli->connect_error) {
    fail('MySQL connect error: ' . $mysqli->connect_error);
}
$mysqli->set_charset('utf8mb4');

if (!$mysqli->query("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")) {
    fail('Create database failed: ' . $mysqli->error);
}
if (!$mysqli->select_db(DB_NAME)) {
    fail('Select database failed: ' . $mysqli->error);
}

$schema = [];

$schema[] = "CREATE TABLE IF NOT EXISTS admins (\n  id INT UNSIGNED NOT NULL AUTO_INCREMENT,\n  username VARCHAR(64) NOT NULL UNIQUE,\n  password_hash VARCHAR(255) NOT NULL,\n  full_name VARCHAR(128) NULL,\n  last_login DATETIME NULL,\n  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME NULL,\n  PRIMARY KEY (id)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$schema[] = "CREATE TABLE IF NOT EXISTS services (\n  id INT UNSIGNED NOT NULL AUTO_INCREMENT,\n  name VARCHAR(255) NOT NULL,\n  category VARCHAR(128) NOT NULL,\n  description TEXT NULL,\n  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,\n  duration_minutes INT NOT NULL DEFAULT 60,\n  is_active TINYINT(1) NOT NULL DEFAULT 1,\n  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME NULL,\n  PRIMARY KEY (id),\n  INDEX idx_services_category (category)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$schema[] = "CREATE TABLE IF NOT EXISTS masters (\n  id INT UNSIGNED NOT NULL AUTO_INCREMENT,\n  name VARCHAR(255) NOT NULL,\n  specialization VARCHAR(255) NOT NULL,\n  experience_years INT NOT NULL DEFAULT 0,\n  bio TEXT NULL,\n  photo VARCHAR(255) NULL,\n  is_active TINYINT(1) NOT NULL DEFAULT 1,\n  working_hours JSON NULL,\n  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME NULL,\n  PRIMARY KEY (id),\n  INDEX idx_masters_specialization (specialization)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$schema[] = "CREATE TABLE IF NOT EXISTS clients (\n  id INT UNSIGNED NOT NULL AUTO_INCREMENT,\n  phone VARCHAR(32) NOT NULL,\n  full_name VARCHAR(120) NOT NULL DEFAULT '',\n  email VARCHAR(190) NULL,\n  birth_date DATE NULL,\n  notes VARCHAR(500) NULL,\n  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME NULL,\n  PRIMARY KEY (id),\n  UNIQUE KEY uq_clients_phone (phone)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$schema[] = "CREATE TABLE IF NOT EXISTS bookings (\n  id INT UNSIGNED NOT NULL AUTO_INCREMENT,\n  client_name VARCHAR(255) NOT NULL,\n  phone VARCHAR(64) NOT NULL,\n  service_id INT UNSIGNED NOT NULL,\n  master_id INT UNSIGNED NULL,\n  desired_date DATE NOT NULL,\n  desired_time VARCHAR(16) NOT NULL,\n  comment TEXT NULL,\n  package_info JSON NULL,\n  status VARCHAR(32) NOT NULL DEFAULT 'new',\n  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME NULL,\n  PRIMARY KEY (id),\n  INDEX idx_bookings_status (status),\n  INDEX idx_bookings_date (desired_date),\n  CONSTRAINT fk_bookings_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT ON UPDATE CASCADE,\n  CONSTRAINT fk_bookings_master FOREIGN KEY (master_id) REFERENCES masters(id) ON DELETE SET NULL ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$schema[] = "CREATE TABLE IF NOT EXISTS settings (\n  id INT UNSIGNED NOT NULL AUTO_INCREMENT,\n  salon_name VARCHAR(255) NOT NULL,\n  salon_phone VARCHAR(64) NOT NULL,\n  salon_address VARCHAR(255) NULL,\n  working_hours VARCHAR(255) NULL,\n  booking_rules JSON NULL,\n  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  updated_at DATETIME NULL,\n  PRIMARY KEY (id)\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

$schema[] = "CREATE TABLE IF NOT EXISTS notifications (\n  id INT UNSIGNED NOT NULL AUTO_INCREMENT,\n  booking_id INT UNSIGNED NOT NULL,\n  transfer_request_id INT UNSIGNED NULL,\n  client_name VARCHAR(255) NOT NULL,\n  phone VARCHAR(64) NOT NULL,\n  message TEXT NOT NULL,\n  type VARCHAR(32) NOT NULL DEFAULT 'admin',\n  is_read TINYINT(1) NOT NULL DEFAULT 0,\n  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n  read_at DATETIME NULL,\n  PRIMARY KEY (id),\n  INDEX idx_notifications_phone (phone),\n  INDEX idx_notifications_transfer_request (transfer_request_id),\n  INDEX idx_notifications_is_read (is_read),\n  CONSTRAINT fk_notifications_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE ON UPDATE CASCADE\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";

foreach ($schema as $q) {
    if (!$mysqli->query($q)) {
        fail("Schema error: {$mysqli->error}\n\nQuery:\n{$q}");
    }
}


$adminUser = 'admin';
$adminPass = 'admin123';
$adminHash = password_hash($adminPass, PASSWORD_DEFAULT);
$stmt = $mysqli->prepare('INSERT IGNORE INTO admins (username, password_hash, full_name, created_at) VALUES (?, ?, ?, NOW())');
$fullName = 'Администратор';
$stmt->bind_param('sss', $adminUser, $adminHash, $fullName);
if (!$stmt->execute()) {
    fail('Insert admin failed: ' . $stmt->error);
}
$stmt->close();


$res = $mysqli->query('SELECT COUNT(*) AS c FROM settings');
$row = $res->fetch_assoc();
if ((int)($row['c'] ?? 0) === 0) {
    $salonName = 'Элегант';
    $salonPhone = '+7 (999) 123-45-67';
    $salonAddress = 'г. Екатеринбург, ул. Ленина, 50';
    $workingHours = 'Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-20:00';
    $rules = json_encode([
        'slot_step_minutes' => 30,
        'min_hours_before_booking' => 2,
        'max_days_ahead' => 30
    ], JSON_UNESCAPED_UNICODE);
    $stmt = $mysqli->prepare('INSERT INTO settings (salon_name, salon_phone, salon_address, working_hours, booking_rules, created_at) VALUES (?, ?, ?, ?, ?, NOW())');
    $stmt->bind_param('sssss', $salonName, $salonPhone, $salonAddress, $workingHours, $rules);
    if (!$stmt->execute()) {
        fail('Insert settings failed: ' . $stmt->error);
    }
    $stmt->close();
}

$res = $mysqli->query('SELECT COUNT(*) AS c FROM services');
$row = $res->fetch_assoc();
if ((int)($row['c'] ?? 0) === 0) {
    $services = [
        ['Стрижка женская', 'Парикмахерские услуги', 'Подбор формы, мытье, укладка', 1800.00, 60],
        ['Стрижка мужская', 'Парикмахерские услуги', 'Мытье, стрижка, укладка', 1200.00, 45],
        ['Окрашивание', 'Парикмахерские услуги', 'Однотонное окрашивание', 3500.00, 120],
        ['Маникюр классический', 'Маникюр', 'Обработка, форма, покрытие по желанию', 1500.00, 60],
        ['Педикюр', 'Маникюр', 'Комплексный педикюр', 2200.00, 90],
        ['Чистка лица', 'Косметология', 'Ультразвуковая/комбинированная', 3000.00, 75]
    ];
    $stmt = $mysqli->prepare('INSERT INTO services (name, category, description, price, duration_minutes, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, NOW())');
    foreach ($services as $s) {
        [$name, $cat, $desc, $price, $dur] = $s;
        $stmt->bind_param('sssdi', $name, $cat, $desc, $price, $dur);
        if (!$stmt->execute()) {
            fail('Insert service failed: ' . $stmt->error);
        }
    }
    $stmt->close();
}


$res = $mysqli->query('SELECT COUNT(*) AS c FROM masters');
$row = $res->fetch_assoc();
if ((int)($row['c'] ?? 0) === 0) {
    $working = json_encode([
        'mon' => ['10:00-19:00'],
        'tue' => ['10:00-19:00'],
        'wed' => ['10:00-19:00'],
        'thu' => ['10:00-19:00'],
        'fri' => ['10:00-19:00'],
        'sat' => ['10:00-18:00'],
        'sun' => []
    ], JSON_UNESCAPED_UNICODE);

    $masters = [
        ['Анна Смирнова', 'Парикмахер-стилист', 7, 'Специализируется на сложных окрашиваниях и стрижках.', 'master-anna-smirnova.png'],
        ['Екатерина Иванова', 'Мастер маникюра', 5, 'Аккуратный маникюр, современные покрытия, дизайн.', 'master2.jpg'],
        ['Мария Петрова', 'Визажист', 6, 'Дневной и вечерний макияж, свадебные образы.', 'master3.jpg']
    ];

    $stmt = $mysqli->prepare('INSERT INTO masters (name, specialization, experience_years, bio, photo, is_active, working_hours, created_at) VALUES (?, ?, ?, ?, ?, 1, ?, NOW())');
    foreach ($masters as $m) {
        [$name, $spec, $exp, $bio, $photo] = $m;
        $stmt->bind_param('ssisss', $name, $spec, $exp, $bio, $photo, $working);
        if (!$stmt->execute()) {
            fail('Insert master failed: ' . $stmt->error);
        }
    }
    $stmt->close();
}



// ===== ДОРАБОТКА: чат, портфолио и переносы записей =====
require_once __DIR__ . '/database.php';
require_once __DIR__ . '/schema_additions.php';
$addonDb = new Database();
ensureProjectAdditions($addonDb);

echo "OK: Database installed\n";
echo "DB: " . DB_NAME . "\n";
echo "Admin login: admin\n";
echo "Admin password: admin123\n";
