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

        if (!$name || !$email || !$description)
            return $this->error("Post parameters are empty");

        if (!preg_match("/^[a-zA-Z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i", $email))
            return $this->error("Invalid email");

        $sql = "SELECT Email FROM AGENCY WHERE Email = ?";
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

        $sql = "INSERT INTO AGENCY (Company_Name, Email, Description) VALUES (?, ?, ?)";
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

        $sql = "SELECT Email FROM TRAVELLER WHERE Email = ?";
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

        $sql = "INSERT INTO TRAVELLER (First_Name, Mid_Initial, Surname, Email, Country_Of_Residence) 
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

        $sql = "SELECT Username FROM USER WHERE Username = ?";
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
            $sql = "SELECT Traveller_ID FROM TRAVELLER WHERE Email = ?";

        else if ($user_type === "agency_staff") 
            $sql = "SELECT Agency_ID FROM AGENCY WHERE Email = ?";

        else
            return $this->error("Invalid user type");

        
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
        
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        //===

        if ($user_type === "traveller") 
            $sql = "INSERT INTO USER (Username, Password, User_Type, Traveller_ID) VALUES (?, ?, ?, ?)";
        else 
            $sql = "INSERT INTO USER (Username, Password, User_Type, Agency_ID) VALUES (?, ?, ?, ?)";

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
            "user_id" => $user_id,
            "id" => $id
        ];
    }

    public function login($data) {
        if (!isset($data["username"]) || !isset($data["password"]))
            return $this->error("Post parameters are missing");

        $user = trim($data["username"]);
        $password = $data["password"];

        if (!$user || !$password)
            return $this->error("Post parameters are empty");

        $sql = "SELECT * FROM USER WHERE Username = ?";
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
        if (!password_verify($password, $row["Password"]))
            return $this->error("Invalid password", "cred");

        $id = $row["User_ID"];
        $type = $row["User_Type"];
        $type_id = ($type === "traveller") ? $row["Traveller_ID"] : $row["Agency_ID"];

        $_SESSION['user_id'] = $id;
        $_SESSION['user_type'] = $type;
        $_SESSION['type_id'] = $type_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "data" => [
                "user_id" => $id,
                "type_id" => $type_id,
                "username" => $row["Username"],
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
            return $this->error("Not authenticated", "cred"); 

        if (!isset($data["feature"])) 
            return $this->error("Post parameters are missing");

        $feature = $data["feature"];
        if (!$feature)
            return $this->error("Post parameters are empty");

        $allowed = ["destination", "flight", "experience", "attraction", "accommodation", "restaurant", "activity"];
        if (!in_array($feature, $allowed)) 
            return $this->error("Invalid feature");

        $experience = ["attraction", "accommodation", "restaurant", "activity"];
        if (in_array($feature, $experience))
            $sql = "SELECT * FROM EXPERIENCE e JOIN {$feature} f ON e.Experience_ID = f.Experience_ID";
        else
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
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred"); 

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

        $sql .= " GROUP BY p.Package_ID, p.Name, p.Description, p.Base_Price, p.Duration, p.Package_Status,
            a.Company_Name, d.Country, d.City";

        if (isset($data["min_rating"]) && is_numeric($data["min_rating"])) {
            $sql .= " HAVING AVG(f.Rating) >= ?";
            $params[] = (float)$data["min_rating"];
            $types   .= "d";
        }

        $allowed_sorts = [
            "price_asc" => "p.Base_Price ASC",
            "price_desc" => "p.Base_Price DESC",
            "rating_asc" => "Avg_Rating ASC",
            "rating_desc" => "Avg_Rating DESC",
            "duration_asc" => "p.Duration ASC",
            "duration_desc" => "p.Duration DESC",
            "name_asc" => "p.Name ASC",
            "name_desc" => "p.Name DESC"
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
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred"); 

        if (!isset($data["package_id"]))
            return $this->error("Post parameters are missing");

        $pid = (int)$data["package_id"];
        if ($pid <= 0)
            return $this->error("Invalid package ID");

        // Package
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

        // Experiences 
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

        // Reviews
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

    public function addExperience($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["name"], $data["description"], $data["category"], $data["availability_status"], $data["destination_id"]))
            return $this->error("Post parameters are missing");

        $allowed = ["accommodation", "restaurant", "activity", "attraction"];
        if (!in_array($feature, $allowed)) 
            return $this->error("Invalid category");

        $allowed = ["available", "unavailable", "seasonal"];
        if (!in_array($feature, $allowed)) 
            return $this->error("Invalid availability status");

        $name = trim($data["name"]);
        $description = trim($data["description"]);
        $category = $data["category"];
        $availability_status = $data["availability_status"];
        $destination_id = (int)$data["destination_id"];

        if (!$name || !$description)
            return $this->error("Post parameters are empty");

        $sql = "SELECT Destination_ID FROM DESTINATION WHERE Destination_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $destination_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid destination id");

        //===

        $sql = "INSERT INTO EXPERIENCE (Name, Description, Category, Availability_Status, Destination_ID) 
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("ssssi", $name, $description, $category, $availability_status, $destination_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $experience_id = $this->conn->insert_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "experience_id" => $experience_id
        ];
    }

    public function addAccommodation($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["experience_id"], $data["stars"], $data["capacity"], $data["num_rooms"], $data["price_per_night"]))
            return $this->error("Post parameters are missing");

        $id = (int)$data["experience_id"];
        $stars = (int)$data["stars"];
        $capacity = (int)$data["capacity"];
        $rooms = (int)$data["num_rooms"];
        $ppn = (float)$data["price_per_night"];
       
        $sql = "SELECT Experience_ID FROM EXPERIENCE WHERE Experience_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Add experience first");

        //===

        $sql = "INSERT INTO ACCOMMODATION (Experience_ID, Star_Rating, Room_Capacity, Number_Of_Rooms, Price_Per_Night) 
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("iiiid", $id, $stars, $capacity, $rooms, $ppn);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $experience_id = $this->conn->insert_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "experience_id" => $experience_id
        ];
    }

    public function addRestaurant($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["experience_id"], $data["cuisine"], $data["opening_hours"], $data["price_range"]))
            return $this->error("Post parameters are missing");

        $id = (int)$data["experience_id"];
        $cuisine = trim($data["cuisine"]);
        $opening_hours = trim($data["opening_hours"]);
        $price_range = trim($data["price_range"]);

        if (!$cuisine || !$opening_hours || !$price_range)
            return $this->error("Post parameters are empty");
       
        $sql = "SELECT Experience_ID FROM EXPERIENCE WHERE Experience_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Add experience first");

        //===

        $sql = "INSERT INTO RESTAURANT (Experience_ID, Cuisine_Type, Opening_Hours, Price_Range) 
                VALUES (?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("isss", $id, $cuisine, $opening_hours, $price_range);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $experience_id = $this->conn->insert_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "experience_id" => $experience_id
        ];
    }

    public function addActivity($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["experience_id"], $data["activity_type"], $data["price_range"], $data["duration"], 
            $data["age_restriction"], $data["capacity"], $data["indoor"]))
            return $this->error("Post parameters are missing");

        $id = (int)$data["experience_id"];
        $type = trim($data["activity_type"]);
        $price_range = trim($data["price_range"]);
        $duration = trim($data["duration"]);
        $age = trim($data["age_restriction"]);
        $capacity = (int)$data["capacity"];
        $indoor = is_bool($data["indoor"]) ? $data["indoor"] : false;

        if (!$type || !$price_range || !$duration || !$age)
            return $this->error("Post parameters are empty");
       
        $sql = "SELECT Experience_ID FROM EXPERIENCE WHERE Experience_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Add experience first");

        //===

        $sql = "INSERT INTO ACTIVITY 
                (Experience_ID, Activity_Type, Price_Range, Duration, Age_Restriction, Capacity, Indoor_Outdoor) 
                VALUES (?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("issssii", $id, $type, $price_range, $duration, $age, $capacity, $indoor);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $experience_id = $this->conn->insert_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "experience_id" => $experience_id
        ];
    }

    public function addAttraction($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["experience_id"], $data["attraction_type"], $data["opening_hours"], $data["entry_fee"]))
            return $this->error("Post parameters are missing");

        $id = (int)$data["experience_id"];
        $type = trim($data["attraction_type"]);
        $opening_hours = trim($data["opening_hours"]);
        $fee = (float)$data["entry_fee"];

        if (!$type || !$opening_hours)
            return $this->error("Post parameters are empty");
       
        $sql = "SELECT Experience_ID FROM EXPERIENCE WHERE Experience_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Add experience first");

        //===

        $sql = "INSERT INTO ATTRACTION (Experience_ID, Attraction_Type, Opening_Hours, Entry_Fee) 
                VALUES (?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("issd", $id, $type, $opening_hours, $fee);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $experience_id = $this->conn->insert_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "experience_id" => $experience_id
        ];
    }

    public function insertEndpointHere($data) {
        
    }

    //FIX THIS
    public function addContact($data) {
        $user = trim($data["user_id"]);
        $num1 = trim($data["number1"]);
        $num2 = trim($data["number2"]);

        if ((!$num1 && !$num2) || (!$user)) {
            return [
            "status" => "success",
            "timestamp" => time()
        ]; 
        }

        $sql = "INSERT INTO USER_CONTACT_INFO 
                (User_ID, Contact_Info) 
                VALUES (?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("ii", $user, $num1);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        if ($num2) {
            $sql2 = "INSERT INTO USER_CONTACT_INFO 
                (User_ID, Contact_Info) 
                VALUES (?, ?)";
            $stmt2 = $this->conn->prepare($sql2);
            if (!$stmt2) 
                return $this->error("Connection failed", "db");
            $stmt2->bind_param("ii", $user, $num2);
            if (!$stmt2->execute()) 
                return $this->error("Insert failed", "db");
        }

        return [
            "status" => "success",
            "timestamp" => time(),
            "message" => "Added contact info"
        ];
    }

    public function addFeedback($data) {
        if (!isset($data["rating"], $data["traveller_ID"], $data["package_ID"], $data["package_Type"], $data["user_type"]))
            return $this->error("Post parameters are missing");

         $uType = trim($data["user_type"]);
         if ($uType !== "traveller") {
            return $this->error("Only travellers can leave a rating");
         }

        $rating = trim($data["rating"]);

        if ($rating < 1 || $rating > 5) {
            return $this->error("A rating can only be between 1 and 5 stars");
        }

        $tID = trim($data["traveller_ID"]);
        $pID = trim($data["package_ID"]);
        $pType = trim($data["package_Type"]);
       
        $comment = trim($data["comment"] ?? "");


        $sql = "INSERT INTO FEEDBACK 
                (Rating, Comment, Traveller_ID, Package_ID, Package_Type) 
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("issii", $rating, $comment, $tID, $pID, $pType);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $feedback_id = $this->conn->insert_id;
        return [
            "status" => "success",
            "timestamp" => time(),
            "feedback_id" => $feedback_id
        ];

    }

    public function addResponse($data) {
        if (!isset($data["feedback_ID"], $data["response"],  $data["user_type"]))
            return $this->error("Post parameters are missing");

         $uType = trim($data["user_type"]);
         if ($uType !== "agency_staff") {
            return $this->error("Only agency staff members can leave a response");
         }


        $response = trim($data["response"]);
        $fID = trim($data["feedback_ID"]);

        $sql = "UPDATE FEEDBACK SET Response = ? WHERE Feedback_ID = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("si", $response, $fID);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        return [
            "status" => "success",
            "timestamp" => time()
        ];

    }

    public function addFlight($data) {
        if (!isset($data["flight_Number"], $data["airline"], $data["departure_airport"], $data["arrival_airport"], $data["departure_dateTime"],
          $data["arrival_dateTime"], $data["price"], $data["available_seats"], $data["seat_class"], $data["user_type"])) {
            return $this->error("Post parameters are missing");
          }


         $uType = trim($data["user_type"]);
         if ($uType !== "agency_staff") {
            return $this->error("You have to be a staff member to add a flight to a package");
         }

         $class = trim($data["seat_class"]);
         if ($class !== "economy" && $class !== "premium_economy" && $class !== "business" && $class !== "first_class") {
            return $this->error("Invalid seat class");
         }

        $flightNo = trim($data["flight_Number"]);
        $airline = trim($data["airline"]);
        $tempSql = "SELECT Flight_ID FROM FLIGHT WHERE Flight_Number = ?";
        $tempStmt = $this->conn->prepare($tempSql);
        if (!$tempStmt) 
            return $this->error("Connection failed", "db");
        $tempStmt->bind_param("s", $flightNo);
        // if (!$tempStmt->execute()) 
        //     return $this->error("Insert failed", "db");

        $result = $tempStmt->get_result();
        if ($result->num_rows > 0) {
            return [
            "status" => "success",
            "timestamp" => time(),
            "flight_id" => $result
            ];
        }


        $depPort = trim($data["departure_airport"]);
        $arrPort = trim($data["arrival_airport"]);
        $depTime = trim($data["departure_dateTime"]);
        $arrTime = trim($data["arrival_dateTime"]);
        $price = trim($data["price"]);
        $numSeats = trim($data["available_seats"]);
        

        $sql = "INSERT INTO FLIGHT 
                (Flight_Number, Airline, Departure_Airport, Departure_DateTime, Arrival_Airport, Arrival_DateTime, Price, Available_Seats, Seat_Class) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("ssssssdis", $flightNo, $airline, $depPort, $depTime, $arrPort, $arrTime, $price, $numSeats, $class);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $flight_id = $this->conn->insert_id;
        return [
            "status" => "success",
            "timestamp" => time(),
            "flight_id" => $flight_id
        ];

    }

    public function addDestination($data) {
        if (!isset($data["country"], $data["city"])) {
            return $this->error("Post parameters are missing");
          }

        $country = trim($data["country"]);
        $city = trim($data["city"]);
        $tempSql = "SELECT Destination_ID FROM DESTINATION WHERE Country = ? AND City = ?";
        $tempStmt = $this->conn->prepare($tempSql);
        if (!$tempStmt) 
            return $this->error("Connection failed", "db");
        $tempStmt->bind_param("ss", $country, $city);
        // if (!$tempStmt->execute()) 
        //     return $this->error("Insert failed", "db");

        $result = $tempStmt->get_result();
        if ($result->num_rows > 0) {
            return [
            "status" => "success",
            "timestamp" => time(),
            "destination_id" => $result
            ];
        }   

        $sql = "INSERT INTO DESTINATION 
                (Country, City) 
                VALUES (?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("ss", $country, $city);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $dest_id = $this->conn->insert_id;
        return [
            "status" => "success",
            "timestamp" => time(),
            "destination_id" => $dest_id
        ];
        
    }

    public function getFeedback($data) {
        if (!isset($data["feedback_ID"])) {
            return $this->error("Post parameters are missing");
          }

        $fID = trim($data["feedback_ID"]);

        $sql = "SELECT * FROM FEEDBACK WHERE Feedback_ID = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $fID);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();

        return [
            "status" => "success",
            "timestamp" => time(),
            "result" => $result
        ];

    }

    public function getContact($data) {
        if (!isset($data["user_ID"])) {
            return $this->error("Post parameters are missing");
          }

        $uID = trim($data["user_ID"]);

        $sql = "SELECT * FROM USER_CONTACT_INFO WHERE User_ID = ?";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $uID);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();

        return [
            "status" => "success",
            "timestamp" => time(),
            "result" => $result
        ];

    }

    public function addService($data) {
        if (!isset($data["name"], $data["description"],  $data["category"], $data["price"], $data["status"]))
            return $this->error("Post parameters are missing");

        $name = trim($data["name"]);
        $desc = trim($data["description"]);
        $category = trim($data["category"]);
        $price = trim($data["price"]);
        $status = trim($data["status"]);

        $sql = "INSERT INTO PRODUCT_SERVICE (Name, Description, Category, Price, Availability_Status) VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("sssds", $name, $desc, $category, $price, $status);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $service_id = $this->conn->insert_id;
        return [
            "status" => "success",
            "timestamp" => time(),
            "service_id" => $service_id
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
