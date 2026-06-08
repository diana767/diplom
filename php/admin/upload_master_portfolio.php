<?php
require_once '../config.php';
require_once '../database.php';
require_once '../schema_additions.php';

header('Content-Type: application/json; charset=utf-8');

if (!isset($_SESSION['admin_logged_in']) || $_SESSION['admin_logged_in'] !== true) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Не авторизован'], JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Метод не поддерживается'], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $masterId = isset($_POST['master_id']) ? (int)$_POST['master_id'] : 0;
    $title = trim((string)($_POST['title'] ?? ''));
    $description = trim((string)($_POST['description'] ?? ''));

    if ($masterId <= 0) throw new Exception('Некорректный ID мастера');
    if ($title === '') $title = 'Работа мастера';

    if (empty($_FILES['image']) || $_FILES['image']['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Выберите изображение для загрузки');
    }

    $file = $_FILES['image'];
    if ($file['size'] > 5 * 1024 * 1024) {
        throw new Exception('Файл слишком большой. Максимум 5 МБ');
    }

    $allowedExt = ['jpg', 'jpeg', 'png', 'webp'];
    $originalName = (string)$file['name'];
    $ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
    if (!in_array($ext, $allowedExt, true)) {
        throw new Exception('Разрешены только изображения JPG, PNG или WEBP');
    }

    $imageInfo = @getimagesize($file['tmp_name']);
    if (!$imageInfo) {
        throw new Exception('Загруженный файл не является изображением');
    }

    $db = new Database();
    ensureProjectAdditions($db);

    $masterRes = $db->query("SELECT id FROM masters WHERE id = $masterId LIMIT 1");
    if ($masterRes->num_rows === 0) {
        throw new Exception('Мастер не найден');
    }

    $uploadDir = realpath(__DIR__ . '/../../images');
    if (!$uploadDir) throw new Exception('Папка images не найдена');
    $targetDir = $uploadDir . DIRECTORY_SEPARATOR . 'portfolio_uploads';
    if (!is_dir($targetDir)) {
        mkdir($targetDir, 0775, true);
    }

    $fileName = 'portfolio_' . $masterId . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(3)) . '.' . $ext;
    $targetPath = $targetDir . DIRECTORY_SEPARATOR . $fileName;
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        throw new Exception('Не удалось сохранить файл');
    }

    $relative = 'portfolio_uploads/' . $fileName;
    $db->query("INSERT INTO master_portfolio (master_id, image, title, description, created_at)
                VALUES ($masterId, '".$db->escape($relative)."', '".$db->escape($title)."', '".$db->escape($description)."', NOW())");

    echo json_encode([
        'success' => true,
        'message' => 'Работа добавлена в портфолио мастера',
        'data' => [
            'id' => $db->getLastId(),
            'master_id' => $masterId,
            'image' => $relative,
            'title' => $title,
            'description' => $description
        ]
    ], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
