<?php

//This file contains intentional syntax errors to test if CI will catch them

function getPackages($conn, $filters) {
    $sql = "SELECT * FROM PACKAGE WHERE Package_Status = 'active'";
    
    if (isset($filters['continent']) {   //Missing closing parenthesis
        $sql .= " AND Continent = ?";
    }
    
    $stmt = $conn->prepare($sql)
    $stmt->execute();   // Missing semicolon on line above
    
    return $stmt->get_result()->fetch_all(MYSQLI_ASSOC)
}   //Missing semicolon

echo "Packages loaded"
?>