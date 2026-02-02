-- ===========================================
-- Database Schema untuk Sistem Presensi
-- PT Lestari Bumi Persada
-- ===========================================

-- Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS zdevwnff_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE zdevwnff_db;

-- ===========================================
-- Tabel Users (Karyawan & Admin)
-- ===========================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    role ENUM('employee', 'admin') NOT NULL DEFAULT 'employee',
    department VARCHAR(100) NOT NULL,
    position VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_username (username),
    INDEX idx_role (role),
    INDEX idx_department (department),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- Tabel Attendance Records (Rekaman Kehadiran)
-- ===========================================
CREATE TABLE IF NOT EXISTS attendance_records (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,

    -- Check In Data
    check_in_time TIME,
    check_in_photo LONGTEXT,
    check_in_latitude DECIMAL(10, 8),
    check_in_longitude DECIMAL(11, 8),
    check_in_address TEXT,

    -- Check Out Data
    check_out_time TIME,
    check_out_photo LONGTEXT,
    check_out_latitude DECIMAL(10, 8),
    check_out_longitude DECIMAL(11, 8),
    check_out_address TEXT,

    -- Status & Calculations
    status ENUM('present', 'late', 'absent', 'holiday') NOT NULL DEFAULT 'present',
    work_hours DECIMAL(5, 2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_user_id (user_id),
    INDEX idx_date (date),
    INDEX idx_status (status),
    INDEX idx_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- Tabel Overtime Records (Rekaman Lembur)
-- ===========================================
CREATE TABLE IF NOT EXISTS overtime_records (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME,
    duration DECIMAL(5, 2) DEFAULT 0,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    approved_by VARCHAR(50),
    approved_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_date (date),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- Tabel Work Schedules (Jadwal Kerja)
-- ===========================================
CREATE TABLE IF NOT EXISTS work_schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day_of_week TINYINT NOT NULL UNIQUE CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    min_work_hours DECIMAL(4, 2) NOT NULL DEFAULT 8.00,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_day_of_week (day_of_week)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- Tabel Holidays (Hari Libur)
-- ===========================================
CREATE TABLE IF NOT EXISTS holidays (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_date (date),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- Tabel Sessions (Sesi Login)
-- ===========================================
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================================
-- Insert Default Data
-- ===========================================

-- Default Admin User (password akan di-hash oleh aplikasi)
INSERT INTO users (id, username, password, name, role, department, position, email, phone)
VALUES
    ('admin-001', 'admin', '$2b$12$defaultHashedPasswordHere', 'Administrator HR', 'admin', 'Human Resources', 'HR Manager', 'admin@lestaribumi.co.id', '081234567890')
ON DUPLICATE KEY UPDATE id = id;

-- Default Employees
INSERT INTO users (id, username, password, name, role, department, position, email, phone)
VALUES
    ('emp-001', 'budi', '$2b$12$defaultHashedPasswordHere', 'Budi Santoso', 'employee', 'Operations', 'Field Supervisor', 'budi@lestaribumi.co.id', '081234567891'),
    ('emp-002', 'siti', '$2b$12$defaultHashedPasswordHere', 'Siti Rahayu', 'employee', 'Operations', 'Field Staff', 'siti@lestaribumi.co.id', '081234567892'),
    ('emp-003', 'agus', '$2b$12$defaultHashedPasswordHere', 'Agus Wijaya', 'employee', 'Engineering', 'Technician', 'agus@lestaribumi.co.id', '081234567893')
ON DUPLICATE KEY UPDATE id = id;

-- Default Work Schedules
INSERT INTO work_schedules (day_of_week, start_time, end_time, min_work_hours)
VALUES
    (0, '08:00:00', '16:00:00', 8.00),  -- Sunday
    (1, '08:00:00', '16:00:00', 8.00),  -- Monday
    (2, '08:00:00', '16:00:00', 8.00),  -- Tuesday
    (3, '08:00:00', '16:00:00', 8.00),  -- Wednesday
    (4, '08:00:00', '16:00:00', 8.00),  -- Thursday
    (5, '08:00:00', '16:00:00', 8.00),  -- Friday
    (6, '08:00:00', '13:00:00', 5.00)   -- Saturday
ON DUPLICATE KEY UPDATE day_of_week = day_of_week;

-- Default Holidays 2026
INSERT INTO holidays (date, name)
VALUES
    ('2026-01-01', 'Tahun Baru'),
    ('2026-01-29', 'Tahun Baru Imlek'),
    ('2026-03-20', 'Hari Raya Nyepi'),
    ('2026-03-31', 'Wafat Isa Al-Masih'),
    ('2026-04-03', 'Isra Mi''raj'),
    ('2026-05-01', 'Hari Buruh'),
    ('2026-05-13', 'Kenaikan Isa Al-Masih'),
    ('2026-05-14', 'Idul Fitri'),
    ('2026-05-15', 'Idul Fitri'),
    ('2026-06-01', 'Hari Lahir Pancasila'),
    ('2026-07-21', 'Idul Adha'),
    ('2026-08-11', 'Tahun Baru Islam'),
    ('2026-08-17', 'Hari Kemerdekaan'),
    ('2026-10-20', 'Maulid Nabi'),
    ('2026-12-25', 'Natal')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- ===========================================
-- Views untuk Reporting
-- ===========================================

-- View: Daily Attendance Summary
CREATE OR REPLACE VIEW v_daily_attendance AS
SELECT
    ar.date,
    u.id AS user_id,
    u.name AS user_name,
    u.department,
    ar.check_in_time,
    ar.check_out_time,
    ar.status,
    ar.work_hours
FROM attendance_records ar
JOIN users u ON ar.user_id = u.id
WHERE u.is_active = TRUE
ORDER BY ar.date DESC, u.name;

-- View: Monthly Attendance Stats
CREATE OR REPLACE VIEW v_monthly_stats AS
SELECT
    u.id AS user_id,
    u.name AS user_name,
    u.department,
    YEAR(ar.date) AS year,
    MONTH(ar.date) AS month,
    COUNT(CASE WHEN ar.status = 'present' THEN 1 END) AS present_count,
    COUNT(CASE WHEN ar.status = 'late' THEN 1 END) AS late_count,
    COUNT(CASE WHEN ar.status = 'absent' THEN 1 END) AS absent_count,
    SUM(ar.work_hours) AS total_work_hours
FROM users u
LEFT JOIN attendance_records ar ON u.id = ar.user_id
WHERE u.is_active = TRUE
GROUP BY u.id, u.name, u.department, YEAR(ar.date), MONTH(ar.date);

-- ===========================================
-- Stored Procedures
-- ===========================================

DELIMITER //

-- Procedure: Clean expired sessions
CREATE PROCEDURE IF NOT EXISTS sp_clean_expired_sessions()
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
END //

-- Procedure: Get attendance stats for a user
CREATE PROCEDURE IF NOT EXISTS sp_get_user_attendance_stats(
    IN p_user_id VARCHAR(50),
    IN p_month INT,
    IN p_year INT
)
BEGIN
    SELECT
        COUNT(CASE WHEN status = 'present' THEN 1 END) AS present,
        COUNT(CASE WHEN status = 'late' THEN 1 END) AS late,
        COUNT(CASE WHEN status = 'absent' THEN 1 END) AS absent,
        COALESCE(SUM(work_hours), 0) AS total_work_hours,
        COUNT(*) AS total
    FROM attendance_records
    WHERE user_id = p_user_id
    AND MONTH(date) = p_month
    AND YEAR(date) = p_year;
END //

DELIMITER ;

-- ===========================================
-- Events (untuk scheduled tasks)
-- ===========================================

-- Event: Clean expired sessions daily
CREATE EVENT IF NOT EXISTS evt_clean_sessions
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_DATE + INTERVAL 1 DAY
DO CALL sp_clean_expired_sessions();
