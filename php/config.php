<?php
session_start();

// Настройки базы данных
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'beauty_salon');

// Секретный ключ для сессий
define('SECRET_KEY', 'your-secret-key-here');

// Настройки салона
$salon_settings = [
    'name' => 'Элегант',
    'phone' => '+7 (999) 123-45-67',
    'address' => 'г. Екатеринбург, ул. Ленина, 50',
    'working_hours' => 'Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-20:00'
];

// Разрешенные домены для CORS
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
?>