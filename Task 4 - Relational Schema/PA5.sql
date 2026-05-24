SET FOREIGN_KEY_CHECKS = 0;
 
CREATE DATABASE IF NOT EXISTS team27_tripestry
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;
 
USE team27_tripestry;
 
-- =============================================================
-- TRAVELLER
-- =============================================================
CREATE TABLE TRAVELLER (
    Traveller_ID            INT             NOT NULL AUTO_INCREMENT,
    First_Name              VARCHAR(50)     NOT NULL,
    Mid_Initial             CHAR(1)         NULL,
    Surname                 VARCHAR(50)     NOT NULL,
    Email                   VARCHAR(254)    NOT NULL,
    Country_Of_Residence    VARCHAR(100)    NOT NULL,
 
    CONSTRAINT pk_traveller         PRIMARY KEY (Traveller_ID),
    CONSTRAINT uq_traveller_email   UNIQUE (Email)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- AGENCY
-- =============================================================
CREATE TABLE AGENCY (
    Agency_ID               INT             NOT NULL AUTO_INCREMENT,
    Company_Name            VARCHAR(150)    NOT NULL,
    Email                   VARCHAR(254)    NOT NULL,
    Description             TEXT            NULL,
 
    CONSTRAINT pk_agency            PRIMARY KEY (Agency_ID),
    CONSTRAINT uq_agency_email      UNIQUE (Email)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- USER
-- Union (category) of TRAVELLER and AGENCY.
-- Exactly one of Traveller_ID or Agency_ID must be set.
-- =============================================================
CREATE TABLE USER (
    User_ID                 INT             NOT NULL AUTO_INCREMENT,
    Username                VARCHAR(50)     NOT NULL,
    Password                VARCHAR(255)    NOT NULL,
    User_Type               ENUM('traveller','agency_staff','admin') NOT NULL,
    Traveller_ID            INT             NULL,
    Agency_ID               INT             NULL,
 
    CONSTRAINT pk_user              PRIMARY KEY (User_ID),
    CONSTRAINT uq_username          UNIQUE (Username),
    CONSTRAINT fk_user_traveller
        FOREIGN KEY (Traveller_ID) REFERENCES TRAVELLER(Traveller_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_user_agency
        FOREIGN KEY (Agency_ID) REFERENCES AGENCY(Agency_ID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE USER_CONTACT_INFO (
    Contact_ID      INT             NOT NULL AUTO_INCREMENT,
    User_ID         INT             NOT NULL,
    Contact_Info    VARCHAR(255)    NOT NULL,

    CONSTRAINT pk_contact_info      PRIMARY KEY (Contact_ID),
    CONSTRAINT fk_uci_user
        FOREIGN KEY (User_ID) REFERENCES USER(User_ID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;


-- =============================================================
-- PACKAGE
-- =============================================================
CREATE TABLE PACKAGE (
    Package_ID              INT             NOT NULL AUTO_INCREMENT,
    Name                    VARCHAR(200)    NOT NULL,
    Description             TEXT            NULL,
    Base_Price              DECIMAL(10,2)   NOT NULL,
    Duration                VARCHAR(100)    NOT NULL,
    Package_Status          ENUM('draft','active','archived') NOT NULL,
    Agency_ID               INT             NOT NULL,
 
    CONSTRAINT pk_package           PRIMARY KEY (Package_ID),
    CONSTRAINT fk_pkg_agency
        FOREIGN KEY (Agency_ID) REFERENCES AGENCY(Agency_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_pkg_price        CHECK (Base_Price >= 0)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- PACKAGE_OPTION
-- PK is composite: (Package_ID, Package_Type) per feedback
-- =============================================================
CREATE TABLE PACKAGE_OPTION (
    Package_ID              INT             NOT NULL,
    Package_Type            ENUM('solo','couple','group','family') NOT NULL,
    Participants_Min        INT             NOT NULL,
    Participants_Max        INT             NOT NULL,
    Final_Price             DECIMAL(10,2)   NOT NULL,
    Description             TEXT            NULL,
 
    CONSTRAINT pk_package_option    PRIMARY KEY (Package_ID, Package_Type),
    CONSTRAINT fk_po_package
        FOREIGN KEY (Package_ID) REFERENCES PACKAGE(Package_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_po_price         CHECK (Final_Price >= 0),
    CONSTRAINT chk_po_participants  CHECK (Participants_Max >= Participants_Min)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- GROUP_TRIP
-- INVOLVING: Group_Trip links to Booking via Booking_ID FK here
-- =============================================================
CREATE TABLE GROUP_TRIP (
    Group_Trip_ID           INT             NOT NULL AUTO_INCREMENT,
    Trip_Name               VARCHAR(200)    NOT NULL,
    Start_Date              DATE            NOT NULL,
    End_Date                DATE            NOT NULL,
    Join_Deadline           DATE            NULL,
    Participants_Min        INT             NOT NULL,
    Participants_Max        INT             NOT NULL,
    Participants_Current    INT             NOT NULL DEFAULT 0,
    Trip_Status             ENUM('planned','open','full','in_progress','completed','cancelled') NOT NULL,
    Agency_ID               INT             NOT NULL,
 
    CONSTRAINT pk_group_trip        PRIMARY KEY (Group_Trip_ID),
    CONSTRAINT fk_gt_agency
        FOREIGN KEY (Agency_ID) REFERENCES AGENCY(Agency_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_gt_dates         CHECK (End_Date > Start_Date),
    CONSTRAINT chk_gt_participants  CHECK (Participants_Max >= Participants_Min)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- BOOKING
-- INVOLVING relationship: Group_Trip_ID FK here (nullable)
-- No User_ID — Traveller_ID covers it
-- =============================================================
CREATE TABLE BOOKING (
    Booking_ID              INT             NOT NULL AUTO_INCREMENT,
    Booking_Date            DATE            NOT NULL,
    Booking_Status          ENUM('pending','confirmed','cancelled','completed') NOT NULL,
    Number_Of_People        INT             NOT NULL,
    Total_Price             DECIMAL(10,2)   NOT NULL,
    Traveller_ID            INT             NOT NULL,
    Package_ID              INT             NOT NULL,
    Package_Type            ENUM('solo','couple','group','family') NOT NULL,
 
    CONSTRAINT pk_booking           PRIMARY KEY (Booking_ID),
    CONSTRAINT fk_bk_traveller
        FOREIGN KEY (Traveller_ID) REFERENCES TRAVELLER(Traveller_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_bk_package_option
        FOREIGN KEY (Package_ID, Package_Type) REFERENCES PACKAGE_OPTION(Package_ID, Package_Type)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_bk_price         CHECK (Total_Price >= 0),
    CONSTRAINT chk_bk_people        CHECK (Number_Of_People >= 1)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- FEEDBACK
-- GIVES: Traveller gives Feedback
-- ON: Feedback on Package_Option
-- =============================================================
CREATE TABLE FEEDBACK (
    Feedback_ID             INT             NOT NULL AUTO_INCREMENT,
    Rating                  TINYINT         NOT NULL,
    Comment                 TEXT            NULL,
    Response                TEXT            NULL,
    Last_Updated            DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Traveller_ID            INT             NOT NULL,
    Package_ID              INT             NOT NULL,
    Package_Type            ENUM('solo','couple','group','family') NOT NULL,
 
    CONSTRAINT pk_feedback          PRIMARY KEY (Feedback_ID),
    CONSTRAINT fk_fb_traveller
        FOREIGN KEY (Traveller_ID) REFERENCES TRAVELLER(Traveller_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_fb_package_option
        FOREIGN KEY (Package_ID, Package_Type) REFERENCES PACKAGE_OPTION(Package_ID, Package_Type)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_fb_rating        CHECK (Rating BETWEEN 1 AND 5)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- PRODUCT_SERVICE
-- =============================================================
CREATE TABLE PRODUCT_SERVICE (
    Product_Service_ID      INT             NOT NULL AUTO_INCREMENT,
    Name                    VARCHAR(200)    NOT NULL,
    Description             TEXT            NULL,
    Category                VARCHAR(100)    NOT NULL,
    Price                   DECIMAL(10,2)   NOT NULL,
    Availability_Status     ENUM('available','unavailable','seasonal') NOT NULL,
 
    CONSTRAINT pk_product_service   PRIMARY KEY (Product_Service_ID),
    CONSTRAINT chk_ps_price         CHECK (Price >= 0)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- FLIGHT
-- Duration is derived (dashed ellipse in EER) so excluded
-- =============================================================
CREATE TABLE FLIGHT (
    Flight_ID               INT             NOT NULL AUTO_INCREMENT,
    Flight_Number           VARCHAR(10)     NOT NULL,
    Airline                 VARCHAR(100)    NOT NULL,
    Departure_Airport       VARCHAR(100)    NOT NULL,
    Departure_DateTime      DATETIME        NOT NULL,
    Arrival_Airport         VARCHAR(100)    NOT NULL,
    Arrival_DateTime        DATETIME        NOT NULL,
    Price                   DECIMAL(10,2)   NOT NULL,
    Available_Seats         INT             NOT NULL,
    Seat_Class              VARCHAR(50)     NOT NULL,
 
    CONSTRAINT pk_flight            PRIMARY KEY (Flight_ID),
    CONSTRAINT chk_fl_price         CHECK (Price >= 0),
    CONSTRAINT chk_fl_seats         CHECK (Available_Seats >= 0)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- EXPERIENCE
-- Partial overlapping specialisation (o symbol in EER).
-- Subtypes have their own PKs and a nullable FK back to EXPERIENCE,
-- allowing an EXPERIENCE to map to multiple subtypes or none.
-- =============================================================
CREATE TABLE EXPERIENCE (
    Experience_ID           INT             NOT NULL AUTO_INCREMENT,
    Name                    VARCHAR(200)    NOT NULL,
    Description             TEXT            NULL,
    Category                VARCHAR(100)    NOT NULL,
    Availability_Status     ENUM('available','unavailable','seasonal') NOT NULL,
 
    CONSTRAINT pk_experience        PRIMARY KEY (Experience_ID)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- ACCOMMODATION  (subtype of EXPERIENCE)
-- =============================================================
CREATE TABLE ACCOMMODATION (
    Star_Rating             TINYINT         NOT NULL,
    Room_Capacity           INT             NOT NULL,
    Number_Of_Rooms         INT             NOT NULL,
    Price_Per_Night         DECIMAL(10,2)   NOT NULL,
    Experience_ID           INT             NOT NULL,
 
    CONSTRAINT pk_accommodation     PRIMARY KEY (Experience_ID),
    CONSTRAINT fk_acc_exp
        FOREIGN KEY (Experience_ID) REFERENCES EXPERIENCE(Experience_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_acc_star_rating  CHECK (Star_Rating BETWEEN 1 AND 5),
    CONSTRAINT chk_acc_price        CHECK (Price_Per_Night >= 0),
    CONSTRAINT chk_acc_rooms        CHECK (Number_Of_Rooms >= 1),
    CONSTRAINT chk_acc_capacity     CHECK (Room_Capacity >= 1)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- RESTAURANT  (subtype of EXPERIENCE)
-- =============================================================
CREATE TABLE RESTAURANT (
    Cuisine_Type            VARCHAR(100)    NOT NULL,
    Opening_Hours           VARCHAR(100)    NOT NULL,
    Price_Range             VARCHAR(50)     NOT NULL,
    Experience_ID           INT             NOT NULL,
 
    CONSTRAINT pk_restaurant        PRIMARY KEY (Experience_ID),
    CONSTRAINT fk_rest_exp
        FOREIGN KEY (Experience_ID) REFERENCES EXPERIENCE(Experience_ID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
 
 
-- =============================================================
-- DESTINATION  (subtype of EXPERIENCE)
-- =============================================================
CREATE TABLE DESTINATION (
    Destination_ID          INT             NOT NULL AUTO_INCREMENT,
    Country                 VARCHAR(100)    NOT NULL,
    City                    VARCHAR(100)    NULL,
 
    CONSTRAINT pk_destination       PRIMARY KEY (Destination_ID)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- ATTRACTION  (subtype of EXPERIENCE)
-- Destination_ID nullable per feedback
-- =============================================================
CREATE TABLE ATTRACTION (
    Attraction_Type         VARCHAR(100)    NOT NULL,
    Opening_Hours           VARCHAR(100)    NOT NULL,
    Entry_Fee               DECIMAL(10,2)   NOT NULL DEFAULT 0.00,
    Experience_ID           INT             NOT NULL,
 
    CONSTRAINT pk_attraction        PRIMARY KEY (Experience_ID),
    CONSTRAINT fk_attr_exp
        FOREIGN KEY (Experience_ID) REFERENCES EXPERIENCE(Experience_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT chk_attr_entry_fee   CHECK (Entry_Fee >= 0)
) ENGINE=InnoDB;
 
 
-- =============================================================
-- ACTIVITY  (subtype of EXPERIENCE)
-- =============================================================
CREATE TABLE ACTIVITY (
    Activity_Type           VARCHAR(100)    NOT NULL,
    Price_Range             VARCHAR(50)     NOT NULL,
    Duration                VARCHAR(50)     NOT NULL,
    Age_Restriction         VARCHAR(50)     NULL,
    Capacity                INT             NULL,
    Indoor_Outdoor          BOOLEAN         NOT NULL,
    Experience_ID           INT             NOT NULL,
 
    CONSTRAINT pk_activity          PRIMARY KEY (Experience_ID),
    CONSTRAINT fk_act_exp
        FOREIGN KEY (Experience_ID) REFERENCES EXPERIENCE(Experience_ID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
 
 
-- =============================================================
-- PACKAGE_OPTION_FLIGHT  (PACKAGE_OPTION INCLUDES FLIGHT)
-- =============================================================
CREATE TABLE PACKAGE_OPTION_FLIGHT (
    Package_ID              INT             NOT NULL,
    Package_Type            ENUM('solo','couple','group','family') NOT NULL,
    Flight_ID               INT             NOT NULL,
    Seats_Allocated         INT             NOT NULL,
 
    CONSTRAINT pk_po_flight         PRIMARY KEY (Package_ID, Package_Type, Flight_ID),
    CONSTRAINT fk_pof_option
        FOREIGN KEY (Package_ID, Package_Type) REFERENCES PACKAGE_OPTION(Package_ID, Package_Type)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pof_flight
        FOREIGN KEY (Flight_ID) REFERENCES FLIGHT(Flight_ID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
 
 
-- =============================================================
-- PACKAGE_OPTION_SERVICE  (PACKAGE_OPTION ADDS_ON PRODUCT_SERVICE)
-- =============================================================
CREATE TABLE PACKAGE_OPTION_SERVICE (
    Package_ID              INT             NOT NULL,
    Package_Type            ENUM('solo','couple','group','family') NOT NULL,
    Product_Service_ID      INT             NOT NULL,
 
    CONSTRAINT pk_po_service        PRIMARY KEY (Package_ID, Package_Type, Product_Service_ID),
    CONSTRAINT fk_pos_option
        FOREIGN KEY (Package_ID, Package_Type) REFERENCES PACKAGE_OPTION(Package_ID, Package_Type)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_pos_service
        FOREIGN KEY (Product_Service_ID) REFERENCES PRODUCT_SERVICE(Product_Service_ID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
 
 
-- =============================================================
-- PACKAGE_OPTION_EXPERIENCE  (PACKAGE_OPTION PROVIDES EXPERIENCE)
-- =============================================================
CREATE TABLE PACKAGE_OPTION_EXPERIENCE (
    Package_ID              INT             NOT NULL,
    Package_Type            ENUM('solo','couple','group','family') NOT NULL,
    Experience_ID           INT             NOT NULL,
 
    CONSTRAINT pk_po_experience     PRIMARY KEY (Package_ID, Package_Type, Experience_ID),
    CONSTRAINT fk_poe_option
        FOREIGN KEY (Package_ID, Package_Type) REFERENCES PACKAGE_OPTION(Package_ID, Package_Type)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_poe_experience
        FOREIGN KEY (Experience_ID) REFERENCES EXPERIENCE(Experience_ID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;
 
 
-- =============================================================
-- BOOKING_PRODUCT_SERVICE  (BOOKING INCLUDES PRODUCT_SERVICE)
-- M:N relationship from EER
-- =============================================================
CREATE TABLE BOOKING_PRODUCT_SERVICE (
    Booking_ID              INT             NOT NULL,
    Product_Service_ID      INT             NOT NULL,
 
    CONSTRAINT pk_bk_service        PRIMARY KEY (Booking_ID, Product_Service_ID),
    CONSTRAINT fk_bks_booking
        FOREIGN KEY (Booking_ID) REFERENCES BOOKING(Booking_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_bks_service
        FOREIGN KEY (Product_Service_ID) REFERENCES PRODUCT_SERVICE(Product_Service_ID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- AGENCY_DESIGNS_PACKAGE  (AGENCY DESIGNS PACKAGE)
-- M:N relationship from EER
-- =============================================================
CREATE TABLE AGENCY_DESIGNS_PACKAGE (
    Agency_ID              INT             NOT NULL,
    Package_ID             INT             NOT NULL,
 
    CONSTRAINT pk_ag_package       PRIMARY KEY (Agency_ID, Package_ID),
    CONSTRAINT fk_adp_agency
        FOREIGN KEY (Agency_ID) REFERENCES AGENCY(Agency_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_adp_package
        FOREIGN KEY (Package_ID) REFERENCES PACKAGE(Package_ID)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- BOOKING_PACKAGE_OPTION  (BOOKING OF PACKAGE_OPTION - M:N)
-- =============================================================
CREATE TABLE BOOKING_PACKAGE_OPTION (
    Booking_ID              INT             NOT NULL,
    Package_ID              INT             NOT NULL,
    Package_Type            ENUM('solo','couple','group','family') NOT NULL,
 
    CONSTRAINT pk_bk_po             PRIMARY KEY (Booking_ID, Package_ID, Package_Type),
    CONSTRAINT fk_bkpo_booking
        FOREIGN KEY (Booking_ID) REFERENCES BOOKING(Booking_ID)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CONSTRAINT fk_bkpo_option
        FOREIGN KEY (Package_ID, Package_Type) REFERENCES PACKAGE_OPTION(Package_ID, Package_Type)
        ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- =============================================================
-- EXPERIENCE DESTINATION RELATIONSHIP
-- =============================================================
ALTER TABLE EXPERIENCE
    ADD COLUMN Destination_ID INT NULL,
    ADD CONSTRAINT fk_exp_destination
        FOREIGN KEY (Destination_ID) REFERENCES DESTINATION(Destination_ID)
        ON UPDATE CASCADE ON DELETE SET NULL;

-- =============================================================
-- TRIGGERS FOR USER TABLE VALIDATION
-- =============================================================

DELIMITER $$

CREATE TRIGGER trg_check_user_union_before_insert
BEFORE INSERT ON USER
FOR EACH ROW
BEGIN
    IF NOT (
        (NEW.Traveller_ID IS NOT NULL AND NEW.Agency_ID IS NULL) OR
        (NEW.Traveller_ID IS NULL AND NEW.Agency_ID IS NOT NULL)
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Exactly one of Traveller_ID or Agency_ID must be set';
    END IF;
END$$

CREATE TRIGGER trg_check_user_union_before_update
BEFORE UPDATE ON USER
FOR EACH ROW
BEGIN
    IF NOT (
        (NEW.Traveller_ID IS NOT NULL AND NEW.Agency_ID IS NULL) OR
        (NEW.Traveller_ID IS NULL AND NEW.Agency_ID IS NOT NULL)
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Exactly one of Traveller_ID or Agency_ID must be set';
    END IF;
END$$

DELIMITER ;

SET FOREIGN_KEY_CHECKS = 1;