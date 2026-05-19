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

    public function getPackages($data) {
        $sql = "
            SELECT
                p.Package_ID,
                p.Name,
                p.Description,
                p.Base_Price,
                p.Duration,
                p.Package_Status,
                a.Company_Name,
                d.Country,
                d.City,
                ROUND(AVG(f.Rating), 1)         AS Avg_Rating,
                COUNT(DISTINCT f.Feedback_ID)   AS Review_Count,
                MIN(po.Final_Price)             AS Min_Price,
                MAX(po.Final_Price)             AS Max_Price
            FROM PACKAGE p
            JOIN AGENCY a
                ON p.Agency_ID = a.Agency_ID
            LEFT JOIN PACKAGE_OPTION po
                ON p.Package_ID = po.Package_ID
            LEFT JOIN PACKAGE_OPTION_EXPERIENCE poe
                ON po.Package_ID = poe.Package_ID AND po.Package_Type = poe.Package_Type
            LEFT JOIN EXPERIENCE e
                ON poe.Experience_ID = e.Experience_ID
            LEFT JOIN DESTINATION d
                ON e.Destination_ID = d.Destination_ID
            LEFT JOIN FEEDBACK f
                ON po.Package_ID = f.Package_ID AND po.Package_Type = f.Package_Type
            WHERE p.Package_Status = 'active'
        ";

        $params = [];
        $types = "";

        if (isset($data["destination"])) {
            $dest = "%" . trim($data["destination"]) . "%";
            $sql .= " AND (d.Country LIKE ? OR d.City LIKE ?)";
            $params[] = $dest;
            $params[] = $dest;
            $types .= "ss";
        }

        if (isset($data["min_price"]) && is_numeric($data["min_price"])) {
            $sql .= " AND p.Base_Price >= ?";
            $params[] = (float)$data["min_price"];
            $types .= "d";
        }

        if (isset($data["max_price"]) && is_numeric($data["max_price"])) {
            $sql .= " AND p.Base_Price <= ?";
            $params[] = (float)$data["max_price"];
            $types .= "d";
        }

        if (isset($data["duration"]) && is_numeric($data["duration"])) {
            $sql .= " AND p.Duration = ?";
            $params[] = (int)$data["duration"];
            $types .= "i";
        }

        if (isset($data["package_type"])) {
            $allowed = ["solo", "couple", "group", "family"];
            if (!in_array($data["package_type"], $allowed)) 
                return $this->error("Invalid package type");
            $sql .= " AND po.Package_Type = ?";
            $params[] = $data["package_type"];
            $types .= "s";
        }

        if (isset($data["min_rating"]) && is_numeric($data["min_rating"])) {
            $sql .= " AND (SELECT AVG(f2.Rating) FROM FEEDBACK f2 WHERE f2.Package_ID = p.Package_ID) >= ?";
            $params[] = (float)$data["min_rating"];
            $types   .= "d";
        }

        $sql .= " GROUP BY p.Package_ID, p.Name, p.Description, p.Base_Price, p.Duration, p.Package_Status,
            a.Company_Name, d.Country, d.City";

        $allowed_sorts = [
            "price_asc" => "p.Base_Price ASC",
            "price_desc" => "p.Base_Price DESC",
            "rating_desc" => "Avg_Rating DESC",
            "duration_asc" => "p.Duration ASC",
            "name_asc" => "p.Name ASC"
        ];
        $sort = $data["sort"] ?? "name_asc";
        $sql .= " ORDER BY " . ($allowed_sorts[$sort] ?? "p.Name ASC");

        $stmt = $this->conn->prepare($sql);
        if (!$stmt)
            return $this->error("Connection failed", "db");

        if (!empty($params)) {
            $stmt->bind_param($types, ...$params);
        }

        if (!$stmt->execute())
            return $this->error("Query failed", "db");

        $result = $stmt->get_result();
        $packages = [];
        while ($row = $result->fetch_assoc()) {
            $packages[] = $row;
        }

        return [
            "status"    => "success",
            "timestamp" => time(),
            "count"     => count($packages),
            "data"      => $packages
        ];
    }

    public function getPackageDetails($data) {
        if (!isset($data["package_id"]))
            return $this->error("Post parameters are missing");

        $pid = (int)$data["package_id"];
        if ($pid <= 0)
            return $this->error("Invalid package ID");

        // Package + Agency info
        $sql = "
            SELECT
                p.Package_ID, p.Name, p.Description,
                p.Base_Price, p.Duration, p.Package_Status,
                a.Agency_ID, a.Company_Name, a.Email AS Agency_Email, a.Description AS Agency_Description
            FROM PACKAGE p
            JOIN AGENCY a ON p.Agency_ID = a.Agency_ID
            WHERE p.Package_ID = ?
        ";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $pid);
        if (!$stmt->execute()) 
            return $this->error("Query failed", "db");
        $result = $stmt->get_result();
        if ($result->num_rows === 0)
            return $this->error("Package not found");
        $package = $result->fetch_assoc();

        // Package Options
        $sql = "
            SELECT Package_Type, Participants_Min, Participants_Max,
                Final_Price, Description
            FROM PACKAGE_OPTION
            WHERE Package_ID = ?
        ";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $pid);
        if (!$stmt->execute()) 
            return $this->error("Query failed", "db");
        $result = $stmt->get_result();

        $options = [];
        while ($row = $result->fetch_assoc()) {
            $options[] = $row;
        }

        // Experiences (all subtypes joined)
        $sql = "
            SELECT
                e.Experience_ID, e.Name, e.Category,
                e.Description, e.Availability_Status,
                d.Country, d.City,
                poe.Package_Type,

                acc.Star_Rating, acc.Room_Capacity,
                acc.Number_Of_Rooms, acc.Price_Per_Night,
                
                r.Cuisine_Type, r.Opening_Hours AS Rest_Opening_Hours, r.Price_Range,
                
                atr.Attraction_Type, atr.Opening_Hours AS Attr_Opening_Hours, atr.Entry_Fee,
                
                act.Activity_Type, act.Price_Range AS Act_Price_Range,
                act.Duration AS Act_Duration, act.Age_Restriction,
                act.Capacity AS Act_Capacity, act.Indoor_Outdoor
            FROM PACKAGE_OPTION_EXPERIENCE poe
            JOIN EXPERIENCE e
                ON poe.Experience_ID = e.Experience_ID
            LEFT JOIN DESTINATION d
                ON e.Destination_ID = d.Destination_ID
            LEFT JOIN ACCOMMODATION acc
                ON e.Experience_ID = acc.Experience_ID
            LEFT JOIN RESTAURANT r
                ON e.Experience_ID = r.Experience_ID
            LEFT JOIN ATTRACTION atr
                ON e.Experience_ID = atr.Experience_ID
            LEFT JOIN ACTIVITY act
                ON e.Experience_ID = act.Experience_ID
            WHERE poe.Package_ID = ?
        ";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $pid);
        if (!$stmt->execute()) 
            return $this->error("Query failed", "db");
        $result = $stmt->get_result();

        $experiences = [];
        while ($row = $result->fetch_assoc()) {
            $experiences[] = $row;
        }

        // Flights
        $sql = "
            SELECT
                f.Flight_ID, f.Flight_Number, f.Airline,
                f.Departure_Airport, f.Departure_DateTime,
                f.Arrival_Airport, f.Arrival_DateTime,
                f.Price, f.Available_Seats, f.Seat_Class,
                pof.Package_Type, pof.Seats_Allocated
            FROM PACKAGE_OPTION_FLIGHT pof
            JOIN FLIGHT f ON pof.Flight_ID = f.Flight_ID
            WHERE pof.Package_ID = ?
        ";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $pid);
        if (!$stmt->execute()) return $this->error("Query failed", "db");
        $result = $stmt->get_result();
        $flights = [];
        while ($row = $result->fetch_assoc()) {
            $flights[] = $row;
        }

        // Reviews/Feedback
        $sql = "
            SELECT
                f.Feedback_ID, f.Rating, f.Comment,
                f.Response, f.Last_Updated, f.Package_Type,
                t.First_Name, t.Surname
            FROM FEEDBACK f
            JOIN TRAVELLER t ON f.Traveller_ID = t.Traveller_ID
            WHERE f.Package_ID = ?
            ORDER BY f.Last_Updated DESC
        ";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $pid);
        if (!$stmt->execute()) 
            return $this->error("Query failed", "db");
        $result = $stmt->get_result();
        
        $reviews = [];
        while ($row = $result->fetch_assoc()) {
            $reviews[] = $row;
        }

        // Avg rating
        $avg_rating = null;
        if (count($reviews) > 0) {
            $total = array_sum(array_column($reviews, "Rating"));
            $avg_rating = round($total / count($reviews), 1);
        }

        return [
            "status"        => "success",
            "timestamp"     => time(),
            "data"          => [
                "package"       => $package,
                "options"       => $options,
                "experiences"   => $experiences,
                "flights"       => $flights,
                "reviews"       => $reviews,
                "avg_rating"    => $avg_rating
            ]
        ];
    }

    public function getDestinations() {
        $sql = "
            SELECT DISTINCT d.Destination_ID, d.Country, d.City
            FROM DESTINATION d
            JOIN EXPERIENCE e
                ON e.Destination_ID = d.Destination_ID
            ORDER BY d.Country ASC, d.City ASC
        ";

        $stmt = $this->conn->prepare($sql);
        if (!$stmt)
            return $this->error("Connection failed", "db");

        if (!$stmt->execute())
            return $this->error("Query failed", "db");
        $result = $stmt->get_result();
        
        $destinations = [];
        while ($row = $result->fetch_assoc()) {
            $destinations[] = $row;
        }

        return [
            "status"    => "success",
            "timestamp" => time(),
            "count"     => count($destinations),
            "data"      => $destinations
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
