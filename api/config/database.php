<?php

class database {

    private $host = "localhost";
    private $username = "root";
    private $password = "";
    private $dbname = "sheiba_arcade";

    public function getConnection() {

        $conn = new mysqli(
            $this->host,
            $this->username,
            $this->password,
            $this->dbname
        );

        if ($conn->connect_error) {
            die("Connection Failed: " . $conn->connect_error);
        }

        $conn->set_charset("utf8mb4");

        return $conn;
    }
}

?>