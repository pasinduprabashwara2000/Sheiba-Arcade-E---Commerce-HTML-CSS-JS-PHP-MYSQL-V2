<?php
/**
 * Token auth helpers (stateless, HMAC-signed).
 * Token is sent by the frontend in the "X-Auth-Token" header
 * (a custom header is used because many shared hosts strip "Authorization").
 *
 * IMPORTANT: change AUTH_SECRET to your own long random string before deploying.
 * Changing it logs everybody out.
 */
define('AUTH_SECRET', 'd2ca1e47eb50193948b35c2d40736a5bace31b9725b95fd5c89b83cf6199ac51');
define('AUTH_TOKEN_TTL', 60 * 60 * 24 * 7); // 7 days

function auth_b64e($s) { return rtrim(strtr(base64_encode($s), '+/', '-_'), '='); }
function auth_b64d($s) { return base64_decode(strtr($s, '-_', '+/')); }

function auth_issue_token($user) {
    $payload = auth_b64e(json_encode([
        'uid'  => (int)$user['id'],
        'role' => $user['role'],
        'exp'  => time() + AUTH_TOKEN_TTL
    ]));
    $sig = auth_b64e(hash_hmac('sha256', $payload, AUTH_SECRET, true));
    return $payload . '.' . $sig;
}

/** Returns ['uid'=>..,'role'=>..,'exp'=>..] or null if missing/invalid/expired. */
function auth_read_token() {
    $token = $_SERVER['HTTP_X_AUTH_TOKEN'] ?? '';
    if ($token === '' || strpos($token, '.') === false) return null;

    list($payload, $sig) = explode('.', $token, 2);
    $expected = auth_b64e(hash_hmac('sha256', $payload, AUTH_SECRET, true));
    if (!hash_equals($expected, $sig)) return null;

    $data = json_decode(auth_b64d($payload), true);
    if (!is_array($data) || empty($data['uid']) || empty($data['exp']) || $data['exp'] < time()) return null;

    return $data;
}

/**
 * Blocks the request unless a valid ADMIN token is present.
 * The role is re-checked in the database so a demoted/deleted admin loses access immediately.
 */
function auth_require_admin($db) {
    $data = auth_read_token();
    if (!$data) {
        http_response_code(401);
        echo json_encode(['message' => 'Authentication required']);
        exit();
    }

    $stmt = $db->prepare("SELECT role FROM users WHERE id = ? LIMIT 1");
    $stmt->bind_param("i", $data['uid']);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();

    if (!$row || $row['role'] !== 'admin') {
        http_response_code(403);
        echo json_encode(['message' => 'Admin access required']);
        exit();
    }
    return $data;
}
