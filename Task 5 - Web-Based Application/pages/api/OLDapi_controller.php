<?php

namespace api;

session_start();

header("Content-type: application/json");

class API {
    private $conn;
    public function __construct($conn) {
        $this->conn = $conn;
    }

    public function registerAgency($data) {
        if (!isset($data["name"], $data["email"], $data["description"]))
            return $this->error("Post parameters are missing");

        $name = trim($data["name"]);
        $email = trim($data["email"]);
        $description = trim($data["description"]);

        if (!$username || !$email || !$description)
            return $this->error("Post parameters are empty");

        if (!preg_match("/^[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i", $email))
            return $this->error("Invalid email");

        $sql = "SELECT email FROM agency WHERE email = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("s", $email);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows > 0)
            return $this->error("Email is already in use");

        //===

        $sql = "INSERT INTO users (Company_Name, Email, Description) VALUES (?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("sss", $name, $email, $description);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $agency_id = $this->conn->insert_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "agency_id" => $agency_id
        ];
    }

    public function registerTraveller($data) {
        if (!isset($data["f_name"], $data["mid_init"], $data["s_name"], $data["email"], $data["country"]))
            return $this->error("Post parameters are missing");

        $fname = trim($data["f_name"]);
        $minit = trim($data["mid_init"]);
        $sname = trim($data["s_name"]);
        $email = trim($data["email"]);
        $country = trim($data["country"]);

        if (!$fname || !$minit || !$sname || !$email || !$country)
            return $this->error("Post parameters are empty");

        if (!preg_match("/^[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i", $email))
            return $this->error("Invalid email");

        $sql = "SELECT email FROM traveller WHERE email = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("s", $email);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows > 0)
            return $this->error("Email is already in use");

        //===

        $sql = "INSERT INTO users (First_Name, Mid_Initial, Surname, Email, Country_Of_Residence) 
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("sssss", $fname, $minit, $sname, $email, $country);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $traveller_id = $this->conn->insert_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "traveller_id" => $traveller_id
        ];
    }

    public function registerUser($data) {
        if (!isset($data["username"], $data["password"], $data["email"], $data["user_type"]))
            return $this->error("Post parameters are missing");

        $username = trim($data["username"]);
        $password = $data["password"];
        $email = trim($data["email"]);
        $user_type = trim($data["user_type"]);

        if (!$username || !$password || !$user_type)
            return $this->error("Post parameters are empty");

        if (!preg_match("/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*()]).{8,}$/", $password))
            return $this->error("Weak password");

        $sql = "SELECT username FROM user WHERE username = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("s", $username);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows > 0)
            return $this->error("Username is already in use");

        //===

        if ($user_type === "traveller") 
            $sql = "SELECT Traveller_ID FROM traveller WHERE email = ?";

        else if ($user_type === "agency_staff") 
            $sql = "SELECT Agency_ID FROM agency WHERE email = ?";

        else if ($user_type !== "admin")
            return $this->error("Invalid user type");

        $id = null;
        if (isset($sql)) {
            $stmt = $this->conn->prepare($sql);
            if (!$stmt) 
                return $this->error("Connection failed", "db");
            $stmt->bind_param("s", $email);
            if (!$stmt->execute()) 
                return $this->error("Insert failed", "db");

            $result = $stmt->get_result();
            if ($result->num_rows == 0)
                return $this->error("Register traveller or agency first");

            $row = $result->fetch_assoc();
            $id = ($user_type === "traveller") ? $row["Traveller_ID"] : $row["Agency_ID"];
        }
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        //===

        if ($user_type === "traveller") 
            $sql = "INSERT INTO users (Username, Password, User_Type, Traveller_ID) VALUES (?, ?, ?, ?)";
        else 
            $sql = "INSERT INTO users (Username, Password, User_Type, Agency_ID) VALUES (?, ?, ?, ?)";

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("sssi", $username, $hashedPassword, $user_type, $id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $user_id = $this->conn->insert_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "user_id" => $user_id
        ];
    }

    public function login($data) {
        if (!isset($data["username"]) || !isset($data["password"]))
            return $this->error("Post parameters are missing");

        $user = trim($data["username"]);
        $password = $data["password"];

        if (!$user || !$password)
            return $this->error("Post parameters are empty");

        $sql = "SELECT * FROM users WHERE username = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("s", $user);
        if (!$stmt->execute()) 
            return $this->error("Login failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid username", "cred");

        $row = $result->fetch_assoc();
        if (!password_verify($password, $row["password"]))
            return $this->error("Invalid password", "cred");

        $id = $row["id"];
        $type = $row["user_type"];
        $type_id = ($type === "traveller") ? $row["traveller_id"] : $row["agency_id"];

        $_SESSION['user_id'] = $id;
        $_SESSION['user_type'] = $type;
        $_SESSION['type_id'] = $type_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "data" => [
                "user_id" => $id,
                "type_id" => $type_id,
                "username" => $row["username"],
                "user_type" => $type
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

    public function getFeature($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            $this->error("Not authenticated", "cred"); 

        if (!isset($data["feature"])) 
            return $this->error("Post parameters are missing");

        $feature = $data["feature"];
        if (!$feature)
            return $this->error("Post parameters are empty");

        if ($feature !== "destination" && $feature !== "flight" && $feature !== "attraction"
            && $feature !== "accommodation" && $feature !== "restaurant" && $feature !== "activity")
                return $this->error("Invalid feature");

        $sql = "SELECT * FROM {$feature}";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db"); 
        if (!$stmt->execute()) 
            return $this->error("Query failed", "db"); 

        $result = $stmt->get_result(); $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }

        return [
            "status" => "success",
            "timestamp" => time(),
            "data" => $data
        ];
    }

    public function insertEndpointHere($data) {

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
