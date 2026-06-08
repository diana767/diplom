<?php
session_start();
require_once '../database.php';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);
    
    $username = $data['username'] ?? '';
    $password = $data['password'] ?? '';
    
    $db = new Database();
    
    // Проверка учетных данных
    $sql = "SELECT * FROM admins WHERE username = '" . $db->escape($username) . "'";
    $result = $db->query($sql);
    
    if ($result->num_rows === 1) {
        $admin = $result->fetch_assoc();
        
        if (password_verify($password, $admin['password_hash'])) {
            $_SESSION['admin_id'] = $admin['id'];
            $_SESSION['admin_username'] = $admin['username'];
            
            // Обновляем время последнего входа
            $updateSql = "UPDATE admins SET last_login = NOW() WHERE id = " . $admin['id'];
            $db->query($updateSql);
            
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
            http_response_code(401);
            echo json_encode(['error' => 'Неверный пароль']);
        }
    } else {
        http_response_code(401);
        echo json_encode(['error' => 'Пользователь не найден']);
    }
}
?>