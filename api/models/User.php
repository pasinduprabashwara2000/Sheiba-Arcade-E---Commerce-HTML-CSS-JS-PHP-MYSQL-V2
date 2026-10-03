<?php

class User {

    public $id;
    public $username;
    public $email;
    public $password;
    public $role = 'customer';

    private $conn;
    private $table = "users";

    public function __construct($connection) {
        $this->conn = $connection;
    }

    // Create user
    public function create() {

        // role is always 'customer' here - admins are created directly in the database
        $sql = "INSERT INTO {$this->table} (username, email, password, role)
                VALUES (?, ?, ?, 'customer')";

        $stmt = $this->conn->prepare($sql);

        // hash password HERE (safe)
        $hashedPassword = password_hash($this->password, PASSWORD_DEFAULT);

        $stmt->bind_param("sss",
            $this->username,
            $this->email,
            $hashedPassword
        );

        return $stmt->execute();
    }

    // Get user by username
    public function getByUsername() {

        $sql = "SELECT id, username, email, password, role
                FROM {$this->table}
                WHERE username = ?
                LIMIT 1";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("s", $this->username);
        $stmt->execute();

        $result = $stmt->get_result();

        if ($result && $result->num_rows === 1) {
            return $result->fetch_assoc();
        }

        return false;
    }

    // Check if username exists
    public function usernameExists($username) {

        $sql = "SELECT id FROM {$this->table} WHERE username = ? LIMIT 1";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("s", $username);
        $stmt->execute();

        $result = $stmt->get_result();
        return $result && $result->num_rows > 0;
    }

    // Check if email exists
    public function emailExists($email) {

        $sql = "SELECT id FROM {$this->table} WHERE email = ? LIMIT 1";

        $stmt = $this->conn->prepare($sql);
        $stmt->bind_param("s", $email);
        $stmt->execute();

        $result = $stmt->get_result();
        return $result && $result->num_rows > 0;
    }
}
