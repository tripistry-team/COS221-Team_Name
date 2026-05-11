/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-12.2.2-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: team27_triptistry
-- ------------------------------------------------------
-- Server version	12.2.2-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `accommodation`
--

DROP TABLE IF EXISTS `accommodation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `accommodation` (
  `Accommodation_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Star_Rating` tinyint(4) NOT NULL,
  `Room_Capacity` int(11) NOT NULL,
  `Number_Of_Rooms` int(11) NOT NULL,
  `Price_Per_Night` decimal(10,2) NOT NULL,
  `Experience_ID` int(11) DEFAULT NULL,
  PRIMARY KEY (`Accommodation_ID`),
  KEY `fk_acc_exp` (`Experience_ID`),
  CONSTRAINT `fk_acc_exp` FOREIGN KEY (`Experience_ID`) REFERENCES `experience` (`Experience_ID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_acc_star_rating` CHECK (`Star_Rating` between 1 and 5),
  CONSTRAINT `chk_acc_price` CHECK (`Price_Per_Night` >= 0),
  CONSTRAINT `chk_acc_rooms` CHECK (`Number_Of_Rooms` >= 1),
  CONSTRAINT `chk_acc_capacity` CHECK (`Room_Capacity` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `accommodation`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `accommodation` WRITE;
/*!40000 ALTER TABLE `accommodation` DISABLE KEYS */;
/*!40000 ALTER TABLE `accommodation` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `activity`
--

DROP TABLE IF EXISTS `activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `activity` (
  `Activity_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Activity_Type` varchar(100) NOT NULL,
  `Price_Range` varchar(50) NOT NULL,
  `Duration` varchar(50) NOT NULL,
  `Age_Restriction` varchar(50) DEFAULT NULL,
  `Capacity` int(11) DEFAULT NULL,
  `Indoor_Outdoor` tinyint(1) NOT NULL,
  `Experience_ID` int(11) DEFAULT NULL,
  PRIMARY KEY (`Activity_ID`),
  KEY `fk_act_exp` (`Experience_ID`),
  CONSTRAINT `fk_act_exp` FOREIGN KEY (`Experience_ID`) REFERENCES `experience` (`Experience_ID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `activity`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `activity` WRITE;
/*!40000 ALTER TABLE `activity` DISABLE KEYS */;
/*!40000 ALTER TABLE `activity` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `agency`
--

DROP TABLE IF EXISTS `agency`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `agency` (
  `Agency_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Company_Name` varchar(150) NOT NULL,
  `Email` varchar(254) NOT NULL,
  `Description` text DEFAULT NULL,
  PRIMARY KEY (`Agency_ID`),
  UNIQUE KEY `uq_agency_email` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agency`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `agency` WRITE;
/*!40000 ALTER TABLE `agency` DISABLE KEYS */;
/*!40000 ALTER TABLE `agency` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `agency_designs_package`
--

DROP TABLE IF EXISTS `agency_designs_package`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `agency_designs_package` (
  `Agency_ID` int(11) NOT NULL,
  `Package_ID` int(11) NOT NULL,
  PRIMARY KEY (`Agency_ID`,`Package_ID`),
  KEY `fk_ag_package` (`Package_ID`),
  CONSTRAINT `fk_ag_agency` FOREIGN KEY (`Agency_ID`) REFERENCES `agency` (`Agency_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ag_package` FOREIGN KEY (`Package_ID`) REFERENCES `package` (`Package_ID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agency_designs_package`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `agency_designs_package` WRITE;
/*!40000 ALTER TABLE `agency_designs_package` DISABLE KEYS */;
/*!40000 ALTER TABLE `agency_designs_package` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `attraction`
--

DROP TABLE IF EXISTS `attraction`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `attraction` (
  `Attraction_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Attraction_Type` varchar(100) NOT NULL,
  `Opening_Hours` varchar(100) NOT NULL,
  `Entry_Fee` decimal(10,2) NOT NULL DEFAULT 0.00,
  `Experience_ID` int(11) DEFAULT NULL,
  `Destination_ID` int(11) DEFAULT NULL,
  PRIMARY KEY (`Attraction_ID`),
  KEY `fk_attr_exp` (`Experience_ID`),
  KEY `fk_attr_destination` (`Destination_ID`),
  CONSTRAINT `fk_attr_destination` FOREIGN KEY (`Destination_ID`) REFERENCES `destination` (`Destination_ID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_attr_exp` FOREIGN KEY (`Experience_ID`) REFERENCES `experience` (`Experience_ID`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `chk_attr_entry_fee` CHECK (`Entry_Fee` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attraction`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `attraction` WRITE;
/*!40000 ALTER TABLE `attraction` DISABLE KEYS */;
/*!40000 ALTER TABLE `attraction` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `booking`
--

DROP TABLE IF EXISTS `booking`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking` (
  `Booking_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Booking_Date` date NOT NULL,
  `Booking_Status` enum('pending','confirmed','cancelled','completed') NOT NULL,
  `Number_Of_People` int(11) NOT NULL,
  `Total_Price` decimal(10,2) NOT NULL,
  `Traveller_ID` int(11) NOT NULL,
  PRIMARY KEY (`Booking_ID`),
  KEY `fk_bk_traveller` (`Traveller_ID`),
  CONSTRAINT `fk_bk_traveller` FOREIGN KEY (`Traveller_ID`) REFERENCES `traveller` (`Traveller_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_bk_price` CHECK (`Total_Price` >= 0),
  CONSTRAINT `chk_bk_people` CHECK (`Number_Of_People` >= 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `booking` WRITE;
/*!40000 ALTER TABLE `booking` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `booking_package_option`
--

DROP TABLE IF EXISTS `booking_package_option`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_package_option` (
  `Booking_ID` int(11) NOT NULL,
  `Package_ID` int(11) NOT NULL,
  `Package_Type` enum('solo','couple','group','family') NOT NULL,
  PRIMARY KEY (`Booking_ID`,`Package_ID`,`Package_Type`),
  KEY `fk_bkpo_option` (`Package_ID`,`Package_Type`),
  CONSTRAINT `fk_bkpo_booking` FOREIGN KEY (`Booking_ID`) REFERENCES `booking` (`Booking_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bkpo_option` FOREIGN KEY (`Package_ID`, `Package_Type`) REFERENCES `package_option` (`Package_ID`, `Package_Type`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_package_option`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `booking_package_option` WRITE;
/*!40000 ALTER TABLE `booking_package_option` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_package_option` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `booking_product_service`
--

DROP TABLE IF EXISTS `booking_product_service`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `booking_product_service` (
  `Booking_ID` int(11) NOT NULL,
  `Product_Service_ID` int(11) NOT NULL,
  PRIMARY KEY (`Booking_ID`,`Product_Service_ID`),
  KEY `fk_bks_service` (`Product_Service_ID`),
  CONSTRAINT `fk_bks_booking` FOREIGN KEY (`Booking_ID`) REFERENCES `booking` (`Booking_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_bks_service` FOREIGN KEY (`Product_Service_ID`) REFERENCES `product_service` (`Product_Service_ID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `booking_product_service`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `booking_product_service` WRITE;
/*!40000 ALTER TABLE `booking_product_service` DISABLE KEYS */;
/*!40000 ALTER TABLE `booking_product_service` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `destination`
--

DROP TABLE IF EXISTS `destination`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `destination` (
  `Destination_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Climate` varchar(100) DEFAULT NULL,
  `Experience_ID` int(11) DEFAULT NULL,
  PRIMARY KEY (`Destination_ID`),
  KEY `fk_dest_exp` (`Experience_ID`),
  CONSTRAINT `fk_dest_exp` FOREIGN KEY (`Experience_ID`) REFERENCES `experience` (`Experience_ID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `destination`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `destination` WRITE;
/*!40000 ALTER TABLE `destination` DISABLE KEYS */;
/*!40000 ALTER TABLE `destination` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `experience`
--

DROP TABLE IF EXISTS `experience`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `experience` (
  `Experience_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(200) NOT NULL,
  `Description` text DEFAULT NULL,
  `Location` varchar(255) DEFAULT NULL,
  `Category` varchar(100) NOT NULL,
  `Availability_Status` enum('available','unavailable','seasonal') NOT NULL,
  PRIMARY KEY (`Experience_ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `experience`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `experience` WRITE;
/*!40000 ALTER TABLE `experience` DISABLE KEYS */;
/*!40000 ALTER TABLE `experience` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback` (
  `Feedback_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Rating` tinyint(4) NOT NULL,
  `Comment` text DEFAULT NULL,
  `Response` text DEFAULT NULL,
  `Last_Updated` datetime NOT NULL DEFAULT current_timestamp(),
  `Traveller_ID` int(11) NOT NULL,
  `Package_ID` int(11) NOT NULL,
  `Package_Type` enum('solo','couple','group','family') NOT NULL,
  PRIMARY KEY (`Feedback_ID`),
  KEY `fk_fb_traveller` (`Traveller_ID`),
  KEY `fk_fb_package_option` (`Package_ID`,`Package_Type`),
  CONSTRAINT `fk_fb_package_option` FOREIGN KEY (`Package_ID`, `Package_Type`) REFERENCES `package_option` (`Package_ID`, `Package_Type`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_fb_traveller` FOREIGN KEY (`Traveller_ID`) REFERENCES `traveller` (`Traveller_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_fb_rating` CHECK (`Rating` between 1 and 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `flight`
--

DROP TABLE IF EXISTS `flight`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `flight` (
  `Flight_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Flight_Number` varchar(10) NOT NULL,
  `Airline` varchar(100) NOT NULL,
  `Departure_Airport` varchar(100) NOT NULL,
  `Departure_DateTime` datetime NOT NULL,
  `Arrival_Airport` varchar(100) NOT NULL,
  `Arrival_DateTime` datetime NOT NULL,
  `Price` decimal(10,2) NOT NULL,
  `Available_Seats` int(11) NOT NULL,
  `Seat_Class` varchar(50) NOT NULL,
  PRIMARY KEY (`Flight_ID`),
  CONSTRAINT `chk_fl_price` CHECK (`Price` >= 0),
  CONSTRAINT `chk_fl_seats` CHECK (`Available_Seats` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flight`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `flight` WRITE;
/*!40000 ALTER TABLE `flight` DISABLE KEYS */;
/*!40000 ALTER TABLE `flight` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `group_trip`
--

DROP TABLE IF EXISTS `group_trip`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `group_trip` (
  `Group_Trip_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Trip_Name` varchar(200) NOT NULL,
  `Start_Date` date NOT NULL,
  `End_Date` date NOT NULL,
  `Join_Deadline` date DEFAULT NULL,
  `Participants_Min` int(11) NOT NULL,
  `Participants_Max` int(11) NOT NULL,
  `Participants_Current` int(11) NOT NULL DEFAULT 0,
  `Trip_Status` enum('planned','open','full','in_progress','completed','cancelled') NOT NULL,
  `Agency_ID` int(11) NOT NULL,
  PRIMARY KEY (`Group_Trip_ID`),
  KEY `fk_gt_agency` (`Agency_ID`),
  CONSTRAINT `fk_gt_agency` FOREIGN KEY (`Agency_ID`) REFERENCES `agency` (`Agency_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_gt_dates` CHECK (`End_Date` > `Start_Date`),
  CONSTRAINT `chk_gt_participants` CHECK (`Participants_Max` >= `Participants_Min`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `group_trip`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `group_trip` WRITE;
/*!40000 ALTER TABLE `group_trip` DISABLE KEYS */;
/*!40000 ALTER TABLE `group_trip` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `package`
--

DROP TABLE IF EXISTS `package`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `package` (
  `Package_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(200) NOT NULL,
  `Description` text DEFAULT NULL,
  `Base_Price` decimal(10,2) NOT NULL,
  `Duration` varchar(100) NOT NULL,
  `Package_Status` enum('draft','active','archived') NOT NULL,
  PRIMARY KEY (`Package_ID`),
  CONSTRAINT `chk_pkg_price` CHECK (`Base_Price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `package` WRITE;
/*!40000 ALTER TABLE `package` DISABLE KEYS */;
/*!40000 ALTER TABLE `package` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `package_option`
--

DROP TABLE IF EXISTS `package_option`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `package_option` (
  `Package_ID` int(11) NOT NULL,
  `Package_Type` enum('solo','couple','group','family') NOT NULL,
  `Participants_Min` int(11) NOT NULL,
  `Participants_Max` int(11) NOT NULL,
  `Final_Price` decimal(10,2) NOT NULL,
  `Description` text DEFAULT NULL,
  PRIMARY KEY (`Package_ID`,`Package_Type`),
  CONSTRAINT `fk_po_package` FOREIGN KEY (`Package_ID`) REFERENCES `package` (`Package_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `chk_po_price` CHECK (`Final_Price` >= 0),
  CONSTRAINT `chk_po_participants` CHECK (`Participants_Max` >= `Participants_Min`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_option`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `package_option` WRITE;
/*!40000 ALTER TABLE `package_option` DISABLE KEYS */;
/*!40000 ALTER TABLE `package_option` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `package_option_experience`
--

DROP TABLE IF EXISTS `package_option_experience`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `package_option_experience` (
  `Package_ID` int(11) NOT NULL,
  `Package_Type` enum('solo','couple','group','family') NOT NULL,
  `Experience_ID` int(11) NOT NULL,
  PRIMARY KEY (`Package_ID`,`Package_Type`,`Experience_ID`),
  KEY `fk_poe_experience` (`Experience_ID`),
  CONSTRAINT `fk_poe_experience` FOREIGN KEY (`Experience_ID`) REFERENCES `experience` (`Experience_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_poe_option` FOREIGN KEY (`Package_ID`, `Package_Type`) REFERENCES `package_option` (`Package_ID`, `Package_Type`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_option_experience`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `package_option_experience` WRITE;
/*!40000 ALTER TABLE `package_option_experience` DISABLE KEYS */;
/*!40000 ALTER TABLE `package_option_experience` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `package_option_flight`
--

DROP TABLE IF EXISTS `package_option_flight`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `package_option_flight` (
  `Package_ID` int(11) NOT NULL,
  `Package_Type` enum('solo','couple','group','family') NOT NULL,
  `Flight_ID` int(11) NOT NULL,
  `Seats_Allocated` int(11) NOT NULL,
  PRIMARY KEY (`Package_ID`,`Package_Type`,`Flight_ID`),
  KEY `fk_pof_flight` (`Flight_ID`),
  CONSTRAINT `fk_pof_flight` FOREIGN KEY (`Flight_ID`) REFERENCES `flight` (`Flight_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pof_option` FOREIGN KEY (`Package_ID`, `Package_Type`) REFERENCES `package_option` (`Package_ID`, `Package_Type`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_option_flight`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `package_option_flight` WRITE;
/*!40000 ALTER TABLE `package_option_flight` DISABLE KEYS */;
/*!40000 ALTER TABLE `package_option_flight` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `package_option_service`
--

DROP TABLE IF EXISTS `package_option_service`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `package_option_service` (
  `Package_ID` int(11) NOT NULL,
  `Package_Type` enum('solo','couple','group','family') NOT NULL,
  `Product_Service_ID` int(11) NOT NULL,
  PRIMARY KEY (`Package_ID`,`Package_Type`,`Product_Service_ID`),
  KEY `fk_pos_service` (`Product_Service_ID`),
  CONSTRAINT `fk_pos_option` FOREIGN KEY (`Package_ID`, `Package_Type`) REFERENCES `package_option` (`Package_ID`, `Package_Type`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_pos_service` FOREIGN KEY (`Product_Service_ID`) REFERENCES `product_service` (`Product_Service_ID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `package_option_service`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `package_option_service` WRITE;
/*!40000 ALTER TABLE `package_option_service` DISABLE KEYS */;
/*!40000 ALTER TABLE `package_option_service` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `product_service`
--

DROP TABLE IF EXISTS `product_service`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_service` (
  `Product_Service_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Name` varchar(200) NOT NULL,
  `Description` text DEFAULT NULL,
  `Category` varchar(100) NOT NULL,
  `Price` decimal(10,2) NOT NULL,
  `Availability_Status` enum('available','unavailable','seasonal') NOT NULL,
  PRIMARY KEY (`Product_Service_ID`),
  CONSTRAINT `chk_ps_price` CHECK (`Price` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_service`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `product_service` WRITE;
/*!40000 ALTER TABLE `product_service` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_service` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `restaurant`
--

DROP TABLE IF EXISTS `restaurant`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `restaurant` (
  `Restaurant_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Cuisine_Type` varchar(100) NOT NULL,
  `Opening_Hours` varchar(100) NOT NULL,
  `Price_Range` varchar(50) NOT NULL,
  `Experience_ID` int(11) DEFAULT NULL,
  PRIMARY KEY (`Restaurant_ID`),
  KEY `fk_rest_exp` (`Experience_ID`),
  CONSTRAINT `fk_rest_exp` FOREIGN KEY (`Experience_ID`) REFERENCES `experience` (`Experience_ID`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `restaurant`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `restaurant` WRITE;
/*!40000 ALTER TABLE `restaurant` DISABLE KEYS */;
/*!40000 ALTER TABLE `restaurant` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `traveller`
--

DROP TABLE IF EXISTS `traveller`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `traveller` (
  `Traveller_ID` int(11) NOT NULL AUTO_INCREMENT,
  `First_Name` varchar(50) NOT NULL,
  `Mid_Initial` char(1) DEFAULT NULL,
  `Surname` varchar(50) NOT NULL,
  `Email` varchar(254) NOT NULL,
  `Country_Of_Residence` varchar(100) NOT NULL,
  PRIMARY KEY (`Traveller_ID`),
  UNIQUE KEY `uq_traveller_email` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `traveller`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `traveller` WRITE;
/*!40000 ALTER TABLE `traveller` DISABLE KEYS */;
/*!40000 ALTER TABLE `traveller` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `User_ID` int(11) NOT NULL AUTO_INCREMENT,
  `Username` varchar(50) NOT NULL,
  `Password` varchar(255) NOT NULL,
  `User_Type` enum('traveller','agency_staff','admin') NOT NULL,
  `Traveller_ID` int(11) DEFAULT NULL,
  `Agency_ID` int(11) DEFAULT NULL,
  PRIMARY KEY (`User_ID`),
  UNIQUE KEY `uq_username` (`Username`),
  KEY `fk_user_traveller` (`Traveller_ID`),
  KEY `fk_user_agency` (`Agency_ID`),
  CONSTRAINT `fk_user_agency` FOREIGN KEY (`Agency_ID`) REFERENCES `agency` (`Agency_ID`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_user_traveller` FOREIGN KEY (`Traveller_ID`) REFERENCES `traveller` (`Traveller_ID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;

--
-- Table structure for table `user_contact_info`
--

DROP TABLE IF EXISTS `user_contact_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_contact_info` (
  `Contact_ID` int(11) NOT NULL AUTO_INCREMENT,
  `User_ID` int(11) NOT NULL,
  `Contact_Info` varchar(255) NOT NULL,
  PRIMARY KEY (`Contact_ID`),
  KEY `fk_uci_user` (`User_ID`),
  CONSTRAINT `fk_uci_user` FOREIGN KEY (`User_ID`) REFERENCES `user` (`User_ID`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_uca1400_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_contact_info`
--

SET @OLD_AUTOCOMMIT=@@AUTOCOMMIT, @@AUTOCOMMIT=0;
LOCK TABLES `user_contact_info` WRITE;
/*!40000 ALTER TABLE `user_contact_info` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_contact_info` ENABLE KEYS */;
UNLOCK TABLES;
COMMIT;
SET AUTOCOMMIT=@OLD_AUTOCOMMIT;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-05-11 11:01:37
