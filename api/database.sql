-- Create Database
CREATE DATABASE IF NOT EXISTS sheiba_arcade;
USE sheiba_arcade;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('customer','admin') NOT NULL DEFAULT 'customer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    image VARCHAR(500),
    newPrice DECIMAL(10, 2) NOT NULL,
    oldPrice DECIMAL(10, 2),
    productCategory VARCHAR(50) NOT NULL,
    productCondition ENUM('new', 'used') NOT NULL DEFAULT 'new',
    stock INT DEFAULT 0,
    stockStatus ENUM('IN_STOCK', 'OUT_OF_STOCK') DEFAULT 'IN_STOCK',
    description TEXT,
    badge VARCHAR(50),
    discount VARCHAR(50),
    shipping VARCHAR(100),
    delivery VARCHAR(100),
    returnPolicy VARCHAR(200),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

DROP TABLE IF EXISTS product_images;

-- Insert sample data
INSERT INTO users (username, email, password, role) VALUES
    ('admin', 'admin@sheibaarcade.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');
-- Password is: password