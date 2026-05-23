<?php


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

    //filters
    $params = [];// values to bind
    $types = "";// type string for bind_param

    // Filter: destination (country or city match)
    if (!empty($data["destination"])) {
        $dest = "%" . trim($data["destination"]) . "%";
        $sql .= " AND (d.Country LIKE ? OR d.City LIKE ?)";
        $params[] = $dest;//first ?
        $params[] = $dest;
        $types .= "ss";//both strings 
    }

    // Filter: min price
    if (isset($data["min_price"]) && is_numeric($data["min_price"])) {
        $sql .= " AND p.Base_Price >= ?";
        $params[] = (float)$data["min_price"];
        $types .= "d";//double
    }

    // Filter: max price
    if (isset($data["max_price"]) && is_numeric($data["max_price"])) {
        $sql .= " AND p.Base_Price <= ?";
        $params[] = (float)$data["max_price"];
        $types .= "d";
    }

    // Filter: duration (exact match e.g. "7 days")
    if (!empty($data["duration"])) {
        $sql .= " AND p.Duration = ?";
        $params[] = trim($data["duration"]);
        $types .= "s";
    }

    // Filter: package type (solo/couple/group/family)
    if (!empty($data["package_type"])) {
        $allowed = ["solo", "couple", "group", "family"];
        if (!in_array($data["package_type"], $allowed)) return $this->error("Invalid package type");
        $sql .= " AND po.Package_Type = ?";
        $params[] = $data["package_type"];
        $types .= "s";
    }

    // Filter: minimum avg rating
    if (isset($data["min_rating"]) && is_numeric($data["min_rating"])) {
        $sql .= " AND (SELECT AVG(f2.Rating) FROM FEEDBACK f2 WHERE f2.Package_ID = p.Package_ID) >= ?";
        $params[] = (float)$data["min_rating"];
        $types   .= "d";
    }

    //Group by package
    $sql .= " GROUP BY p.Package_ID, p.Name, p.Description, p.Base_Price, p.Duration, p.Package_Status,
        a.Company_Name, d.Country, d.City";

    //Sort
    $allowed_sorts = [
        "price_asc" => "p.Base_Price ASC",
        "price_desc" => "p.Base_Price DESC",
        "rating_desc" => "Avg_Rating DESC",
        "duration_asc" => "p.Duration ASC",
        "name_asc" => "p.Name ASC"
    ];
    $sort = $data["sort"] ?? "name_asc";
    $sql .= " ORDER BY " . ($allowed_sorts[$sort] ?? "p.Name ASC");

    //Prepare and execute
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



