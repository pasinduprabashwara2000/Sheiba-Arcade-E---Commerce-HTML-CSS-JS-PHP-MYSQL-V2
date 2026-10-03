<?php

// ============================
// CORS HEADERS
// ============================
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, X-Auth-Token");
header("Content-Type: application/json");

// Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================
// ERROR HANDLING
// ============================
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/error.log');

// ============================
// LOAD DEPENDENCIES
// ============================
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/auth.php';
require_once __DIR__ . '/controllers/AuthController.php';
require_once __DIR__ . '/controllers/ProductController.php';

// ============================
// DB CONNECTION
// ============================
$database = new Database();
$db = $database->getConnection();

if (!$db) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit();
}

// ============================
// SAFE ROUTE PARSING
// ============================
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Remove domain subfolder if any
$base = dirname($_SERVER['SCRIPT_NAME']);
if ($base !== '/' && strpos($path, $base) === 0) {
    $path = substr($path, strlen($base));
}

// Remove /api prefix
$path = preg_replace('#^/api#', '', $path);

// Also strip a literal /index.php if the file was hit directly
$path = preg_replace('#/index\.php$#', '', $path);

$path = rtrim($path, '/') ?: '/';

$method = $_SERVER['REQUEST_METHOD'];

// ============================
// CONTROLLERS
// ============================
$authController = new AuthController($db);
$productController = new ProductController($db);

// ============================
// ROUTING
// ============================
try {

    // ============================
    // API HEALTH CHECK
    // ============================
    if ($path === '/' && $method === 'GET') {
        echo json_encode([
            'status' => 'API running',
            'time' => date('Y-m-d H:i:s')
        ]);
        exit();
    }

    // ============================
    // AUTH ROUTES
    // ============================
    if ($path === '/login' && $method === 'POST') {
        $authController->login();
        exit();
    }

    if ($path === '/signup' && $method === 'POST') {
        $authController->signup();
        exit();
    }

    if ($path === '/me' && $method === 'GET') {
        $authController->me($db);
        exit();
    }

    // ============================
    // PRODUCT ROUTES - GET ALL
    // ============================
    if ($path === '/products' && $method === 'GET') {
        $productController->getAll();
        exit();
    }

    // ============================
    // PRODUCT ROUTES - GET TOP SELLING
    // GET /products/top-selling
    // Must be registered before the /products/(\d+) route below.
    // ============================
    if ($path === '/products/top-selling' && $method === 'GET') {
        $productController->getTopSelling();
        exit();
    }

    // ============================
    // PRODUCT ROUTES - SET TOP SELLING FLAG
    // POST /products/{id}/top-selling
    // Body: { "isTopSelling": true|false, "topSellingRank": 1 }
    // ============================
    if (preg_match('#^/products/(\d+)/top-selling$#', $path, $m) && $method === 'POST') {
        auth_require_admin($db);
        $productController->setTopSelling($m[1]);
        exit();
    }

    // ============================
    // PRODUCT ROUTES - GET BY ID
    // ============================
    if (preg_match('#^/products/(\d+)$#', $path, $m) && $method === 'GET') {
        $productController->getById($m[1]);
        exit();
    }

    // ============================
    // PRODUCT ROUTES - GET BY CONDITION (new/used)
    // GET /products/condition/new
    // GET /products/condition/used
    // ============================
    if (preg_match('#^/products/condition/(new|used)$#', $path, $m) && $method === 'GET') {
        $productController->getByCondition($m[1]);
        exit();
    }

    // ============================
    // PRODUCT ROUTES - GET BY CATEGORY AND CONDITION
    // MUST be before plain category route (greedy regex fix)
    // GET /products/category/PROCESSORS/condition/new
    // GET /products/category/GRAPHICSCARD/condition/used
    // ============================
    if (preg_match('#^/products/category/([^/]+)/condition/(new|used)$#', $path, $m) && $method === 'GET') {
        $productController->getByCategoryAndCondition(urldecode($m[1]), $m[2]);
        exit();
    }

    // ============================
    // PRODUCT ROUTES - GET BY CATEGORY
    // ============================
    if (preg_match('#^/products/category/([^/]+)$#', $path, $m) && $method === 'GET') {
        $productController->getByCategory(urldecode($m[1]));
        exit();
    }

    // Alternative category route format
    if (preg_match('#^/category/([^/]+)$#', $path, $m) && $method === 'GET') {
        $productController->getByCategory(urldecode($m[1]));
        exit();
    }

    // ============================
    // PRODUCT ROUTES - CREATE
    // ============================
    if ($path === '/products' && $method === 'POST') {
        auth_require_admin($db);
        $productController->create();
        exit();
    }

    // ============================
    // PRODUCT ROUTES - UPDATE
    // ============================
    if (preg_match('#^/products/(\d+)$#', $path, $m) && $method === 'POST') {
        auth_require_admin($db);
        $productController->update($m[1]);
        exit();
    }

    // ============================
    // PRODUCT ROUTES - DELETE
    // ============================
    if (preg_match('#^/products/(\d+)$#', $path, $m) && $method === 'DELETE') {
        auth_require_admin($db);
        $productController->delete($m[1]);
        exit();
    }

    // ============================
    // NOT FOUND
    // ============================
    http_response_code(404);
    echo json_encode([
        'error' => 'Route not found',
        'path' => $path,
        'method' => $method
    ]);

} catch (Throwable $e) {

    http_response_code(500);
    echo json_encode([
        'error' => 'Internal Server Error',
        'message' => $e->getMessage()
    ]);

}

?>