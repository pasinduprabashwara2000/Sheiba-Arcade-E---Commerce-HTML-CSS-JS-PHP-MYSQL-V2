<?php
require_once __DIR__ . '/../models/Products.php';

class ProductController {

    private $product;
    private $uploadDir;

    public function __construct($db) {
        $this->product = new Products($db);
        $this->uploadDir = __DIR__ . '/../uploads/';

        // Ensure uploads directory exists
        if (!is_dir($this->uploadDir)) {
            mkdir($this->uploadDir, 0755, true);
        }
    }

    // ======================
    // GET ALL PRODUCTS
    // ======================
    public function getAll() {
        try {
            $result = $this->product->getAll();

            if ($result === false) {
                throw new Exception('Database query failed');
            }

            $products = [];
            while ($row = $result->fetch_assoc()) {
                // Parse images string into array
                if (!empty($row['images'])) {
                    $row['images'] = explode(',', $row['images']);
                } else {
                    $row['images'] = [];
                }
                $products[] = $row;
            }

            http_response_code(200);
            echo json_encode($products);
        } catch (Exception $e) {
            http_response_code(503); // Service Unavailable
            echo json_encode([
                'error' => 'Database temporarily unavailable. Please try again.',
                'details' => $e->getMessage()
            ]);
        }
    }

    // ======================
    // GET PRODUCT BY ID
    // ======================
    public function getById($id) {
        try {
            $data = $this->product->getById((int)$id);

            if (!$data) {
                http_response_code(404);
                echo json_encode(['message' => 'Product not found']);
                return;
            }

            // Parse images string into array
            if (!empty($data['images'])) {
                $data['images'] = explode(',', $data['images']);
            } else {
                $data['images'] = [];
            }

            http_response_code(200);
            echo json_encode($data);
        } catch (Exception $e) {
            http_response_code(503);
            echo json_encode([
                'error' => 'Database temporarily unavailable',
                'details' => $e->getMessage()
            ]);
        }
    }

    // ======================
    // GET BY CATEGORY
    // ======================
    public function getByCategory($category) {
        try {
            $result = $this->product->getByCategory(urldecode($category));

            if ($result === false) {
                throw new Exception('Database query failed');
            }

            $products = [];
            while ($row = $result->fetch_assoc()) {
                if (!empty($row['images'])) {
                    $row['images'] = explode(',', $row['images']);
                } else {
                    $row['images'] = [];
                }
                $products[] = $row;
            }

            http_response_code(200);
            echo json_encode($products);
        } catch (Exception $e) {
            http_response_code(503);
            echo json_encode([
                'error' => 'Database temporarily unavailable',
                'details' => $e->getMessage()
            ]);
        }
    }

