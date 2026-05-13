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
`EXPERIENCE` is modeled as a generalized entity with overlapping specialization into:
- ACCOMMODATION
- RESTAURANT
- ACTIVITY
- ATTRACTION

This allows multiple travel-related offerings to share common attributes while retaining subtype-specific properties.

## DESTINATION
`DESTINATION` is modeled as a separate strong entity.

Reasoning:
- Travellers are explicitly required to browse destinations.
- Multiple experiences can belong to one destination.
- Destinations contain reusable metadata such as:
  - Country
  - City

Relationship:
- One destination can have many experiences.

---

# Task 3 – EER to Relational Mapping

The EER model was mapped into relational tables following the standard 9-step conversion process.

## Step 1: Mapping of Strong Entities

Each strong entity in the EER diagram was converted directly into its own relation with all its simple attributes. The following strong entity relations were produced:

- **PACKAGE** – Package_ID, Name, Description, Base_Price, Package_Type, Available_Slots
- **TRAVELLER** – Traveller_ID, First_Name, Mid_Initial, Surname, Email, Date_of_Birth, Username, Password, Loyalty_Points
- **AGENCY** – Agency_ID, Company_Name, Bank_Info, Email, Username, Password
- **FLIGHT** – Flight_ID, IATA_No, Depart_Date, Depart_Time, Arrival_Date, Arrival_Time, Depart_Airport, Arrival_Airport, Airline_Name, Seat_Count, Available_Seats
- **PRODUCT_SERVICE** – ProductService_ID, Name, Description, Standard_Price, Type
- **FEEDBACK** – Feedback_ID, Rating, Review, Date_Left, Traveller_ID, Package_ID
- **BOOKING** – Booking_ID, Booking_Date, Total_Cost, Payment_Status, Num_Of_Travelers, Start_Date, End_Date
- **EXPERIENCE** – Experience_ID, Name, Description, Location, Category, Destination_ID
- **DESTINATION** – Destination_ID, Country, City

## Step 2: Mapping of Weak Entities

Weak entities were mapped with their partial key combined with the primary key of the identifying owner entity to form the full primary key.

- **PACKAGE_OPTION** – PackageOption_ID (PK), Package_ID (FK), Option_Type, Max_Participants, Min_Participants, Price_Per_Person, Start_Date, End_Date

## Step 3: No 1:1 Relations

No 1:1 relationships were present in the EER diagram. This step was skipped.

## Step 4: Mapping of 1:N Relationships

Foreign keys were added to the "many" side of each 1:N relationship. The following relations were updated:

- **FLIGHT** – added Destination_ID (FK)
- **BOOKING** – added Traveller_ID (FK), Package_Option_ID (FK)
- **AGENCY** – added Package_ID (FK) *(via AGENCY_DESIGNS_PACKAGE)*
- **FEEDBACK** – already contains Traveller_ID (FK) and Package_ID (FK)
- **PACKAGE** – added Agency_ID (FK)
- **PACKAGE_OPTION** – added Package_ID (FK), Group_Trip_ID (FK)
- **GROUP_TRIP** – added Package_Option_ID (FK)
- **EXPERIENCE** – added Destination_ID (FK)

## Step 5: Mapping of M:N Relationships

Each M:N relationship was resolved into a junction (associative) table containing the primary keys of both participating entities as a composite primary key.

Junction tables created:

- **AGENCY_DESIGNS_PACKAGE** – Agency_ID (FK), Package_ID (FK)
- **PACKAGE_OPTION_FLIGHT** – PackageOption_ID (FK), Flight_ID (FK)
- **PACKAGE_OPTION_EXPERIENCE** – PackageOption_ID (FK), Experience_ID (FK)
- **PACKAGE_OPTION_SERVICE** – PackageOption_ID (FK), ProductService_ID (FK)
- **BOOKING_PACKAGE_OPTION** – Booking_ID (FK), PackageOption_ID (FK)
- **BOOKING_PRODUCT_SERVICE** – Booking_ID (FK), ProductService_ID (FK), Quantity, Total_Price

