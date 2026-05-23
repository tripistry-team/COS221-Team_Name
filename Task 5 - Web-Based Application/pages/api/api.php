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

else if ($data["type"] === "AddExperience") {
    echo json_encode($api->addExperience($data));
}

else if ($data["type"] === "AddAccommodation") {
    echo json_encode($api->addAccommodation($data));
}

else if ($data["type"] === "AddRestaurant") {
    echo json_encode($api->addRestaurant($data));
}

else if ($data["type"] === "AddActivity") {
    echo json_encode($api->addActivity($data));
}

else if ($data["type"] === "AddAttraction") {
    echo json_encode($api->addAttraction($data));
}

else if ($data["type"] === "InsertEndpointHere") {
    echo json_encode($api->insertEndpointHere($data));
} 

else if ($data["type"] === "AddContact") {
    echo json_encode($api->addContact($data));
} 
else if ($data["type"] === "AddFeedback") {
    echo json_encode($api->addFeedback($data));
} 
else if ($data["type"] === "AddResponse") {
    echo json_encode($api->addResponse($data));
} 

else if ($data["type"] === "AddFlight") {
    echo json_encode($api->addFlight($data));
} 

else if ($data["type"] === "AddDestination") {
    echo json_encode($api->addDestination($data));
} 

else if ($data["type"] === "GetFeedback") {
    echo json_encode($api->getFeedback($data));
}        

else if ($data["type"] === "GetContact") {
    echo json_encode($api->getContact($data));
} 

else if ($data["type"] === "AddService") {
    echo json_encode($api->addService($data));
} 

else if ($data["type"] === "GetBookings") {
    echo json_encode($api->getBookings($data));
} 

else if ($data["type"] === "GetBookingDetails") {
    echo json_encode($api->getBookingDetails($data));
} 

else {
    http_response_code(400);
    echo json_encode([
        "status" => "error",
        "timestamp" => time(),
        "message" => "Invalid request type"
    ]);
}