public function getPackageDetail($data) {
    if (!isset($data["package_id"]))
        return $this->error("Post parameters are missing");

    $pid = (int)$data["package_id"];
    if ($pid <= 0)
        return $this->error("Invalid package ID");

    //Package + Agency info
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
    if (!$stmt) return $this->error("Connection failed", "db");
    $stmt->bind_param("i", $pid);
    if (!$stmt->execute()) return $this->error("Query failed", "db");
    $result = $stmt->get_result();
    if ($result->num_rows === 0)
        return $this->error("Package not found");
    $package = $result->fetch_assoc();

    //Package options
    $sql = "
        SELECT Package_Type, Participants_Min, Participants_Max,
               Final_Price, Description
        FROM PACKAGE_OPTION
        WHERE Package_ID = ?
    ";
    $stmt = $this->conn->prepare($sql);
    if (!$stmt) return $this->error("Connection failed", "db");
    $stmt->bind_param("i", $pid);
    if (!$stmt->execute()) return $this->error("Query failed", "db");
    $result = $stmt->get_result();
    $options = [];
    while ($row = $result->fetch_assoc()) {
        $options[] = $row;
    }

    //Experiences (all subtypes joined)
    $sql = "
        SELECT
            e.Experience_ID, e.Name, e.Category,
            e.Description, e.Availability_Status,
            d.Country, d.City,
            poe.Package_Type,
            -- Accommodation fields
            acc.Star_Rating, acc.Room_Capacity,
            acc.Number_Of_Rooms, acc.Price_Per_Night,
            -- Restaurant fields
            r.Cuisine_Type, r.Opening_Hours AS Rest_Opening_Hours, r.Price_Range,
            -- Attraction fields
            atr.Attraction_Type, atr.Opening_Hours AS Attr_Opening_Hours, atr.Entry_Fee,
            -- Activity fields
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
    if (!$stmt) return $this->error("Connection failed", "db");
    $stmt->bind_param("i", $pid);
    if (!$stmt->execute()) return $this->error("Query failed", "db");
    $result = $stmt->get_result();
    $experiences = [];
    while ($row = $result->fetch_assoc()) {
        $experiences[] = $row;
    }

    //Flights
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

    //Reviews/Feedback
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
    if (!$stmt) return $this->error("Connection failed", "db");
    $stmt->bind_param("i", $pid);
    if (!$stmt->execute()) return $this->error("Query failed", "db");
    $result = $stmt->get_result();
    $reviews = [];
    while ($row = $result->fetch_assoc()) {
        $reviews[] = $row;
    }

    //Avg rating
    $avg_rating = null;
    if (count($reviews) > 0) {
        $total = array_sum(array_column($reviews, "Rating"));//get all ratings
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

public function comparePackages($data) {
        if (!isset($data["package_ids"]) || !is_array($data["package_ids"]) || count($data["package_ids"]) < 2)
            return $this->error("Provide at least 2 package_ids as an array");
 
        $ids = array_map("intval", $data["package_ids"]);
        $ids = array_filter($ids, fn($id) => $id > 0);
        if (count($ids) < 2) return $this->error("Invalid package IDs");
 
        $placeholders = implode(",", array_fill(0, count($ids), "?"));
        $types = str_repeat("i", count($ids));
 
        $stmt = $this->conn->prepare("
            SELECT
                p.Package_ID, p.Name, p.Description,
                p.Base_Price, p.Duration, p.Package_Status,
                a.Company_Name,
                ROUND(AVG(f.Rating), 1)       AS Avg_Rating,
                COUNT(DISTINCT f.Feedback_ID) AS Review_Count,
                MIN(po.Final_Price)           AS Min_Price,
                MAX(po.Final_Price)           AS Max_Price
            FROM PACKAGE p
            JOIN AGENCY a ON p.Agency_ID = a.Agency_ID
            LEFT JOIN PACKAGE_OPTION po ON p.Package_ID = po.Package_ID
            LEFT JOIN FEEDBACK f ON f.Package_ID = p.Package_ID
            WHERE p.Package_ID IN ($placeholders)
            GROUP BY p.Package_ID, p.Name, p.Description, p.Base_Price,
                     p.Duration, p.Package_Status, a.Company_Name
        ");
        if (!$stmt) return $this->error("Connection failed", "db");
        $stmt->bind_param($types, ...$ids);
        if (!$stmt->execute()) return $this->error("Query failed", "db");
 
        $res = $stmt->get_result();
        $packages = [];
        while ($row = $res->fetch_assoc()) $packages[] = $row;
 
        return [
            "status"    => "success",
            "timestamp" => time(),
            "data"      => $packages
        ];
    }

public function getGroupTrips($data) {
        $sql = "
            SELECT gt.Group_Trip_ID, gt.Trip_Name, gt.Start_Date, gt.End_Date,
                   gt.Join_Deadline, gt.Participants_Min, gt.Participants_Max,
                   gt.Participants_Current, gt.Trip_Status,
                   a.Agency_ID, a.Company_Name,
                   p.Package_ID, p.Name AS Package_Name, p.Base_Price
            FROM GROUP_TRIP gt
            JOIN AGENCY a ON gt.Agency_ID = a.Agency_ID
            LEFT JOIN PACKAGE p ON p.Agency_ID = a.Agency_ID
            WHERE 1=1
        ";
 
        $params = [];
        $types  = "";
 
        if (!empty($data["status"])) {
            $allowed = ["planned","open","full","in_progress","completed","cancelled"];
            if (!in_array($data["status"], $allowed)) return $this->error("Invalid trip status");
            $sql .= " AND gt.Trip_Status = ?";
            $params[] = $data["status"];
            $types .= "s";
        }
 
        if (!empty($data["agency_id"]) && is_numeric($data["agency_id"])) {
            $sql .= " AND gt.Agency_ID = ?";
            $params[] = (int)$data["agency_id"];
            $types .= "i";
        }
 
        $sql .= " GROUP BY gt.Group_Trip_ID ORDER BY gt.Start_Date ASC";
 
        $stmt = $this->conn->prepare($sql);
        if (!$stmt) return $this->error("Connection failed", "db");
        if (!empty($params)) $stmt->bind_param($types, ...$params);
        if (!$stmt->execute()) return $this->error("Query failed", "db");
 
        $res = $stmt->get_result();
        $trips = [];
        while ($row = $res->fetch_assoc()) $trips[] = $row;
 
        return ["status" => "success", "timestamp" => time(), "count" => count($trips), "data" => $trips];
}    