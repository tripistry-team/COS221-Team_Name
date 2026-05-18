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

if ($data["type"] === "Register") {
    echo json_encode($api->register($data));
} 

else if ($data["type"] === "Login") {
    echo json_encode($api->login($data));
} 

else if ($data["type"] === "InsertTypeHere") {
    echo json_encode($api->insertTypeHere());
} 

else {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "timestamp" => time(),
        "message" => "Invalid request type"
    ]);
}
