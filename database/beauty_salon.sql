-- Beauty Salon "Элегант" - MySQL 
--
-- Админ по умолчанию:
--   логин: admin
--   пароль: admin123

CREATE DATABASE IF NOT EXISTS beauty_salon
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE beauty_salon;

SET NAMES utf8mb4;

-- =====================
-- Администраторы
-- =====================
CREATE TABLE IF NOT EXISTS admins (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username VARCHAR(64) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NULL,
  last_login DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_admins_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- Услуги
-- =====================
CREATE TABLE IF NOT EXISTS services (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(255) NOT NULL,
  description TEXT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  duration_minutes INT UNSIGNED NOT NULL DEFAULT 60,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_services_category (category),
  KEY idx_services_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- Мастера
-- =====================
CREATE TABLE IF NOT EXISTS masters (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  specialization VARCHAR(255) NOT NULL,
  experience_years INT UNSIGNED NOT NULL DEFAULT 0,
  bio TEXT NULL,
  photo VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  working_hours JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_masters_specialization (specialization),
  KEY idx_masters_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- Связь мастера и услуг 
-- =====================
CREATE TABLE IF NOT EXISTS master_services (
  master_id INT UNSIGNED NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (master_id, service_id),
  CONSTRAINT fk_ms_master FOREIGN KEY (master_id) REFERENCES masters(id)
    ON UPDATE CASCADE ON DELETE CASCADE,
  CONSTRAINT fk_ms_service FOREIGN KEY (service_id) REFERENCES services(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- Записи
-- =====================
CREATE TABLE IF NOT EXISTS bookings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  client_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  service_id INT UNSIGNED NOT NULL,
  master_id INT UNSIGNED NULL,
  desired_date DATE NOT NULL,
  desired_time VARCHAR(16) NOT NULL,
  comment TEXT NULL,
  package_info JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'new',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_bookings_date (desired_date),
  KEY idx_bookings_status (status),
  KEY idx_bookings_phone (phone),
  UNIQUE KEY uq_master_date_time (master_id, desired_date, desired_time),
  CONSTRAINT fk_bookings_service FOREIGN KEY (service_id) REFERENCES services(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_bookings_master FOREIGN KEY (master_id) REFERENCES masters(id)
    ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- Настройки салона
-- =====================
CREATE TABLE IF NOT EXISTS settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  salon_name VARCHAR(255) NOT NULL,
  salon_phone VARCHAR(64) NOT NULL,
  salon_address VARCHAR(255) NULL,
  working_hours VARCHAR(255) NULL,
  booking_rules JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- Уведомления
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  booking_id INT UNSIGNED NOT NULL,
  transfer_request_id INT UNSIGNED NULL,
  client_name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(32) NOT NULL DEFAULT 'admin',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  read_at DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_notifications_phone (phone),
  KEY idx_notifications_transfer_request (transfer_request_id),
  KEY idx_notifications_read (is_read),
  CONSTRAINT fk_notifications_booking FOREIGN KEY (booking_id) REFERENCES bookings(id)
    ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE IF NOT EXISTS contact_messages (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  email VARCHAR(255) NULL,
  message TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contact_messages_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================
-- Демо-данные
-- =====================

-- admin/admin123
INSERT INTO admins (username, password_hash, full_name)
VALUES ('admin', '$2y$10$PrOKjXToW6YmhILujEtOe.HJIVFpQg/AkSDE2VuhsW1wlvMXqNbV6', 'Администратор')
ON DUPLICATE KEY UPDATE username = username;

INSERT INTO settings (salon_name, salon_phone, salon_address, working_hours, booking_rules)
SELECT * FROM (
  SELECT
    'Элегант' AS salon_name,
    '+7 (999) 123-45-67' AS salon_phone,
    'г. Екатеринбург, ул. Ленина, 50' AS salon_address,
    'Пн-Пт: 9:00-21:00, Сб-Вс: 10:00-20:00' AS working_hours,
    JSON_OBJECT(
      'slot_step_minutes', 30,
      'min_advance_hours', 2,
      'max_days_ahead', 30
    ) AS booking_rules
) AS tmp
WHERE NOT EXISTS (SELECT 1 FROM settings LIMIT 1);

INSERT INTO services (name, category, description, price, duration_minutes, is_active) VALUES
('Женская стрижка', 'Парикмахерские', 'Стрижка + укладка по форме лица и типу волос.', 1800.00, 60, 1),
('Мужская стрижка', 'Парикмахерские', 'Классическая или современная техника.', 1200.00, 45, 1),
('Окрашивание волос', 'Парикмахерские', 'Подбор оттенка, тонирование, уход.', 4500.00, 120, 1),
('Маникюр классический', 'Ногтевой сервис', 'Обработка кутикулы, форма, покрытие по желанию.', 1200.00, 60, 1),
('Покрытие гель-лак', 'Ногтевой сервис', 'Стойкое покрытие, выравнивание, дизайн (прост.).', 1700.00, 75, 1),
('Массаж лица', 'Косметология', 'Лифтинг-массаж и расслабление.', 2200.00, 60, 1),
('Коррекция и окрашивание бровей', 'Визаж', 'Подбор формы и цвета.', 1400.00, 45, 1)
,
('Наращивание ресниц', 'Ресницы', 'Классическое или 2D/3D наращивание по типу глаз.', 2500.00, 120, 1)
;

INSERT INTO masters (name, specialization, experience_years, bio, photo, is_active, working_hours) VALUES
('Анна Смирнова', 'Парикмахер-стилист', 7, 'Создаю стрижки и окрашивания, которые подчеркивают индивидуальность.', 'master1.jpg', 1, JSON_OBJECT('mon','09:00-21:00','tue','09:00-21:00','wed','09:00-21:00','thu','09:00-21:00','fri','09:00-21:00','sat','10:00-20:00','sun','10:00-20:00')),
('Мария Иванова', 'Мастер маникюра', 5, 'Аккуратный маникюр, ровное покрытие и идеи дизайна под настроение.', 'master2.jpg', 1, JSON_OBJECT('mon','09:00-21:00','tue','09:00-21:00','wed','09:00-21:00','thu','09:00-21:00','fri','09:00-21:00','sat','10:00-20:00','sun','10:00-20:00')),
('Екатерина Петрова', 'Визажист', 6, 'Естественные и вечерние образы, оформление бровей.', 'master3.jpg', 1, JSON_OBJECT('mon','10:00-20:00','tue','10:00-20:00','wed','10:00-20:00','thu','10:00-20:00','fri','10:00-20:00','sat','10:00-20:00','sun','10:00-20:00'))
,
('Ольга Кузнецова', 'Мастер по наращиванию ресниц', 4, 'Наращивание ресниц, подбор эффекта и изгиба, аккуратная носка.', 'master4.jpg', 1, JSON_OBJECT('mon','10:00-20:00','tue','10:00-20:00','wed','10:00-20:00','thu','10:00-20:00','fri','10:00-20:00','sat','10:00-20:00','sun','10:00-20:00'))
;

-- Связи мастер-услуга (demo)
INSERT INTO master_services (master_id, service_id) VALUES
(1,1),(1,2),(1,3),
(2,4),(2,5),
(3,7),
(4,8)
;



INSERT INTO contact_messages (name, phone, email, message, created_at) VALUES
('Алина', '+7 (999) 101-10-10', 'alina@example.com', 'Здравствуйте! Подскажите, есть ли запись на вечер пятницы?', NOW() - INTERVAL 2 DAY),
('Светлана', '+7 (999) 202-20-20', 'sveta@example.com', 'Хочу уточнить, какой уход лучше после окрашивания.', NOW() - INTERVAL 1 DAY);

UPDATE bookings SET status='confirmed' WHERE id IN (1,2,3);


-- =====================
-- ДОРАБОТКА: реальный чат, портфолио мастеров, переносы записей
-- =====================
CREATE TABLE IF NOT EXISTS chat_messages (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS master_portfolio (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_transfer_requests (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Если база уже создана старой версией, добавьте колонку один раз вручную:
-- ALTER TABLE notifications ADD COLUMN transfer_request_id INT UNSIGNED NULL AFTER booking_id;
-- ALTER TABLE notifications ADD KEY idx_notifications_transfer_request (transfer_request_id);

INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_hair_1.jpg', 'Окрашивание волос', 'Холодный блонд' FROM masters WHERE name LIKE '%Анна%'
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);
INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_hair_2.jpg', 'Сложное окрашивание', 'Пример работы мастера' FROM masters WHERE name LIKE '%Анна%'
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_manicure_1.jpg', 'Дизайн ногтей', 'Контрастный дизайн' FROM masters WHERE specialization LIKE '%маник%'
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);
INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_manicure_2.jpg', 'Нежный маникюр', 'Минималистичное покрытие' FROM masters WHERE specialization LIKE '%маник%'
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_makeup_1.jpg', 'Вечерний макияж', 'Готовый образ' FROM masters WHERE specialization LIKE '%визаж%'
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);
INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_makeup_2.webp', 'Преображение', 'Работа до / после' FROM masters WHERE specialization LIKE '%визаж%'
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_lashes_1.jpg', 'Наращивание ресниц', 'Аккуратная работа с изгибом' FROM masters WHERE specialization LIKE '%ресниц%'
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);
INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_lashes_2.webp', 'Объём и плотность', 'Пример готовой работы' FROM masters WHERE specialization LIKE '%ресниц%'
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

INSERT INTO chat_messages (contact_message_id, sender_type, sender_name, phone, message, is_read, created_at)
SELECT id, 'client', name, phone, message, 0, created_at FROM contact_messages cm
WHERE NOT EXISTS (SELECT 1 FROM chat_messages ch WHERE ch.contact_message_id = cm.id);


-- =====================
-- ДОРАБОТКА: подарочные сертификаты
-- =====================
CREATE TABLE IF NOT EXISTS gift_certificates (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- =====================
-- ДОРАБОТКА 2026-06-06: больше мастеров, управление портфолио, демо-оплата сертификатов
-- =====================

-- Дополнительные услуги, чтобы у каждого направления было минимум по 2 мастера
INSERT INTO services (name, category, description, price, duration_minutes, is_active)
SELECT 'Вечерний макияж', 'Визаж', 'Стойкий вечерний макияж для мероприятия или фотосессии.', 2800.00, 75, 1
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Вечерний макияж');

INSERT INTO services (name, category, description, price, duration_minutes, is_active)
SELECT 'Ламинирование ресниц', 'Ресницы', 'Ламинирование, окрашивание и уход для натуральных ресниц.', 1800.00, 60, 1
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Ламинирование ресниц');

INSERT INTO services (name, category, description, price, duration_minutes, is_active)
SELECT 'Педикюр', 'Ногтевой сервис', 'Аккуратный педикюр с обработкой стоп и покрытием.', 2200.00, 90, 1
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Педикюр');

INSERT INTO services (name, category, description, price, duration_minutes, is_active)
SELECT 'Чистка лица', 'Косметология', 'Комбинированная чистка лица и базовый уход.', 3000.00, 90, 1
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Чистка лица');

INSERT INTO services (name, category, description, price, duration_minutes, is_active)
SELECT 'Ламинирование бровей', 'Визаж', 'Долговременная укладка и оформление бровей.', 1700.00, 50, 1
WHERE NOT EXISTS (SELECT 1 FROM services WHERE name = 'Ламинирование бровей');

-- Новые мастера. Фото master5-master8 — загруженные вами изображения.
INSERT INTO masters (name, specialization, experience_years, bio, photo, is_active, working_hours)
SELECT 'Диана Орлова', 'Парикмахер-колорист', 6, 'Сложные окрашивания, блонд, восстановление волос и подбор формы стрижки.', 'master5.webp', 1, JSON_OBJECT('mon','09:00-21:00','tue','09:00-21:00','wed','09:00-21:00','thu','09:00-21:00','fri','09:00-21:00','sat','10:00-20:00','sun','10:00-20:00')
WHERE NOT EXISTS (SELECT 1 FROM masters WHERE name = 'Диана Орлова');

INSERT INTO masters (name, specialization, experience_years, bio, photo, is_active, working_hours)
SELECT 'Виктория Соколова', 'Парикмахер-стилист', 8, 'Женские и мужские стрижки, укладки, окрашивания и уходовые процедуры.', 'master6.webp', 1, JSON_OBJECT('mon','10:00-20:00','tue','10:00-20:00','wed','10:00-20:00','thu','10:00-20:00','fri','10:00-20:00','sat','10:00-20:00','sun','10:00-20:00')
WHERE NOT EXISTS (SELECT 1 FROM masters WHERE name = 'Виктория Соколова');

INSERT INTO masters (name, specialization, experience_years, bio, photo, is_active, working_hours)
SELECT 'Алина Белова', 'Мастер маникюра', 4, 'Маникюр, гель-лак, укрепление, дизайн и аккуратная обработка кутикулы.', 'master7.jpg', 1, JSON_OBJECT('mon','09:00-21:00','tue','09:00-21:00','wed','09:00-21:00','thu','09:00-21:00','fri','09:00-21:00','sat','10:00-20:00','sun','10:00-20:00')
WHERE NOT EXISTS (SELECT 1 FROM masters WHERE name = 'Алина Белова');

INSERT INTO masters (name, specialization, experience_years, bio, photo, is_active, working_hours)
SELECT 'Юлия Морозова', 'Мастер маникюра и педикюра', 7, 'Маникюр, педикюр, нюдовые покрытия, укрепление и быстрый салонный дизайн.', 'master8.png', 1, JSON_OBJECT('mon','10:00-20:00','tue','10:00-20:00','wed','10:00-20:00','thu','10:00-20:00','fri','10:00-20:00','sat','10:00-20:00','sun','10:00-20:00')
WHERE NOT EXISTS (SELECT 1 FROM masters WHERE name = 'Юлия Морозова');

INSERT INTO masters (name, specialization, experience_years, bio, photo, is_active, working_hours)
SELECT 'Полина Волкова', 'Лэшмейкер', 5, 'Классика, 2D/3D, натуральные эффекты и комфортная носка ресниц.', 'master4.jpg', 1, JSON_OBJECT('mon','10:00-20:00','tue','10:00-20:00','wed','10:00-20:00','thu','10:00-20:00','fri','10:00-20:00','sat','10:00-20:00','sun','10:00-20:00')
WHERE NOT EXISTS (SELECT 1 FROM masters WHERE name = 'Полина Волкова');

INSERT INTO masters (name, specialization, experience_years, bio, photo, is_active, working_hours)
SELECT 'Наталья Ким', 'Мастер по ресницам и бровям', 6, 'Ламинирование ресниц, наращивание, оформление и окрашивание бровей.', 'master3.jpg', 1, JSON_OBJECT('mon','09:00-21:00','tue','09:00-21:00','wed','09:00-21:00','thu','09:00-21:00','fri','09:00-21:00','sat','10:00-20:00','sun','10:00-20:00')
WHERE NOT EXISTS (SELECT 1 FROM masters WHERE name = 'Наталья Ким');

INSERT INTO masters (name, specialization, experience_years, bio, photo, is_active, working_hours)
SELECT 'София Романова', 'Визажист-бровист', 5, 'Макияж, оформление бровей, ламинирование и подбор образа под событие.', 'master2.jpg', 1, JSON_OBJECT('mon','10:00-20:00','tue','10:00-20:00','wed','10:00-20:00','thu','10:00-20:00','fri','10:00-20:00','sat','10:00-20:00','sun','10:00-20:00')
WHERE NOT EXISTS (SELECT 1 FROM masters WHERE name = 'София Романова');

INSERT INTO masters (name, specialization, experience_years, bio, photo, is_active, working_hours)
SELECT 'Дарья Сергеева', 'Косметолог', 9, 'Массаж лица, чистка, уходовые программы и рекомендации по домашнему уходу.', 'master1.jpg', 1, JSON_OBJECT('mon','09:00-19:00','tue','09:00-19:00','wed','09:00-19:00','thu','09:00-19:00','fri','09:00-19:00','sat','10:00-18:00','sun','10:00-18:00')
WHERE NOT EXISTS (SELECT 1 FROM masters WHERE name = 'Дарья Сергеева');

-- Связи новых мастеров с услугами
INSERT IGNORE INTO master_services (master_id, service_id)
SELECT m.id, s.id FROM masters m JOIN services s ON s.name IN ('Женская стрижка','Мужская стрижка','Окрашивание волос')
WHERE m.name IN ('Анна Смирнова','Диана Орлова','Виктория Соколова');

INSERT IGNORE INTO master_services (master_id, service_id)
SELECT m.id, s.id FROM masters m JOIN services s ON s.name IN ('Маникюр классический','Покрытие гель-лак','Педикюр')
WHERE m.name IN ('Мария Иванова','Алина Белова','Юлия Морозова');

INSERT IGNORE INTO master_services (master_id, service_id)
SELECT m.id, s.id FROM masters m JOIN services s ON s.name IN ('Наращивание ресниц','Ламинирование ресниц')
WHERE m.name IN ('Ольга Кузнецова','Полина Волкова','Наталья Ким');

INSERT IGNORE INTO master_services (master_id, service_id)
SELECT m.id, s.id FROM masters m JOIN services s ON s.name IN ('Коррекция и окрашивание бровей','Вечерний макияж','Ламинирование бровей')
WHERE m.name IN ('Екатерина Петрова','София Романова','Наталья Ким');

INSERT IGNORE INTO master_services (master_id, service_id)
SELECT m.id, s.id FROM masters m JOIN services s ON s.name IN ('Массаж лица','Чистка лица')
WHERE m.name IN ('Дарья Сергеева');

-- Базовое портфолио для новых мастеров
INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_hair_1.jpg', 'Окрашивание и укладка', 'Пример работы парикмахера' FROM masters WHERE name IN ('Диана Орлова','Виктория Соколова')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);
INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_hair_2.jpg', 'Сложное окрашивание', 'Мягкий переход оттенков' FROM masters WHERE name IN ('Диана Орлова','Виктория Соколова')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_manicure_1.jpg', 'Дизайн ногтей', 'Аккуратное покрытие' FROM masters WHERE name IN ('Алина Белова','Юлия Морозова')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);
INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_manicure_2.jpg', 'Нюдовый маникюр', 'Минималистичный дизайн' FROM masters WHERE name IN ('Алина Белова','Юлия Морозова')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_lashes_1.jpg', 'Наращивание ресниц', 'Натуральный эффект' FROM masters WHERE name IN ('Полина Волкова','Наталья Ким')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);
INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_lashes_2.webp', 'Объёмные ресницы', 'Выразительный взгляд' FROM masters WHERE name IN ('Полина Волкова','Наталья Ким')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_makeup_1.jpg', 'Вечерний образ', 'Макияж для события' FROM masters WHERE name IN ('София Романова')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);
INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_makeup_2.webp', 'Преображение', 'Образ до / после' FROM masters WHERE name IN ('София Романова')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);

INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_makeup_1.jpg', 'Уходовая процедура', 'Демонстрационное фото работы' FROM masters WHERE name IN ('Дарья Сергеева')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);
INSERT INTO master_portfolio (master_id, image, title, description)
SELECT id, 'portfolio_hair_1.jpg', 'Результат ухода', 'Демонстрационное фото процедуры' FROM masters WHERE name IN ('Дарья Сергеева')
ON DUPLICATE KEY UPDATE title = VALUES(title), description = VALUES(description);


-- Профили клиентов
CREATE TABLE IF NOT EXISTS clients (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
