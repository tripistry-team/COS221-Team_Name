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
            "data" => ["agency_id" => $agency_id]
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
            "data" => ["traveller_id" => $traveller_id]
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
            "data" => [
                "user_id" => $user_id,
                "id" => $id
            ]
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
        $_SESSION['type_id'] = $type_id;
        $_SESSION['username'] = $row["Username"];
        $_SESSION['user_type'] = $type;
        

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

    public function checkAuthorisation($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) {
            return [
                "status" => "success",
                "timestamp" => time(),
                "data" => ["logged_in" => false]
            ];
        }

        return [
            "status" => "success",
            "timestamp" => time(),
            "data" => [
                "logged_in" => true,
                "user_id" => $_SESSION['user_id'],
                "type_id" => $_SESSION['type_id'],
                "username" => $_SESSION['username'],
                "user_type" => $_SESSION['user_type']
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
        $sql = "
            SELECT
                p.Package_ID,
                p.Name,
                p.Description,
                p.Base_Price,
                p.Duration,
                p.Package_Status,
                GROUP_CONCAT(DISTINCT a.Company_Name ORDER BY a.Company_Name SEPARATOR ', ') AS Agencies,
                d.Country,
                d.City,
                ROUND(AVG(f.Rating), 1)         AS Avg_Rating,
                COUNT(DISTINCT f.Feedback_ID)   AS Review_Count,
                MIN(po.Final_Price)             AS Min_Price,
                MAX(po.Final_Price)             AS Max_Price
            FROM PACKAGE p
            JOIN AGENCY_DESIGNS_PACKAGE adp
                ON p.Package_ID = adp.Package_ID
            JOIN AGENCY a
                ON adp.Agency_ID = a.Agency_ID
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
            d.Country, d.City";

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
        if (!isset($data["package_id"]))
            return $this->error("Post parameters are missing");

        $pid = (int)$data["package_id"];
        if ($pid <= 0)
            return $this->error("Invalid package ID");

        // Package
        $sql = "
            SELECT
                p.Package_ID, p.Name, p.Description,
                p.Base_Price, p.Duration, p.Package_Status
            FROM PACKAGE p
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

        // Agencies
        $sql = "
            SELECT a.Agency_ID, a.Company_Name, a.Email AS Agency_Email, a.Description AS Agency_Description
            FROM AGENCY_DESIGNS_PACKAGE adp
            JOIN AGENCY a ON adp.Agency_ID = a.Agency_ID
            WHERE adp.Package_ID = ?
        ";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt)
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $pid);
        if (!$stmt->execute())
            return $this->error("Query failed", "db");
        $result  = $stmt->get_result();
        $agencies = [];
        while ($row = $result->fetch_assoc()) {
            $agencies[] = $row;
        }
        $package["agencies"] = $agencies;

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
        if (!in_array($data["category"], $allowed)) 
            return $this->error("Invalid category");

        $allowed = ["available", "unavailable", "seasonal"];
        if (!in_array($data["availability_status"], $allowed)) 
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
            "data" => ["experience_id" => $experience_id]
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
       
        $sql = "SELECT Category FROM EXPERIENCE WHERE Experience_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid experience id");

        $row = $result->fetch_assoc();
        if ($row["Category"] != "accommodation")
             return $this->error("The specified experience is not of category 'accommodation'");

        //===

        $sql = "INSERT INTO ACCOMMODATION (Experience_ID, Star_Rating, Room_Capacity, Number_Of_Rooms, Price_Per_Night) 
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("iiiid", $id, $stars, $capacity, $rooms, $ppn);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        return [
            "status" => "success",
            "timestamp" => time()
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
       
        $sql = "SELECT Category FROM EXPERIENCE WHERE Experience_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid experience id");

        $row = $result->fetch_assoc();
        if ($row["Category"] != "restaurant")
             return $this->error("The specified experience is not of category 'restaurant'");

        //===

        $sql = "INSERT INTO RESTAURANT (Experience_ID, Cuisine_Type, Opening_Hours, Price_Range) 
                VALUES (?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("isss", $id, $cuisine, $opening_hours, $price_range);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        return [
            "status" => "success",
            "timestamp" => time()
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
       
        $sql = "SELECT Category FROM EXPERIENCE WHERE Experience_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid experience id");

        $row = $result->fetch_assoc();
        if ($row["Category"] != "activity")
             return $this->error("The specified experience is not of category 'activity'");

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

        return [
            "status" => "success",
            "timestamp" => time()
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
       
        $sql = "SELECT Category FROM EXPERIENCE WHERE Experience_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid experience id");

        $row = $result->fetch_assoc();
        if ($row["Category"] != "attraction")
             return $this->error("The specified experience is not of category 'attraction'");

        //===

        $sql = "INSERT INTO ATTRACTION (Experience_ID, Attraction_Type, Opening_Hours, Entry_Fee) 
                VALUES (?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("issd", $id, $type, $opening_hours, $fee);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        return [
            "status" => "success",
            "timestamp" => time()
        ];
    }

    public function addPackage($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["name"], $data["description"], $data["base_price"], $data["duration"], $data["status"]))
                return $this->error("Post parameters are missing");

        $allowed = ["draft", "active", "archived"];
        if (!in_array($data["status"], $allowed)) 
            return $this->error("Invalid package status");

        $name = trim($data["name"]);
        $description = trim($data["description"]);
        $price = (float)$data["base_price"];
        $duration = (int)$data["duration"];
        $status = $data["status"];

        if (!$name || !$description)
            return $this->error("Post parameters are empty");

        //===

        $sql = "INSERT INTO PACKAGE (Name, Description, Base_Price, Duration, Package_Status) 
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("ssdis", $name, $description, $price, $duration, $status);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $package_id = $this->conn->insert_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "data" => ["package_id" => $package_id]
        ];
    }

    public function addPackageAgency($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["agency_id"], $data["package_id"]))
                return $this->error("Post parameters are missing");

        $agency_id = (int)$data["agency_id"];
        $package_id = (int)$data["package_id"];

        $sql = "SELECT Agency_ID FROM AGENCY WHERE Agency_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $agency_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid agency id");

        $sql = "SELECT Package_ID FROM PACKAGE WHERE Package_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $package_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid package id");

        //===

        $sql = "INSERT IGNORE INTO AGENCY_DESIGNS_PACKAGE (Agency_ID, Package_ID) VALUES (?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("ii", $agency_id, $package_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        return [
            "status" => "success",
            "timestamp" => time()
        ];
    }

    public function addPackageOption($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["package_id"], $data["package_type"], $data["participants_min"], $data["participants_max"], 
            $data["final_price"], $data["description"]))
                return $this->error("Post parameters are missing");

        $allowed = ["solo", "couple", "group", "family"];
        if (!in_array($data["package_type"], $allowed)) 
            return $this->error("Invalid package type");

        $id = (int)$data["package_id"];
        $type = $data["package_type"];
        $min = (int)$data["participants_min"];
        $max = (int)$data["participants_max"];
        $price = (float)$data["final_price"];
        $description = trim($data["description"]);

        if (!$description)
            return $this->error("Post parameters are empty");

        $sql = "SELECT Package_ID FROM PACKAGE WHERE Package_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid package id");

        //===

        $sql = "INSERT INTO PACKAGE_OPTION 
                (Package_ID, Package_Type, Participants_Min, Participants_Max, Final_Price, Description) 
                VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("isiids", $id, $type, $min, $max, $price, $description);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        return [
            "status" => "success",
            "timestamp" => time()
        ];
    }

    public function addPackageOptionExperience($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["package_id"], $data["package_type"], $data["experience_id"]))
                return $this->error("Post parameters are missing");

        $package_id = (int)$data["package_id"];
        $type = $data["package_type"];
        $experience_id = (int)$data["experience_id"];

        if (!$type)
            return $this->error("Post parameters are empty");

        $sql = "SELECT Package_ID, Package_Type FROM PACKAGE_OPTION WHERE Package_ID = ? AND Package_Type = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("is", $package_id, $type);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid package option");

        $sql = "SELECT Experience_ID FROM EXPERIENCE WHERE Experience_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $experience_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid experience id");

        //===

        $sql = "INSERT INTO PACKAGE_OPTION_EXPERIENCE (Package_ID, Package_Type, Experience_ID) 
                VALUES (?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("isi", $package_id, $type, $experience_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        return [
            "status" => "success",
            "timestamp" => time()
        ];
    }

    public function addPackageOptionFlight($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["package_id"], $data["package_type"], $data["flight_id"], $data["seats"]))
                return $this->error("Post parameters are missing");

        $package_id = (int)$data["package_id"];
        $type = $data["package_type"];
        $flight_id = (int)$data["flight_id"];
        $seats = (int)$data["seats"];

        if (!$type)
            return $this->error("Post parameters are empty");

        if ($seats < 1) 
            return $this->error("Invalid seats");

        $sql = "SELECT Package_ID, Package_Type FROM PACKAGE_OPTION WHERE Package_ID = ? AND Package_Type = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("is", $package_id, $type);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid package option");

        $sql = "SELECT Flight_ID FROM FLIGHT WHERE Flight_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $flight_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid flight id");

        //===

        $sql = "INSERT INTO PACKAGE_OPTION_FLIGHT (Package_ID, Package_Type, Flight_ID, Seats_Allocated) 
                VALUES (?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("isii", $package_id, $type, $flight_id, $seats);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        return [
            "status" => "success",
            "timestamp" => time()
        ];
    }

    public function addPackageOptionService($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["package_id"], $data["package_type"], $data["product_service_id"]))
                return $this->error("Post parameters are missing");

        $package_id = (int)$data["package_id"];
        $type = $data["package_type"];
        $service_id = (int)$data["product_service_id"];

        if (!$type)
            return $this->error("Post parameters are empty");

        $sql = "SELECT Package_ID, Package_Type FROM PACKAGE_OPTION WHERE Package_ID = ? AND Package_Type = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("is", $package_id, $type);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid package option");

        $sql = "SELECT Product_Service_ID FROM PRODUCT_SERVICE WHERE Product_Service_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $service_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid product service id");

        //===

        $sql = "INSERT INTO PACKAGE_OPTION_SERVICE (Package_ID, Package_Type, Product_Service_ID) 
                VALUES (?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("isi", $package_id, $type, $service_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        return [
            "status" => "success",
            "timestamp" => time()
        ];
    }

    public function addBooking($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "traveller")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["date"], $data["status"], $data["num_people"], $data["total_price"], $data["traveller_id"]))
                return $this->error("Post parameters are missing");

        $allowed = ["pending", "confirmed", "cancelled", "completed"];
        if (!in_array($data["status"], $allowed)) 
            return $this->error("Invalid booking status");

        $date = $data["date"];
        $status = $data["status"];
        $num_people = (int)$data["num_people"];
        $price = (float)$data["total_price"];
        $traveller_id = (int)$data["traveller_id"];

        if (!$status || !$date)
            return $this->error("Post parameters are empty");

        $sql = "SELECT Traveller_ID FROM TRAVELLER WHERE Traveller_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $traveller_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid traveller id");

        //===

        $sql = "INSERT INTO Booking (Booking_Date, Booking_Status, Number_Of_People, Total_Price, Traveller_ID) 
                VALUES (?, ?, ?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("ssidi", $date, $status, $num_people, $price, $traveller_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $booking_id = $this->conn->insert_id;

        return [
            "status" => "success",
            "timestamp" => time(),
            "data" => ["booking_id" => $booking_id]
        ];
    }

    public function addBookingPackageOption($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "traveller")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["booking_id"], $data["package_id"], $data["package_type"]))
                return $this->error("Post parameters are missing");

        $booking_id = (int)$data["booking_id"];
        $package_id = (int)$data["package_id"];
        $type = $data["package_type"];

        $sql = "SELECT Package_ID, Package_Type FROM PACKAGE_OPTION WHERE Package_ID = ? AND Package_Type = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("is", $package_id, $type);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid package option");

        $sql = "SELECT Booking_ID FROM BOOKING WHERE Booking_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $booking_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid booking id");

        //===

        $sql = "INSERT INTO BOOKING_PACKAGE_OPTION (Booking_ID, Package_ID, Package_Type) VALUES (?, ?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("iis", $booking_id, $package_id, $type);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        return [
            "status" => "success",
            "timestamp" => time(),
        ];
    }

    public function addBookingService($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "traveller")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["booking_id"], $data["product_service_id"]))
                return $this->error("Post parameters are missing");

        $booking_id = (int)$data["booking_id"];
        $service_id = (int)$data["product_service_id"];

        $sql = "SELECT Product_Service_ID FROM PRODUCT_SERVICE WHERE Product_Service_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $service_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid product or service");

        $sql = "SELECT Booking_ID FROM BOOKING WHERE Booking_ID = ?";        
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("i", $booking_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        $result = $stmt->get_result();
        if ($result->num_rows == 0)
            return $this->error("Invalid booking id");

        //===

        $sql = "INSERT INTO BOOKING_PRODUCT_SERVICE (Booking_ID, Product_Service_ID) VALUES (?, ?)";
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("ii", $booking_id, $service_id);
        if (!$stmt->execute()) 
            return $this->error("Insert failed", "db");

        return [
            "status" => "success",
            "timestamp" => time(),
        ];
    }

    public function updateStatus($data) {
        if (!isset($_SESSION['user_id'], $_SESSION['user_type'])) 
            return $this->error("Not authenticated", "cred");

        if ($_SESSION['user_type'] !== "agency_staff")
            return $this->error("Invalid user type", "fbdn");

        if (!isset($data["feature"], $data["id"], $data["status"])) 
            return $this->error("Post parameters are missing");

        $allowed = ["booking", "experience", "package", "product_service"];
        if (!in_array($data["feature"], $allowed)) 
            return $this->error("Invalid feature");

        $feature = $data["feature"];
        $id = (int)$data["id"];
        $status = trim($data["status"]);

        if ($feature === "booking") {
            $allowed = ["pending", "confirmed", "cancelled", "completed"];
            if (!in_array($data["status"], $allowed)) 
                return $this->error("Invalid status");

            $sql = "UPDATE BOOKING SET Booking_Status = ? WHERE Booking_ID = ?";
        }

        if ($feature === "experience") {
            $allowed = ["available", "unavailable", "seasonal"];
            if (!in_array($data["status"], $allowed)) 
                return $this->error("Invalid status");

            $sql = "UPDATE EXPERIENCE SET Availability_Status = ? WHERE Experience_ID = ?";
        }

        if ($feature === "package") {
            $allowed = ["draft", "active", "archived"];
            if (!in_array($data["status"], $allowed)) 
                return $this->error("Invalid status");

            $sql = "UPDATE PACKAGE SET Package_Status = ? WHERE Package_ID = ?";
        }

        if ($feature === "product_service") {
            $allowed = ["available", "unavailable", "seasonal"];
            if (!in_array($data["status"], $allowed)) 
                return $this->error("Invalid status");

            $sql = "UPDATE PRODUCT_SERVICE SET Availability_Status = ? WHERE Product_Service_ID = ?";
        }

        $stmt = $this->conn->prepare($sql);
        if (!$stmt) 
            return $this->error("Connection failed", "db");
        $stmt->bind_param("si", $status, $id);
        if (!$stmt->execute()) 
            return $this->error("Update failed", "db");

        return [
            "status" => "success",
            "timestamp" => time(),
        ];
    }


    //=====================================================================================


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
