# Tripistry – COS 221 Practical Assignment 5
## Team 27

## Overview
Tripistry is a travel package platform designed to simplify holiday planning by allowing travellers to browse, compare, and book curated travel packages from multiple travel agencies.

The system supports two primary user roles:
- **Travellers** – browse destinations, packages, experiences, flights, and leave feedback.
- **Travel Agencies** – create and manage travel packages, package options, and group trips.

This repository currently contains work completed for:
- Task 2: (E)ER Diagram
- Task 3: (E)ER to Relational Mapping
- Task 4: Relational Schema + SQL Implementation

---

# Task 2 – (E)ER Diagram

An Enhanced Entity Relationship diagram was created using Chen notation.

## Main entities
- USER
- TRAVELLER
- AGENCY
- PACKAGE
- PACKAGE_OPTION
- BOOKING
- GROUP_TRIP
- FEEDBACK
- FLIGHT
- PRODUCT_SERVICE
- EXPERIENCE
- DESTINATION

## EXPERIENCE specialization
`EXPERIENCE` is modeled as a generalized entity with **overlapping** specialization (o symbol) into:
- ACCOMMODATION
- RESTAURANT
- ACTIVITY
- ATTRACTION

This allows an experience to belong to more than one subtype simultaneously, while each subtype retains its own specific attributes.

## DESTINATION
`DESTINATION` is modeled as a separate strong entity.

Reasoning:
- Travellers are explicitly required to browse destinations.
- Multiple experiences can belong to one destination.
- Destinations contain reusable metadata such as:
  - Country
  - City

Relationship:
- One destination can have many experiences (IN relationship, 1:N).

---

# Task 3 – EER to Relational Mapping

The EER model was mapped into relational tables following the standard 9-step conversion process.

## Step 1: Mapping of Strong Entities

Each strong entity in the EER diagram was converted directly into its own relation with all its simple attributes. The following strong entity relations were produced:

- **TRAVELLER** – Traveller_ID, First_Name, Mid_Initial, Surname, Email, Country_Of_Residence
- **AGENCY** – Agency_ID, Company_Name, Email, Description
- **PACKAGE** – Package_ID, Name, Description, Base_Price, Duration, Package_Status
- **PRODUCT_SERVICE** – Product_Service_ID, Name, Description, Category, Price, Availability_Status
- **FEEDBACK** – Feedback_ID, Rating, Comment, Response, Last_Updated
- **BOOKING** – Booking_ID, Booking_Date, Booking_Status, Number_Of_People, Total_Price
- **GROUP_TRIP** – Group_Trip_ID, Trip_Name, Start_Date, End_Date, Join_Deadline, Participants_Min, Participants_Max, Participants_Current, Trip_Status
- **FLIGHT** – Flight_ID, Flight_Number, Airline, Departure_Airport, Departure_DateTime, Arrival_Airport, Arrival_DateTime, Price, Available_Seats, Seat_Class
- **EXPERIENCE** – Experience_ID, Name, Description, Category, Availability_Status
- **DESTINATION** – Destination_ID, Country, City

## Step 2: Mapping of Weak Entities

Weak entities were mapped with their partial key combined with the primary key of the identifying owner entity to form the composite primary key.

- **PACKAGE_OPTION** – Package_ID (PK, FK), Package_Type (PK), Participants_Min, Participants_Max, Final_Price, Description

`PACKAGE_OPTION` is identified by its owner `PACKAGE`. The composite primary key `(Package_ID, Package_Type)` replaces a surrogate key, since each package has at most one option per type.

## Step 3: No 1:1 Relations

No 1:1 relationships were present in the EER diagram. This step was skipped.

## Step 4: Mapping of 1:N Relationships

Foreign keys were added to the "many" side of each 1:N relationship. The following relations were updated:

- **PACKAGE** – added Agency_ID (FK) → from AGENCY DESIGNS PACKAGE
- **GROUP_TRIP** – added Agency_ID (FK) → from AGENCY MANAGES GROUP_TRIP
- **BOOKING** – added Traveller_ID (FK) → from TRAVELLER MAKES BOOKING; added (Package_ID, Package_Type) as FK → referencing PACKAGE_OPTION
- **FEEDBACK** – added Traveller_ID (FK) → from TRAVELLER GIVES FEEDBACK; added (Package_ID, Package_Type) as FK → from FEEDBACK ON PACKAGE_OPTION
- **EXPERIENCE** – added Destination_ID (FK, nullable) → from EXPERIENCE IN DESTINATION

## Step 5: Mapping of M:N Relationships

Each M:N relationship was resolved into a junction (associative) table containing the primary keys of both participating entities as a composite primary key.

Junction tables created:

- **AGENCY_DESIGNS_PACKAGE** – Agency_ID (FK), Package_ID (FK) → from AGENCY DESIGNS PACKAGE
- **PACKAGE_OPTION_FLIGHT** – Package_ID (FK), Package_Type (FK), Flight_ID (FK), Seats_Allocated → from PACKAGE_OPTION INCLUDES FLIGHT
- **PACKAGE_OPTION_EXPERIENCE** – Package_ID (FK), Package_Type (FK), Experience_ID (FK) → from PACKAGE_OPTION PROVIDES EXPERIENCE
- **PACKAGE_OPTION_SERVICE** – Package_ID (FK), Package_Type (FK), Product_Service_ID (FK) → from PACKAGE_OPTION ADDS_ON PRODUCT_SERVICE
- **BOOKING_PACKAGE_OPTION** – Booking_ID (FK), Package_ID (FK), Package_Type (FK) → from BOOKING OF PACKAGE_OPTION
- **BOOKING_PRODUCT_SERVICE** – Booking_ID (FK), Product_Service_ID (FK) → from BOOKING INCLUDES PRODUCT_SERVICE