    // ======================
    // GET BY CONDITION (new/used)
    // ======================
    public function getByCondition($condition) {
        try {
            $condition = strtolower(urldecode($condition));
            if (!in_array($condition, ['new', 'used'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid condition. Must be "new" or "used"']);
                return;
            }

            $result = $this->product->getByCondition($condition);

            if ($result === false) {
                throw new Exception('Database query failed');
            }

            $products = [];
            while ($row = $result->fetch_assoc()) {
                if (!empty($row['images'])) {
                    $row['images'] = explode(',', $row['images']);
                } else {
                    $row['images'] = [];
                }
                $products[] = $row;
            }

            http_response_code(200);
            echo json_encode($products);
        } catch (Exception $e) {
            http_response_code(503);
            echo json_encode([
                'error' => 'Database temporarily unavailable',
                'details' => $e->getMessage()
            ]);
        }
    }

    // ======================
    // GET TOP SELLING PRODUCTS
    // ======================
    public function getTopSelling() {
        try {
            $result = $this->product->getTopSelling();

            if ($result === false) {
                throw new Exception('Database query failed');
            }

            $products = [];
            while ($row = $result->fetch_assoc()) {
                if (!empty($row['images'])) {
                    $row['images'] = explode(',', $row['images']);
                } else {
                    $row['images'] = [];
                }
                $products[] = $row;
            }

            http_response_code(200);
            echo json_encode($products);
        } catch (Exception $e) {
            http_response_code(503);
            echo json_encode([
                'error' => 'Database temporarily unavailable',
                'details' => $e->getMessage()
            ]);
        }
    }

    // ======================
    // SET TOP SELLING FLAG (+ optional rank) FOR A PRODUCT
    // ======================
    public function setTopSelling($id) {
        try {
            $raw = file_get_contents("php://input");
            $data = json_decode($raw, true);
            if (!is_array($data)) {
                parse_str($raw, $data);
            }

            if (!isset($data['isTopSelling'])) {
                http_response_code(400);
                echo json_encode(['message' => 'isTopSelling is required']);
                return;
            }

            $existing = $this->product->getById((int)$id);
            if (!$existing) {
                http_response_code(404);
                echo json_encode(['message' => 'Product not found']);
                return;
            }

            $isTopSelling = filter_var($data['isTopSelling'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            $rank = isset($data['topSellingRank']) && $data['topSellingRank'] !== ''
                ? (int)$data['topSellingRank']
                : null;

            if ($this->product->setTopSelling((int)$id, $isTopSelling, $rank)) {
                http_response_code(200);
                echo json_encode([
                    'message' => $isTopSelling ? 'Product marked as top selling' : 'Product removed from top selling',
                    'isTopSelling' => (bool)$isTopSelling,
                    'topSellingRank' => $rank
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to update top selling status']);
            }
        } catch (Exception $e) {
            http_response_code(503);
            echo json_encode([
                'error' => 'Database temporarily unavailable',
                'details' => $e->getMessage()
            ]);
        }
    }

    // ======================
    // GET BY CATEGORY AND CONDITION
    // ======================
    public function getByCategoryAndCondition($category, $condition) {
        try {
            $condition = strtolower(urldecode($condition));
            if (!in_array($condition, ['new', 'used'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Invalid condition. Must be "new" or "used"']);
                return;
            }

            $result = $this->product->getByCategoryAndCondition(urldecode($category), $condition);

            if ($result === false) {
                throw new Exception('Database query failed');
            }

            $products = [];
            while ($row = $result->fetch_assoc()) {
                if (!empty($row['images'])) {
                    $row['images'] = explode(',', $row['images']);
                } else {
                    $row['images'] = [];
                }
                $products[] = $row;
            }

            http_response_code(200);
            echo json_encode($products);
        } catch (Exception $e) {
            http_response_code(503);
            echo json_encode([
                'error' => 'Database temporarily unavailable',
                'details' => $e->getMessage()
            ]);
        }
    }

    // ======================
    // CREATE PRODUCT (POST)
    // ======================
    public function create() {
        try {
            $data = $_POST;

            if (empty($data['name']) || empty($data['productCategory'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Name and category required']);
                return;
            }

            $this->product->name = $data['name'];
            $this->product->newPrice = (float)($data['newPrice'] ?? 0);
            $this->product->oldPrice = (float)($data['oldPrice'] ?? 0);
            $this->product->productCategory = $data['productCategory'];
            $this->product->productCondition = in_array($data['productCondition'] ?? '', ['new', 'used']) ? $data['productCondition'] : 'new';
            $this->product->stock = (int)($data['stock'] ?? 0);
            $this->product->stockStatus = $data['stockStatus'] ?? 'IN_STOCK';
            $this->product->description = $data['description'] ?? '';
            $this->product->badge = $data['badge'] ?? '';
            $this->product->discount = $data['discount'] ?? '';
            $this->product->shipping = $data['shipping'] ?? '';
            $this->product->delivery = $data['delivery'] ?? '';
            $this->product->returnPolicy = $data['returnPolicy'] ?? '';
            // Top selling is managed separately under "Manage Top Selling Products",
            // but can still be set here if a caller explicitly sends it.
            $this->product->isTopSelling = isset($data['isTopSelling'])
                ? (filter_var($data['isTopSelling'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0)
                : 0;
            $this->product->topSellingRank = (isset($data['topSellingRank']) && $data['topSellingRank'] !== '')
                ? (int)$data['topSellingRank']
                : null;

            // Handle primary image
            $primaryImagePath = $this->handleImageUpload('image');
            if ($primaryImagePath) {
                $this->product->image = $primaryImagePath;
            }

            if ($this->product->create()) {
                $productId = $this->product->conn->insert_id;

                http_response_code(201);
                echo json_encode([
                    'message' => 'Product created successfully',
                    'productId' => $productId
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to create product']);
            }
        } catch (Exception $e) {
            http_response_code(503);
            echo json_encode([
                'error' => 'Database temporarily unavailable',
                'details' => $e->getMessage()
            ]);
        }
    }

    // ======================
    // UPDATE PRODUCT (PUT)
    // ======================
    public function update($id) {
        try {
            // Read raw input for PUT request
            parse_str(file_get_contents("php://input"), $data);

            // Also check for multipart form data
            if (empty($data) && !empty($_POST)) {
                $data = $_POST;
            }

            if (empty($data['name']) || empty($data['productCategory'])) {
                http_response_code(400);
                echo json_encode(['message' => 'Name and category required']);
                return;
            }

            $this->product->name = $data['name'] ?? '';
            $this->product->newPrice = (float)($data['newPrice'] ?? 0);
            $this->product->oldPrice = !empty($data['oldPrice']) ? (float)$data['oldPrice'] : null;
            $this->product->productCategory = $data['productCategory'] ?? '';
            $this->product->productCondition = in_array($data['productCondition'] ?? '', ['new', 'used']) ? $data['productCondition'] : 'new';
            $this->product->stock = (int)($data['stock'] ?? 0);
            $this->product->stockStatus = in_array($data['stockStatus'] ?? '', ['IN_STOCK', 'OUT_OF_STOCK']) ? $data['stockStatus'] : 'IN_STOCK';
            $this->product->description = $data['description'] ?? '';
            $this->product->badge = $data['badge'] ?? '';
            $this->product->discount = $data['discount'] ?? '';
            $this->product->shipping = $data['shipping'] ?? '';
            $this->product->delivery = $data['delivery'] ?? '';
            $this->product->returnPolicy = $data['returnPolicy'] ?? '';

            // The main "Add / Edit Product" form doesn't send isTopSelling/topSellingRank —
            // that's managed from "Manage Top Selling Products" — so preserve the
            // existing values here unless a caller explicitly sends new ones.
            $existing = $this->product->getById((int)$id);
            if (array_key_exists('isTopSelling', $data)) {
                $this->product->isTopSelling = filter_var($data['isTopSelling'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
            } else {
                $this->product->isTopSelling = $existing ? (int)$existing['isTopSelling'] : 0;
            }
            if (array_key_exists('topSellingRank', $data)) {
                $this->product->topSellingRank = ($data['topSellingRank'] !== '') ? (int)$data['topSellingRank'] : null;
            } else {
                $this->product->topSellingRank = $existing && $existing['topSellingRank'] !== null ? (int)$existing['topSellingRank'] : null;
            }

            // Handle primary image if uploaded
            $primaryImagePath = $this->handleImageUpload('image');
            if ($primaryImagePath) {
                $this->product->image = $primaryImagePath;
            } else {
                $this->product->image = null;
            }

            if ($this->product->update($id)) {
                http_response_code(200);
                echo json_encode(['message' => 'Product updated successfully']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Failed to update product']);
            }
        } catch (Exception $e) {
            http_response_code(503);
            echo json_encode([
                'error' => 'Database temporarily unavailable',
                'details' => $e->getMessage()
            ]);
        }
    }

    // ======================
    // DELETE PRODUCT (DELETE)
    // ======================
    public function delete($id) {
        try {
            if ($this->product->delete((int)$id)) {
                http_response_code(200);
                echo json_encode(['message' => 'Product deleted successfully']);
            } else {
                http_response_code(500);
                echo json_encode(['message' => 'Delete failed']);
            }
        } catch (Exception $e) {
            http_response_code(503);
            echo json_encode([
                'error' => 'Database temporarily unavailable',
                'details' => $e->getMessage()
            ]);
        }
    }

    // ======================
    // HANDLE SINGLE IMAGE UPLOAD
    // ======================
    private function handleImageUpload($fieldName) {

        if (!isset($_FILES[$fieldName]) || $_FILES[$fieldName]['error'] !== UPLOAD_ERR_OK) {
            return null;
        }

        $file = $_FILES[$fieldName];

        // Validate image
        $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        $finfo = finfo_open(FILEINFO_MIME_TYPE);
        $mimeType = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);

        if (!in_array($mimeType, $allowedMimes)) {
            return null;
        }

        // Generate unique filename
        $fileName = time() . '_' . uniqid() . '_' . basename($file['name']);
        $target = $this->uploadDir . $fileName;

        if (move_uploaded_file($file['tmp_name'], $target)) {
            return 'uploads/' . $fileName;
        }

        return null;
    }
}
?>