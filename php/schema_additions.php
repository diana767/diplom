<?php
/**
 * Дополнительные таблицы для чата, портфолио и переносов записей.
 * Файл можно подключать из любого php/api или php/admin скрипта.
 */
function projectTextContains($haystack, $needle) {
    $haystack = (string)$haystack;
    $needle = (string)$needle;
    if (function_exists('mb_stripos')) {
        return mb_stripos($haystack, $needle, 0, 'UTF-8') !== false;
    }
    return stripos($haystack, $needle) !== false;
}

function ensureProjectAdditions($db) {
    static $done = false;
    if ($done) return;


    $db->query("CREATE TABLE IF NOT EXISTS clients (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        phone VARCHAR(32) NOT NULL,
        full_name VARCHAR(120) NOT NULL DEFAULT '',
        email VARCHAR(190) NULL,
        birth_date DATE NULL,
        notes VARCHAR(500) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_clients_phone (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS contact_messages (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(64) NOT NULL,
        email VARCHAR(255) NULL,
        message TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_contact_messages_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS chat_messages (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        contact_message_id INT UNSIGNED NULL,
        booking_id INT UNSIGNED NULL,
        sender_type VARCHAR(16) NOT NULL DEFAULT 'client',
        sender_name VARCHAR(255) NULL,
        phone VARCHAR(64) NULL,
        message TEXT NOT NULL,
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_chat_contact (contact_message_id),
        KEY idx_chat_phone (phone),
        KEY idx_chat_created (created_at),
        CONSTRAINT fk_chat_contact FOREIGN KEY (contact_message_id) REFERENCES contact_messages(id)
            ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_chat_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
            ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS master_portfolio (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        master_id INT UNSIGNED NOT NULL,
        image VARCHAR(255) NOT NULL,
        title VARCHAR(255) NULL,
        description TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_master_portfolio_image (master_id, image),
        KEY idx_portfolio_master (master_id),
        CONSTRAINT fk_portfolio_master FOREIGN KEY (master_id) REFERENCES masters(id)
            ON UPDATE CASCADE ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $db->query("CREATE TABLE IF NOT EXISTS booking_transfer_requests (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        booking_id INT UNSIGNED NOT NULL,
        old_master_id INT UNSIGNED NULL,
        proposed_master_id INT UNSIGNED NULL,
        proposed_date DATE NOT NULL,
        proposed_time VARCHAR(16) NOT NULL,
        admin_message TEXT NULL,
        client_response TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        responded_at DATETIME NULL,
        PRIMARY KEY (id),
        KEY idx_transfer_booking (booking_id),
        KEY idx_transfer_status (status),
        CONSTRAINT fk_transfer_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
            ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT fk_transfer_old_master FOREIGN KEY (old_master_id) REFERENCES masters(id)
            ON UPDATE CASCADE ON DELETE SET NULL,
        CONSTRAINT fk_transfer_new_master FOREIGN KEY (proposed_master_id) REFERENCES masters(id)
            ON UPDATE CASCADE ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Добавляем связь уведомления с предложением переноса, если колонки ещё нет.
    $col = $db->query("SHOW COLUMNS FROM notifications LIKE 'transfer_request_id'");
    if ($col && $col->num_rows === 0) {
        $db->query("ALTER TABLE notifications ADD COLUMN transfer_request_id INT UNSIGNED NULL AFTER booking_id");
        $db->query("ALTER TABLE notifications ADD KEY idx_notifications_transfer_request (transfer_request_id)");
    }

    // Сидируем фото работ мастеров, чтобы кнопка «Посмотреть работы» сразу что-то показывала.
    $cntRes = $db->query("SELECT COUNT(*) AS c FROM master_portfolio");
    $cntRow = $cntRes->fetch_assoc();
    if ((int)($cntRow['c'] ?? 0) === 0) {
        $mastersRes = $db->query("SELECT id, name, specialization FROM masters ORDER BY id");
        while ($m = $mastersRes->fetch_assoc()) {
            $name = (string)($m['name'] ?? '');
            $spec = (string)($m['specialization'] ?? '');
            $items = [];

            if (projectTextContains($spec, 'ресниц')) {
                $items = [
                    ['portfolio_lashes_1.jpg', 'Наращивание ресниц', 'Аккуратная работа с изгибом'],
                    ['portfolio_lashes_2.webp', 'Объём и плотность', 'Пример готовой работы']
                ];
            } elseif (projectTextContains($spec, 'маник') || projectTextContains($name, 'Мария') || projectTextContains($name, 'Екатерина Иванова')) {
                $items = [
                    ['portfolio_manicure_1.jpg', 'Дизайн ногтей', 'Контрастный дизайн'],
                    ['portfolio_manicure_2.jpg', 'Нежный маникюр', 'Минималистичное покрытие']
                ];
            } elseif (projectTextContains($spec, 'визаж') || projectTextContains($name, 'Петрова')) {
                $items = [
                    ['portfolio_makeup_1.jpg', 'Вечерний макияж', 'Готовый образ'],
                    ['portfolio_makeup_2.webp', 'Преображение', 'Работа до / после']
                ];
            } else {
                $items = [
                    ['portfolio_hair_1.jpg', 'Окрашивание волос', 'Холодный блонд'],
                    ['portfolio_hair_2.jpg', 'Сложное окрашивание', 'Пример работы мастера']
                ];
            }

            foreach ($items as $item) {
                $db->query("INSERT INTO master_portfolio (master_id, image, title, description, created_at)
                    VALUES (".(int)$m['id'].", '".$db->escape($item[0])."', '".$db->escape($item[1])."', '".$db->escape($item[2])."', NOW())
                    ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description)");
            }
        }
    }


    $db->query("CREATE TABLE IF NOT EXISTS gift_certificates (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        code VARCHAR(32) NOT NULL,
        amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
        recipient_name VARCHAR(255) NOT NULL,
        sender_name VARCHAR(255) NULL,
        buyer_phone VARCHAR(64) NULL,
        buyer_email VARCHAR(255) NULL,
        card_last4 VARCHAR(4) NULL,
        payment_demo_status VARCHAR(32) NOT NULL DEFAULT 'paid_demo',
        paid_at DATETIME NULL,
        message TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME NULL,
        PRIMARY KEY (id),
        UNIQUE KEY uq_gift_code (code),
        KEY idx_gift_status (status),
        KEY idx_gift_buyer_phone (buyer_phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");



    // Если таблица сертификатов была создана раньше, добавляем новые поля для демонстрационной оплаты.
    $giftCols = [
        'buyer_email' => "ALTER TABLE gift_certificates ADD COLUMN buyer_email VARCHAR(255) NULL AFTER buyer_phone",
        'card_last4' => "ALTER TABLE gift_certificates ADD COLUMN card_last4 VARCHAR(4) NULL AFTER buyer_email",
        'payment_demo_status' => "ALTER TABLE gift_certificates ADD COLUMN payment_demo_status VARCHAR(32) NOT NULL DEFAULT 'paid_demo' AFTER card_last4",
        'paid_at' => "ALTER TABLE gift_certificates ADD COLUMN paid_at DATETIME NULL AFTER payment_demo_status"
    ];
    foreach ($giftCols as $colName => $alterSql) {
        $colRes = $db->query("SHOW COLUMNS FROM gift_certificates LIKE '".$db->escape($colName)."'");
        if ($colRes && $colRes->num_rows === 0) {
            $db->query($alterSql);
        }
    }

    $done = true;
}
?>
