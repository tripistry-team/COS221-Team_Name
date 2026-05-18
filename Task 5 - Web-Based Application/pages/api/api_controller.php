<?php

namespace api;

session_start();

header("Content-type: application/json");

class API {
    private $conn;
    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function register($data) {
        if (!isset($data["username"], $data["password"], $data["email"], $data["user_type"]))
            return $this->error("Post parameters are missing");

        $username = trim($data["username"]);
        $password = $data["password"];
        $email = trim($data["email"]);
        $user_type = $data["user_type"];

        if (!$username || !$password || !$email || !$user_type)
            return $this->error("Post parameters are empty");
        if (!preg_match("/^[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i", $email))
            return $this->error("Invalid email");
        if (!preg_match("/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()]).{8,}$/", $password))
            return $this->error("Weak password");
        if ($user_type != "Passenger" && $user_type != "ATC")
            return $this->error("Invalid user type");

        $sql = "SELECT id FROM users WHERE email = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) return $this->error("Connection failed", "db");
        $stmt->bind_param("s", $email);
        if (!$stmt->execute()) return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows > 0)
            return $this->error("Email is already in use");

        $sql = "SELECT id FROM users WHERE username = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) return $this->error("Connection failed", "db");
        $stmt->bind_param("s", $username);
        if (!$stmt->execute()) return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows > 0)
            return $this->error("Username is already in use");

        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        $sql = "INSERT INTO users (username, email, password, type) VALUES (?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) return $this->error("Connection failed", "db");
        $stmt->bind_param("ssss", $username, $email, $hashedPassword, $user_type);
        if (!$stmt->execute()) return $this->error("Insert failed", "db");

        $user_id = $this->conn->insert_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "user_id" => $user_id
        ];
    }

    public function login($data) {
        if ((!isset($data["email"]) && !isset($data["username"])) || !isset($data["password"]))
            return $this->error("Post parameters are missing");

        if (isset($data["email"])) {
            $type = "email";
            $user = trim($data["email"]);
        } 
        
        else {
            $type = "username";
            $user = trim($data["username"]);
        }
        
        $password = $data["password"];

        if (!$user || !$password)
            return $this->error("Post parameters are empty");

        if ($type === "email")
            $sql = "SELECT id, username, password, email, type FROM users WHERE email = ?";
        else
            $sql = "SELECT id, username, password, email, type FROM users WHERE username = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) return $this->error("Connection failed", "db");
        $stmt->bind_param("s", $user);
        if (!$stmt->execute()) return $this->error("Query failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid {$type}", "cred");

        $row = $result->fetch_assoc();
        if (!password_verify($password, $row["password"]))
            return $this->error("Invalid password", "cred");

        $_SESSION['user_id'] = $row["id"];
        $_SESSION['user_type'] = $row["type"];

        return [
            "status" => "success",
            "timestamp" => time(),
            "data" => [
                "user_id" => $row["id"],
                "username" => $row["username"],
                "email" => $row["email"],
                "type" => $row["type"]
            ]
        ];
    }

    public function logout() {
        session_unset();
        session_destroy();

        return [
            "status" => "success",
            "timestamp" => time()
        ];
    }

    private function error($msg, $type = "request") {
        if ($type === "db") http_response_code(500);
        else if ($type === "cred") http_response_code(401);
        else if ($type === "fbdn") http_response_code(403);
        else http_response_code(400);

        return [
            "status" => "error",
            "timestamp" => time(),
            "message" => $msg
        ];
    }
}