Note: Because `PACKAGE_OPTION` uses a composite primary key `(Package_ID, Package_Type)`, all junction tables referencing it carry both columns as part of their composite FK.

## Step 6: Mapping of Multivalued Attributes

Multivalued attributes were extracted into separate relations with a foreign key referencing the owner entity.

- **USER_CONTACT_INFO** – Contact_ID (PK), User_ID (FK), Contact_Info → from USER.Contact_Info (multivalued in EER)

## Step 7: No N-ary Relations

No N-ary (ternary or higher) relationships were present in the EER diagram. This step was skipped.

## Step 8: Mapping of Generalisation (Option 8A)

The EXPERIENCE generalisation uses an **overlapping** constraint (o symbol in EER), meaning an experience can belong to more than one subtype. It was mapped using **Option 8A**: one superclass table and one table per subtype. Each subtype table uses `Experience_ID` as both its primary key and a foreign key referencing the EXPERIENCE superclass, allowing multiple subtype rows to reference the same EXPERIENCE row.

- **EXPERIENCE** – Experience_ID (PK), Name, Description, Category, Availability_Status
- **ACCOMMODATION** – Experience_ID (PK, FK), Star_Rating, Room_Capacity, Number_Of_Rooms, Price_Per_Night
- **RESTAURANT** – Experience_ID (PK, FK), Cuisine_Type, Opening_Hours, Price_Range
- **ACTIVITY** – Experience_ID (PK, FK), Activity_Type, Price_Range, Duration, Age_Restriction, Capacity, Indoor_Outdoor
- **ATTRACTION** – Experience_ID (PK, FK), Attraction_Type, Opening_Hours, Entry_Fee

## Step 9: Mapping of Unions

The USER entity was modeled as a union (category, U symbol in EER) of TRAVELLER and AGENCY. This was mapped by creating a USER relation that references exactly one of the two participating entity types via nullable foreign keys.

- **TRAVELLER** – Traveller_ID (PK), First_Name, Mid_Initial, Surname, Email, Country_Of_Residence
- **AGENCY** – Agency_ID (PK), Company_Name, Email, Description
- **USER** – User_ID (PK), Username, Password, User_Type, Traveller_ID (FK, nullable), Agency_ID (FK, nullable)

Constraint: Exactly one of `Traveller_ID` or `Agency_ID` must be populated per USER record.

## Key Mapping Decisions

### Composite primary key for PACKAGE_OPTION
Rather than introducing a surrogate key, `PACKAGE_OPTION` uses a composite PK of `(Package_ID, Package_Type)` since Package_Type is an enum (`solo`, `couple`, `group`, `family`) and each package can have at most one option per type. This composite key propagates into all referencing tables (BOOKING, FEEDBACK, and all three PACKAGE_OPTION junction tables).

### Composite attributes
Composite attributes were decomposed into simple atomic attributes:
- Traveller Name → First_Name, Mid_Initial, Surname
- Flight Departure/Arrival → combined into Departure_DateTime and Arrival_DateTime respectively

### Derived attributes
Derived attributes were excluded from the schema:
- Flight Duration (dashed ellipse in EER; derivable from Departure_DateTime and Arrival_DateTime)

### DESTINATION linked via ALTER TABLE
`Destination_ID` is added to `EXPERIENCE` via `ALTER TABLE` after both tables are created, due to the forward-reference dependency between EXPERIENCE and DESTINATION in creation order.

---

# Task 4 – Relational Schema

The relational schema was implemented in MariaDB.

## Database setup

Database name:
```sql
team27_tripestry
```

Character set:
```sql
utf8mb4
```

Collation:
```sql
utf8mb4_unicode_ci
```

## Features implemented

### Keys
- Primary Keys
- Foreign Keys
- Composite Primary Keys (PACKAGE_OPTION and all junction tables referencing it)
- Unique Constraints

Examples:
- USER.Username unique
- TRAVELLER.Email unique
- AGENCY.Email unique

---

# Assumptions

The following assumptions were made during modeling:

1. A USER represents either a traveller or an agency staff/admin account. Credentials (Username, Password) are stored on USER, not on TRAVELLER or AGENCY directly.

2. A PACKAGE can have multiple PACKAGE_OPTIONS, one per Package_Type (solo, couple, group, family).

3. PACKAGE_OPTION is a weak entity identified by its owner PACKAGE, using a composite primary key of `(Package_ID, Package_Type)`.

4. Experiences are reusable across package options.

5. EXPERIENCE specialization is overlapping — an experience may simultaneously be more than one subtype (e.g., both an ATTRACTION and an ACTIVITY).

6. Destinations are explicitly modeled as entities rather than plain attributes to reduce redundancy, support normalization, and allow destination browsing.

7. An EXPERIENCE may belong to at most one DESTINATION (nullable FK).

8. Flight Duration is a derived attribute (dashed ellipse in EER) and is therefore excluded from schema storage.

9. GROUP_TRIP is managed directly by an AGENCY (Agency_ID FK on GROUP_TRIP), reflecting the MANAGES relationship in the EER.

10. The INVOLVING relationship between BOOKING and GROUP_TRIP from the EER is handled at the application level; no direct FK from BOOKING to GROUP_TRIP is stored in the schema.

---

# Current Project Status

Completed:
- EER modeling
- Relational mapping
- SQL schema creation

Not yet included:
- Research
- Sample data population
- Web application
- Query optimization
- Final UI

---

# Technologies Used
- MariaDB
- SQL
- draw.io
- Git / GitHub

---

## Team
Team 27 – COS 221 Practical Assignment 5