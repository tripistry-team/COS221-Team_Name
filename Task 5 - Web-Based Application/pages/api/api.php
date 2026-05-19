<?php

require_once "db.php";
require_once "api_controller.php";

use api\API;
use api\Database;

header("Content-Type: application/json");

$data = json_decode(file_get_contents("php://input"), true);

if (!$data || !isset($data["type"])) {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "timestamp" => time(),
        "message" => "Invalid JSON input"
    ]);
    exit;
}

$db = Database::getInstance();
$conn = $db->getConnection();

$api = new API($conn);

if ($data["type"] === "RegisterAgency") {
    echo json_encode($api->registerAgency($data));
} 

else if ($data["type"] === "RegisterTraveller") {
    echo json_encode($api->registerTraveller($data));
} 

else if ($data["type"] === "RegisterUser") {
    echo json_encode($api->registerUser($data));
} 

else if ($data["type"] === "Login") {
    echo json_encode($api->login($data));
} 

else if ($data["type"] === "Logout") {
    echo json_encode($api->logout());
} 

else if ($data["type"] === "GetFeature") {
    echo json_encode($api->getFeature($data));
} 

else if ($data["type"] === "GetPackages") {
    echo json_encode($api->getPackages($data));
}

else if ($data["type"] === "GetPackageDetails") {
    echo json_encode($api->getPackageDetails($data));
}

else if ($data["type"] === "GetDestinations") {
    echo json_encode($api->getDestinations());
}

else if ($data["type"] === "InsertEndpointHere") {
    echo json_encode($api->insertEndpointHere($data));
} 

else {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "timestamp" => time(),
        "message" => "Invalid request type"
    ]);
}
