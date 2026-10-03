<?php

class Products {

    public $conn;
    private $table = "products";

    public $id;
    public $name;
    public $image;
    public $newPrice;
    public $oldPrice;
    public $productCategory;
    public $productCondition;
    public $stock;
    public $stockStatus;
    public $description;
    public $badge;
    public $discount;
    public $shipping;
    public $delivery;
    public $returnPolicy;
    public $isTopSelling;
    public $topSellingRank;

    public function __construct($db) {
        $this->conn = $db;
    }

    // ======================
    // GET ALL
    // ======================
    public function getAll() {
        return $this->conn->query(
            "SELECT * FROM {$this->table} ORDER BY id DESC"
        );
    }

    // ======================
    // GET BY ID
    // ======================
    public function getById($id) {

        $stmt = $this->conn->prepare(
            "SELECT * FROM {$this->table} WHERE id=? LIMIT 1"
        );
        if (!$stmt) return false;

        $stmt->bind_param("i", $id);
        $stmt->execute();

        $r = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        return $r ?: false;
    }

    // ======================
    // GET BY CATEGORY
    // ======================
    public function getByCategory($category) {

        $stmt = $this->conn->prepare(
            "SELECT * FROM {$this->table}
             WHERE productCategory=?
             ORDER BY newPrice ASC"
        );
        if (!$stmt) return false;

        $stmt->bind_param("s", $category);
        $stmt->execute();

        $r = $stmt->get_result();
        $stmt->close();

        return $r;
    }

    // ======================
    // GET BY CONDITION (new/used)
    // ======================
    public function getByCondition($condition) {

        $stmt = $this->conn->prepare(
            "SELECT * FROM {$this->table}
             WHERE productCondition=?
             ORDER BY productCategory ASC, newPrice ASC"
        );
        if (!$stmt) return false;

        $stmt->bind_param("s", $condition);
        $stmt->execute();

        $r = $stmt->get_result();
        $stmt->close();

        return $r;
    }

    // ======================
    // GET BY CATEGORY AND CONDITION
    // ======================
    public function getByCategoryAndCondition($category, $condition) {

        $stmt = $this->conn->prepare(
            "SELECT * FROM {$this->table}
             WHERE productCategory=? AND productCondition=?
             ORDER BY newPrice ASC"
        );
        if (!$stmt) return false;

        $stmt->bind_param("ss", $category, $condition);
        $stmt->execute();

        $r = $stmt->get_result();
        $stmt->close();

        return $r;
    }

    // ======================
    // GET TOP SELLING
    // ======================
    public function getTopSelling() {
        return $this->conn->query(
            "SELECT * FROM {$this->table}
             WHERE isTopSelling = 1
             ORDER BY (topSellingRank IS NULL), topSellingRank ASC, id DESC"
        );
    }

    // ======================
    // SET TOP SELLING FLAG / RANK
    // ======================
    public function setTopSelling($id, $isTopSelling, $rank = null) {

        $stmt = $this->conn->prepare(
            "UPDATE {$this->table} SET isTopSelling=?, topSellingRank=? WHERE id=?"
        );
        if (!$stmt) return false;

        $stmt->bind_param("iii", $isTopSelling, $rank, $id);
        $ok = $stmt->execute();
        $stmt->close();
        return $ok;
    }

    // ======================
    // CREATE
    // ======================
    public function create() {

        $stmt = $this->conn->prepare(
        "INSERT INTO {$this->table}
        (name,image,newPrice,oldPrice,productCategory,productCondition,stock,stockStatus,
         description,badge,discount,shipping,delivery,returnPolicy,isTopSelling,topSellingRank)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");

        if (!$stmt) return false;

        $stmt->bind_param(
            "ssddssisssssssii",
            $this->name,
            $this->image,
            $this->newPrice,
            $this->oldPrice,
            $this->productCategory,
            $this->productCondition,
            $this->stock,
            $this->stockStatus,
            $this->description,
            $this->badge,
            $this->discount,
            $this->shipping,
            $this->delivery,
            $this->returnPolicy,
            $this->isTopSelling,
            $this->topSellingRank
        );

        $ok = $stmt->execute();
        $stmt->close();
        return $ok;
    }

    // ======================
    // UPDATE
    // ======================
    public function update($id) {

        $sql = "UPDATE {$this->table} SET
            name=?,
            newPrice=?,
            oldPrice=?,
            productCategory=?,
            productCondition=?,
            stock=?,
            stockStatus=?,
            description=?,
            badge=?,
            discount=?,
            shipping=?,
            delivery=?,
            returnPolicy=?,
            isTopSelling=?,
            topSellingRank=?";

        if (!empty($this->image)) {
            $sql .= ", image=?";
        }

        $sql .= " WHERE id=?";

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) return false;

        // WITH IMAGE
        if (!empty($this->image)) {

            $stmt->bind_param(
                "sddssisssssssiisi",
                $this->name,
                $this->newPrice,
                $this->oldPrice,
                $this->productCategory,
                $this->productCondition,
                $this->stock,
                $this->stockStatus,
                $this->description,
                $this->badge,
                $this->discount,
                $this->shipping,
                $this->delivery,
                $this->returnPolicy,
                $this->isTopSelling,
                $this->topSellingRank,
                $this->image,
                $id
            );

        } else {

            // WITHOUT IMAGE
            $stmt->bind_param(
                "sddssisssssssiii",
                $this->name,
                $this->newPrice,
                $this->oldPrice,
                $this->productCategory,
                $this->productCondition,
                $this->stock,
                $this->stockStatus,
                $this->description,
                $this->badge,
                $this->discount,
                $this->shipping,
                $this->delivery,
                $this->returnPolicy,
                $this->isTopSelling,
                $this->topSellingRank,
                $id
            );
        }

        $ok = $stmt->execute();
        $stmt->close();
        return $ok;
    }

    // ======================
    // DELETE PRODUCT
    // ======================
    public function delete($id) {

        $stmt = $this->conn->prepare(
            "DELETE FROM {$this->table} WHERE id=?"
        );
        if (!$stmt) return false;

        $stmt->bind_param("i",$id);
        $ok = $stmt->execute();
        $stmt->close();

        return $ok;
    }
}
?>