## Step 6: Mapping of Multivalued Attributes

Multivalued attributes were extracted into separate relations with a foreign key referencing the owner entity.

- **USER_CONTACT_INFO** – User_ID (FK), Contact_Info

## Step 7: No N-ary Relations

No N-ary (ternary or higher) relationships were present in the EER diagram. This step was skipped.

## Step 8: Mapping of Generalisation (Option 8A)

The EXPERIENCE generalisation was mapped using **Option 8A**: one superclass table and one table per subtype. Each subtype table uses `Experience_ID` as both its primary key and a foreign key referencing the EXPERIENCE superclass.

- **EXPERIENCE** – Experience_ID (PK), Name, Description, Location, Category, Destination_ID (FK)
- **ACCOMMODATION** – Experience_ID (PK, FK), Check_In_Time, Check_Out_Time, Star_Rating, Amenities
- **RESTAURANT** – Experience_ID (PK, FK), Cuisine_Type, Price_Range, Opening_Hours, Seating_Capacity
- **ACTIVITY** – Experience_ID (PK, FK), Activity_Type, Duration, Difficulty_Level, Equipment_Needed, Max_Group_Size
- **ATTRACTION** – Experience_ID (PK, FK), Attraction_Type, Opening_Hours, Ticket_Price, Age_Restriction

## Step 9: Mapping of Unions

The USER entity was modeled as a union (category) of TRAVELLER and AGENCY. This was mapped by creating a USER relation that references exactly one of the two participating entity types.

- **TRAVELLER** – Traveller_ID, First_Name, Mid_Initial, Surname, Email, Date_of_Birth, Username, Password, Loyalty_Points
- **AGENCY** – Agency_ID, Company_Name, Bank_Info, Email, Username, Password
- **USER** – User_ID, Username, Password, User_Type, Traveller_ID (FK, nullable), Agency_ID (FK, nullable)

Constraint: Exactly one of `Traveller_ID` or `Agency_ID` must be populated per USER record. This is enforced via SQL `BEFORE INSERT` and `BEFORE UPDATE` triggers.

## Key Mapping Decisions

### Composite attributes
Composite attributes were decomposed into simple atomic attributes:
- Traveller name → First_Name, Mid_Initial, Surname

### Derived attributes
Derived attributes were excluded from the schema:
- Flight Duration (derivable from departure/arrival times)

---

# Task 4 – Relational Schema

The relational schema was implemented in MariaDB/MySQL.

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
Implemented:
- Primary Keys
- Foreign Keys
- Composite Primary Keys
- Unique Constraints

Examples:
- USER.Username unique
- Traveller.Email unique
- Agency.Email unique

### Constraints
Implemented checks include:
- Positive prices
- Participant range validation
- Rating range validation (1–5)
- Group trip date validation
- Seat count validation

Examples:
```sql
CHECK (Base_Price >= 0)
CHECK (Rating BETWEEN 1 AND 5)
CHECK (Participants_Max >= Participants_Min)
```

### Triggers
Triggers enforce USER union logic.

Rule:
- USER must reference exactly one of:
  - Traveller_ID
  - Agency_ID

Implemented:
- BEFORE INSERT trigger
- BEFORE UPDATE trigger

---

# Assumptions

The following assumptions were made during modeling:

1. A USER represents either:
   - a traveller, or
   - an agency staff/admin account.

2. A PACKAGE can have multiple PACKAGE_OPTIONS.

3. PACKAGE_OPTION supports multiple package types:
   - solo
   - couple
   - group
   - family

4. Experiences are reusable across package options.

5. Destinations are explicitly modeled as entities rather than plain attributes to:
   - reduce redundancy,
   - support normalization,
   - allow destination browsing.

6. EXPERIENCE may belong to one destination.

7. Flight duration is derived and therefore excluded from schema storage.

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
- MariaDB / MySQL
- SQL
- draw.io
- Git / GitHub

---

## Team
Team 27 – COS 221 Practical Assignment 5
