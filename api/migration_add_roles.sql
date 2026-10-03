-- Run ONCE on your existing database (phpMyAdmin > SQL tab).
-- Adds a role to every account and marks the existing 'admin' user as the administrator.
-- Everyone who signs up from the website is automatically a 'customer'.

ALTER TABLE users
    ADD COLUMN role ENUM('customer','admin') NOT NULL DEFAULT 'customer' AFTER password;

UPDATE users SET role = 'admin' WHERE username = 'admin';
