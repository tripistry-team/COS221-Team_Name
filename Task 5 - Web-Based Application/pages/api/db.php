<?php

class Database {
    private static $instance = null;
    private $conn;

    private function __construct() {
        $host = "127.0.0.1"; 
        $user = "root";
        $password = ""; 
        $dbname = "flights_local";

        $this->conn = new mysqli($host, $user, $password, $dbname, 3307);

        if ($this->conn->connect_error) {
            http_response_code(500);
            die(json_encode([
                "status" => "error",
                "timestamp" => time(),
                "message" => "Database connection failed"
            ]));
        }
    }

    public static function getInstance() {
        if (self::$instance == null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }

    public function getConnection() {
        return $this->conn;
    }
}


