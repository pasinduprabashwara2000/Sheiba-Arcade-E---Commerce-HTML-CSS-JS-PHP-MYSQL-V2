<?php
require_once __DIR__ . '/../models/User.php';
require_once __DIR__ . '/../config/auth.php';

class AuthController {

    private $user;

    public function __construct($db) {
        $this->user = new User($db);
    }

    // ======================
    // SIGNUP (customers only)
    // ======================
    public function signup() {

        $data = json_decode(file_get_contents("php://input"), true);

        $username = trim($data['username'] ?? '');
        $email    = trim($data['email'] ?? '');
        $password = (string)($data['password'] ?? '');

        if ($username === '' || $email === '' || $password === '') {
            http_response_code(400);
            echo json_encode(['message' => 'All fields are required']);
            return;
        }
        if (strlen($username) < 3 || strlen($username) > 50 || !preg_match('/^[A-Za-z0-9_]+$/', $username)) {
            http_response_code(400);
            echo json_encode(['message' => 'Username must be 3-50 characters: letters, numbers and underscores only']);
            return;
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 100) {
            http_response_code(400);
            echo json_encode(['message' => 'Please enter a valid email address']);
            return;
        }
        if (strlen($password) < 6) {
            http_response_code(400);
            echo json_encode(['message' => 'Password must be at least 6 characters long']);
            return;
        }

        if ($this->user->usernameExists($username)) {
            http_response_code(409);
            echo json_encode(['message' => 'That username is already taken']);
            return;
        }
        if ($this->user->emailExists($email)) {
            http_response_code(409);
            echo json_encode(['message' => 'An account with that email already exists']);
            return;
        }

        $this->user->username = $username;
        $this->user->email    = $email;
        $this->user->password = $password;

        if (!$this->user->create()) {
            http_response_code(500);
            echo json_encode(['message' => 'Could not create account. Please try again.']);
            return;
        }

        // Sign the new customer in straight away
        $this->user->username = $username;
        $userData = $this->user->getByUsername();
        $this->respondWithSession($userData, 'Account created successfully', 201);
    }

    // ======================
    // LOGIN (customers + admins)
    // ======================
    public function login() {

        $data = json_decode(file_get_contents("php://input"), true);

        if (!$data || empty($data['username']) || empty($data['password'])) {
            http_response_code(400);
            echo json_encode(['message' => 'Username and password required']);
            return;
        }

        $this->user->username = $data['username'];
        $userData = $this->user->getByUsername();

        if (!$userData || !password_verify($data['password'], $userData['password'])) {
            http_response_code(401);
            echo json_encode(['message' => 'Invalid credentials']);
            return;
        }

        $this->respondWithSession($userData, 'Login successful', 200);
    }

    // ======================
    // ME (validate a stored token)
    // ======================
    public function me($db) {
        $data = auth_read_token();
        if (!$data) {
            http_response_code(401);
            echo json_encode(['message' => 'Authentication required']);
            return;
        }

        $stmt = $db->prepare("SELECT id, username, email, role FROM users WHERE id = ? LIMIT 1");
        $stmt->bind_param("i", $data['uid']);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        if (!$row) {
            http_response_code(401);
            echo json_encode(['message' => 'Account no longer exists']);
            return;
        }

        echo json_encode(['user' => $row]);
    }

    private function respondWithSession($userData, $message, $status) {
        $role = $userData['role'] ?? 'customer';
        $user = [
            'id'       => (int)$userData['id'],
            'username' => $userData['username'],
            'email'    => $userData['email'],
            'role'     => $role
        ];

        http_response_code($status);
        echo json_encode([
            'message' => $message,
            'token'   => auth_issue_token($user),
            'user'    => $user
        ]);
    }
}
