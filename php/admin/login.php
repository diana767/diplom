<?php
require_once '../config.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        echo json_encode(['success' => false, 'error' => 'Заполните все поля']);
        exit;
    }
    
    // Подключаемся к базе данных
    $db = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($db->connect_error) {
        echo json_encode(['success' => false, 'error' => 'Ошибка подключения к базе данных']);
        exit;
    }
    
    $db->set_charset("utf8mb4");
    
    // Ищем пользователя
    $stmt = $db->prepare("SELECT id, username, password_hash, full_name FROM admins WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 1) {
        $admin = $result->fetch_assoc();
        
        if (password_verify($password, $admin['password_hash'])) {
            // Создаем сессию
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_username'] = $admin['username'];
            $_SESSION['admin_full_name'] = $admin['full_name'];
            $_SESSION['admin_logged_in'] = true;
            
            // Обновляем время последнего входа
            $updateStmt = $db->prepare("UPDATE admins SET last_login = NOW() WHERE id = ?");
            $updateStmt->bind_param("i", $admin['id']);
            $updateStmt->execute();
            
            echo json_encode([
                'success' => true,
                'message' => 'Успешный вход',
                'admin' => [
                    'id' => $admin['id'],
                    'username' => $admin['username'],
                    'full_name' => $admin['full_name']
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'error' => 'Неверный пароль']);
        }
    } else {
        echo json_encode(['success' => false, 'error' => 'Пользователь не найден']);
    }
    
    $stmt->close();
    $db->close();
    
} else {
    echo json_encode(['success' => false, 'error' => 'Метод не поддерживается']);
}
?>