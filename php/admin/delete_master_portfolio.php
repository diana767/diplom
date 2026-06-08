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
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $id = isset($input['id']) ? (int)$input['id'] : 0;
    if ($id <= 0) throw new Exception('Некорректный ID работы');

    $db = new Database();
    ensureProjectAdditions($db);

    $res = $db->query("SELECT image FROM master_portfolio WHERE id = $id LIMIT 1");
    $row = $res->fetch_assoc();
    if (!$row) throw new Exception('Работа не найдена');

    $db->query("DELETE FROM master_portfolio WHERE id = $id");

    // Удаляем только загруженные через админку файлы, базовые демо-фото не трогаем.
    $image = (string)$row['image'];
    if (strpos($image, 'portfolio_uploads/') === 0) {
        $full = realpath(__DIR__ . '/../../images/' . $image);
        $base = realpath(__DIR__ . '/../../images/portfolio_uploads');
        if ($full && $base && strpos($full, $base) === 0 && is_file($full)) {
            @unlink($full);
        }
    }

    echo json_encode(['success' => true, 'message' => 'Работа удалена из портфолио'], JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(200);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
?>
