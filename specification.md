# CSMS Backend API Specification

This specification defines the .NET backend API for the Car Service Management System (CSMS). It is based on the domain relationships in `Data/ApplicationDbContext.cs`, the entities in `Models/`, and the API contracts referenced by the frontend.

## 1. API Conventions

Base URL:

```text
/api/v1
```

Protected endpoints use:

```http
Authorization: Bearer <jwt-token>
```

Recommended roles:

```text
Customer
Employee
Driver
Admin
```

### Standard success responses

Single object:

```json
{
  "data": {}
}
```

Collection:

```json
{
  "data": [],
  "page": 1,
  "pageSize": 20,
  "totalCount": 0
}
```

### Standard error response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more validation errors occurred.",
    "details": {
      "email": ["Email is required."]
    }
  }
}
```

### HTTP status codes

| Status | Meaning |
|---|---|
| `200` | Successful read or update |
| `201` | Successful creation |
| `204` | Successful deletion or action without a response body |
| `400` | Invalid request |
| `401` | Missing or invalid authentication |
| `403` | Authenticated user lacks permission |
| `404` | Resource not found |
| `409` | Resource or business conflict |
| `422` | Business validation failure |
| `500` | Unexpected server error |

---

# 2. Chunk 1 — Authentication and User Accounts

Based on `ApplicationUser`, `Customer`, `Employee`, `Driver`, and `Admin`.

## 2.1 Register customer

```http
POST /api/v1/auth/register
```

Authorization: Public.

Request:

```json
{
  "fullName": "Ahmed Hassan",
  "email": "ahmed@example.com",
  "phone": "+201001234567",
  "address": "Cairo",
  "password": "Password123!",
  "confirmPassword": "Password123!"
}
```

Validation:

- `fullName`, `email`, `phone`, `password`, and `confirmPassword` are required.
- `email` and `phone` must be unique.
- `email` must be valid.
- `confirmPassword` must match `password`.
- `address` is optional.

Response `201 Created`:

```json
{
  "data": {
    "userId": "identity-user-id",
    "customerId": 1,
    "fullName": "Ahmed Hassan",
    "email": "ahmed@example.com",
    "phone": "+201001234567",
    "role": "Customer",
    "token": "jwt-token",
    "expiresAt": "2026-10-27T23:15:41Z"
  }
}
```

## 2.2 Login

```http
POST /api/v1/auth/login
```

Authorization: Public.

Request:

```json
{
  "email": "ahmed@example.com",
  "password": "Password123!"
}
```

Response `200 OK`:

```json
{
  "data": {
    "userId": "identity-user-id",
    "profileId": 1,
    "fullName": "Ahmed Hassan",
    "email": "ahmed@example.com",
    "role": "Customer",
    "token": "jwt-token",
    "expiresAt": "2026-10-27T23:15:41Z"
  }
}
```

Possible errors: invalid credentials, locked account, or disabled account.

## 2.3 Get current user

```http
GET /api/v1/auth/me
```

Authorization: Any authenticated user.

Response:

```json
{
  "data": {
    "userId": "identity-user-id",
    "profileId": 1,
    "fullName": "Ahmed Hassan",
    "email": "ahmed@example.com",
    "phone": "+201001234567",
    "role": "Customer",
    "profile": {}
  }
}
```

## 2.4 Logout

```http
POST /api/v1/auth/logout
```

Authorization: Any authenticated user.

For JWT authentication, the frontend deletes the token. If server-side revocation is required, implement refresh-token rotation and revocation.

Response: `204 No Content`.

## 2.5 Get customer profile

```http
GET /api/v1/profile
```

Authorization: `Customer`.

Response:

```json
{
  "data": {
    "customerId": 1,
    "fullName": "Ahmed Hassan",
    "email": "ahmed@example.com",
    "phone": "+201001234567",
    "address": "Cairo"
  }
}
```

## 2.6 Update customer profile

```http
PUT /api/v1/profile
```

Authorization: `Customer`.

Request:

```json
{
  "fullName": "Ahmed Hassan",
  "phone": "+201001234567",
  "address": "New Cairo"
}
```

The customer cannot update their role, salary, branch, or Identity ID.

## 2.7 Change password

```http
PUT /api/v1/auth/password
```

Authorization: Any authenticated user.

Request:

```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "confirmPassword": "NewPassword123!"
}
```

Response:

```json
{
  "data": {
    "message": "Password changed successfully."
  }
}
```

---

# 3. Chunk 2 — Customer Cars

Based on `Car` and the `Customer -> Cars` relationship.

## 3.1 List my cars

```http
GET /api/v1/cars
```

Authorization: `Customer`.

Query parameters: `page`, `pageSize`, and `search`.

Response:

```json
{
  "data": [
    {
      "licencePlate": "ABC123",
      "color": "Pearl White",
      "noOfCylinders": 4,
      "fuelType": "Gasoline",
      "engineType": "Hybrid",
      "manufactureDate": "2022-05-10",
      "carCompany": "Toyota",
      "model": "Camry",
      "customerId": 1,
      "priceInEgp": 850000,
      "currentKm": 42800
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 1
}
```

Only cars belonging to the authenticated customer may be returned.

## 3.2 Get car

```http
GET /api/v1/cars/{licencePlate}
```

Authorization: Car owner, `Employee`, or `Admin`.

Response:

```json
{
  "data": {
    "licencePlate": "ABC123",
    "color": "Pearl White",
    "noOfCylinders": 4,
    "fuelType": "Gasoline",
    "engineType": "Hybrid",
    "manufactureDate": "2022-05-10",
    "carCompany": "Toyota",
    "model": "Camry",
    "currentKm": 42800,
    "customer": {
      "customerId": 1,
      "fullName": "Ahmed Hassan"
    }
  }
}
```

## 3.3 Add car

```http
POST /api/v1/cars
```

Authorization: `Customer`.

Request:

```json
{
  "licencePlate": "ABC123",
  "color": "Pearl White",
  "noOfCylinders": 4,
  "fuelType": "Gasoline",
  "engineType": "Hybrid",
  "manufactureDate": "2022-05-10",
  "carCompany": "Toyota",
  "model": "Camry",
  "priceInEgp": 850000,
  "currentKm": 42800
}
```

The customer ID is taken from the JWT, not from the request body. The licence plate must be unique, `currentKm` cannot be negative, and the manufacture date cannot be in the future.

Response `201 Created`:

```json
{
  "data": {
    "licencePlate": "ABC123",
    "customerId": 1,
    "message": "Car added successfully."
  }
}
```

## 3.4 Update car

```http
PUT /api/v1/cars/{licencePlate}
```

Authorization: Car owner, `Employee`, or `Admin`.

Request:

```json
{
  "color": "Black",
  "currentKm": 45000,
  "priceInEgp": 850000
}
```

Returns the updated car DTO.

## 3.5 Delete car

```http
DELETE /api/v1/cars/{licencePlate}
```

Authorization: Car owner or `Admin`.

Do not delete a car with visits, emergency requests, or active service records. Return `409 Conflict`; alternatively, implement a soft-delete field.

---

# 4. Chunk 3 — Branches, Products, and Service Catalog

Based on `ServiceBranch`, `Product`, `BranchProduct`, and `ServiceByKm`.

## 4.1 List branches

```http
GET /api/v1/branches
```

Authorization: Public or authenticated user.

Query parameters: `page`, `pageSize`, `search`, `latitude`, and `longitude`.

Response:

```json
{
  "data": [
    {
      "branchId": 1,
      "branchName": "Downtown Cairo Hub",
      "branchLocation": "12 Tahrir Square, Cairo",
      "openTime": "08:00:00",
      "closeTime": "20:00:00",
      "openingDate": "2020-01-01",
      "manager": {
        "employeeId": 4,
        "fullName": "Priya Sharma"
      },
      "employeeCount": 12,
      "driverCount": 3
    }
  ]
}
```

## 4.2 Get branch

```http
GET /api/v1/branches/{branchId}
```

Authorization: Public or authenticated user.

Returns branch data, manager, available services, and available products.

## 4.3 Create branch

```http
POST /api/v1/branches
```

Authorization: `Admin`.

Request:

```json
{
  "branchName": "Downtown Cairo Hub",
  "branchLocation": "12 Tahrir Square, Cairo",
  "openTime": "08:00:00",
  "closeTime": "20:00:00",
  "openingDate": "2020-01-01",
  "managerId": 4
}
```

Returns the created branch.

## 4.4 Update branch

```http
PUT /api/v1/branches/{branchId}
```

Authorization: `Admin`.

Request fields are the same as creation.

## 4.5 Delete branch

```http
DELETE /api/v1/branches/{branchId}
```

Authorization: `Admin`.

Reject deletion if the branch has employees, drivers, visits, trucks, or inventory records. Return `409 Conflict`.

## 4.6 List products

```http
GET /api/v1/products
```

Authorization: Public or authenticated user.

Query parameters: `page`, `pageSize`, `search`, `branchId`, and `availableOnly`.

Response:

```json
{
  "data": [
    {
      "productId": 1,
      "name": "Engine Oil",
      "price": 350,
      "warrantyMonths": 6,
      "description": "Synthetic engine oil",
      "branches": [
        {
          "branchId": 1,
          "quantity": 25
        }
      ]
    }
  ]
}
```

## 4.7 Get product

```http
GET /api/v1/products/{productId}
```

Authorization: Public or authenticated user.

Returns product details and branch availability.

## 4.8 Create product

```http
POST /api/v1/products
```

Authorization: `Admin`.

Request:

```json
{
  "name": "Engine Oil",
  "price": 350,
  "warrantyMonths": 6,
  "description": "Synthetic engine oil"
}
```

## 4.9 Update product

```http
PUT /api/v1/products/{productId}
```

Authorization: `Admin`.

Request fields are `name`, `price`, `warrantyMonths`, and `description`.

## 4.10 Delete product

```http
DELETE /api/v1/products/{productId}
```

Authorization: `Admin`.

Do not delete products referenced by services, branch inventory, or kilometre schedules.

## 4.11 Add product to branch inventory

```http
POST /api/v1/branches/{branchId}/inventory
```

Authorization: `Admin`.

Request:

```json
{
  "productId": 1,
  "quantity": 25
}
```

## 4.12 Update branch inventory

```http
PUT /api/v1/branches/{branchId}/inventory/{productId}
```

Authorization: `Admin`.

Request:

```json
{
  "quantity": 40
}
```

## 4.13 Remove product from branch

```http
DELETE /api/v1/branches/{branchId}/inventory/{productId}
```

Authorization: `Admin`.

## 4.14 List service-by-kilometre schedules

```http
GET /api/v1/service-schedules
```

Authorization: Public or authenticated user.

Response:

```json
{
  "data": [
    {
      "serviceByKmId": 1,
      "kilometerInterval": 50000,
      "description": "50,000 km maintenance",
      "price": 1800,
      "products": [
        {
          "productId": 1,
          "name": "Engine Oil"
        }
      ]
    }
  ]
}
```

## 4.15 Create service schedule

```http
POST /api/v1/service-schedules
```

Authorization: `Admin`.

Request:

```json
{
  "kilometerInterval": 50000,
  "description": "50,000 km maintenance",
  "price": 1800,
  "productIds": [1, 2, 3]
}
```

## 4.16 Update service schedule

```http
PUT /api/v1/service-schedules/{serviceByKmId}
```

Authorization: `Admin`.

Request fields are the same as creation.

## 4.17 Delete service schedule

```http
DELETE /api/v1/service-schedules/{serviceByKmId}
```

Authorization: `Admin`.

---

# 5. Chunk 4 — Service Bookings and Visits

Based on the relationships among `Visit`, `Service`, `Car`, `Employee`, and `Product`.

The frontend calls these records bookings; the domain model stores them primarily as `Visit` records.

## 5.1 Create service booking

```http
POST /api/v1/bookings
```

Authorization: `Customer`.

Request:

```json
{
  "carLicencePlate": "ABC123",
  "serviceProductId": 1,
  "branchId": 1,
  "serviceDate": "2026-10-30",
  "customerNotes": "Car makes a knocking sound."
}
```

Response `201 Created`:

```json
{
  "data": {
    "visitId": 100,
    "bookingReference": "VST-0100",
    "carLicencePlate": "ABC123",
    "branchId": 1,
    "serviceDate": "2026-10-30",
    "status": "Requested",
    "customerNotes": "Car makes a knocking sound."
  }
}
```

Rules:

- The car must belong to the authenticated customer.
- The branch and product must exist.
- The date cannot be in the past.
- The branch must be open on the requested date.
- Conflicting appointments must be rejected.

## 5.2 List customer bookings

```http
GET /api/v1/bookings
```

Authorization: `Customer`.

Query parameters: `status`, `fromDate`, `toDate`, `carLicencePlate`, `page`, and `pageSize`.

Returns only bookings for cars owned by the authenticated customer.

## 5.3 Get booking

```http
GET /api/v1/bookings/{visitId}
```

Authorization: Car-owning `Customer`, assigned `Employee`, or `Admin`.

Returns customer, car, branch, employee, services, diagnosis, and status.

## 5.4 Cancel booking

```http
POST /api/v1/bookings/{visitId}/cancel
```

Authorization: Booking owner, `Employee`, or `Admin`.

Request:

```json
{
  "reason": "Customer cannot attend."
}
```

Returns the visit with `Cancelled` status.

## 5.5 List employee visits

```http
GET /api/v1/visits
```

Authorization: `Employee` or `Admin`.

Query parameters: `branchId`, `assignedTo`, `status`, `fromDate`, `toDate`, `page`, and `pageSize`.

Example:

```http
GET /api/v1/visits?branchId=1&assignedTo=me&status=Requested
```

## 5.6 Assign employee

```http
PUT /api/v1/visits/{visitId}/assignment
```

Authorization: `Admin`.

Request:

```json
{
  "employeeId": 4
}
```

The employee must belong to the visit branch, be active, and have no conflicting assignment.

## 5.7 Update visit status

```http
PUT /api/v1/visits/{visitId}/status
```

Authorization: Employee or Admin.

Request:

```json
{
  "status": "InProgress"
}
```

Recommended status flow:

```text
Requested
  -> DiagnosisPending
  -> PendingCustomerConfirmation
  -> PendingFix
  -> InProgress
  -> Completed
```

Cancellation should be handled separately.

## 5.8 Submit diagnosis

```http
PUT /api/v1/visits/{visitId}/diagnosis
```

Authorization: Assigned `Employee`.

Request:

```json
{
  "description": "Inspected the braking system and suspension.",
  "items": [
    {
      "description": "Front brake pads worn",
      "severity": "Critical",
      "estimatedCost": 480,
      "productId": 10
    },
    {
      "description": "Cabin air filter blocked",
      "severity": "Normal",
      "estimatedCost": 90,
      "productId": 12
    }
  ]
}
```

Response:

```json
{
  "data": {
    "visitId": 100,
    "status": "PendingCustomerConfirmation",
    "diagnosis": []
  }
}
```

## 5.9 Customer confirms diagnosis

```http
PUT /api/v1/visits/{visitId}/customer-confirmation
```

Authorization: Customer who owns the visit.

Request:

```json
{
  "approvedItemIds": [1, 2],
  "rejectedItemIds": [3],
  "customerNotes": "Please continue with the approved items."
}
```

Response:

```json
{
  "data": {
    "visitId": 100,
    "status": "PendingFix",
    "approvedItems": [],
    "rejectedItems": [],
    "totalEstimatedCost": 570
  }
}
```

Only diagnosis items belonging to this visit may be selected. The visit cannot move to `PendingFix` without confirmation.

## 5.10 Complete visit

```http
PUT /api/v1/visits/{visitId}/complete
```

Authorization: Assigned employee or Admin.

Request:

```json
{
  "completionNotes": "All approved repairs completed.",
  "completedItems": [
    {
      "description": "Oil and filter replacement",
      "completed": true
    }
  ],
  "finalKm": 43200
}
```

Response:

```json
{
  "data": {
    "visitId": 100,
    "status": "Completed",
    "completedAt": "2026-10-30T14:00:00Z",
    "finalKm": 43200
  }
}
```

## 5.11 Get services attached to visit

```http
GET /api/v1/visits/{visitId}/services
```

Authorization: Visit customer, Employee, or Admin.

Response:

```json
{
  "data": [
    {
      "serviceId": 1,
      "serviceDate": "2026-10-30T10:00:00Z",
      "product": {
        "productId": 10,
        "name": "Engine Oil",
        "price": 350
      },
      "status": "Approved",
      "description": "Oil replacement",
      "approved": true
    }
  ]
}
```

---

# 6. Chunk 5 — Rental Cars and Reservations

Based on `CarsForRent` and `RentedCarCustomer`.

## 6.1 List rental cars

```http
GET /api/v1/rental-cars
```

Authorization: Public or authenticated user.

Query parameters: `available`, `fromDate`, `toDate`, `carCompany`, `model`, `fuelType`, `engineType`, `minPrice`, `maxPrice`, `page`, and `pageSize`.

Response:

```json
{
  "data": [
    {
      "licencePlate": "RNT123",
      "color": "Black",
      "noOfCylinders": 4,
      "fuelType": "Gasoline",
      "engineType": "Automatic",
      "manufactureDate": "2023-01-01",
      "carCompany": "Toyota",
      "model": "Corolla",
      "pricePerDay": 450,
      "available": true
    }
  ]
}
```

## 6.2 Get rental car

```http
GET /api/v1/rental-cars/{licencePlate}
```

Authorization: Public or authenticated user.

Returns vehicle details, availability, and reservations relevant to the request.

## 6.3 Create rental car

```http
POST /api/v1/rental-cars
```

Authorization: `Admin`.

Request:

```json
{
  "licencePlate": "RNT123",
  "color": "Black",
  "noOfCylinders": 4,
  "fuelType": "Gasoline",
  "engineType": "Automatic",
  "manufactureDate": "2023-01-01",
  "carCompany": "Toyota",
  "model": "Corolla",
  "pricePerDay": 450
}
```

## 6.4 Update rental car

```http
PUT /api/v1/rental-cars/{licencePlate}
```

Authorization: `Admin`.

## 6.5 Delete rental car

```http
DELETE /api/v1/rental-cars/{licencePlate}
```

Authorization: `Admin`.

Reject deletion when the car has an active or historical reservation.

## 6.6 Create rental reservation

```http
POST /api/v1/rentals
```

Authorization: `Customer`.

Request:

```json
{
  "licencePlate": "RNT123",
  "rentStartDate": "2026-11-01",
  "rentEndDate": "2026-11-05"
}
```

Response `201 Created`:

```json
{
  "data": {
    "rentedCarCustomerId": 301,
    "rentalReference": "RNT-301",
    "licencePlate": "RNT123",
    "rentStartDate": "2026-11-01",
    "rentEndDate": "2026-11-05",
    "numberOfDays": 4,
    "priceForRent": 1800,
    "status": "Upcoming"
  }
}
```

Rules:

- The end date must be after the start date.
- The car must be available for the complete range.
- The customer ID comes from the JWT.
- The total is calculated server-side.
- Overlapping reservations are rejected.

## 6.7 List my rentals

```http
GET /api/v1/rentals
```

Authorization: `Customer`.

Query parameters: `status`, `fromDate`, `toDate`, `page`, and `pageSize`.

## 6.8 Get rental reservation

```http
GET /api/v1/rentals/{rentedCarCustomerId}
```

Authorization: Reservation owner, Employee, or Admin.

## 6.9 Cancel rental

```http
POST /api/v1/rentals/{rentedCarCustomerId}/cancel
```

Authorization: Reservation owner or Admin.

Request:

```json
{
  "reason": "Change of plans."
}
```

---

# 7. Chunk 6 — Emergency and SOS Requests

Based on `EmergencyRequest`, `Driver`, and `EmergencyTruck`.

## 7.1 List SOS problem types

```http
GET /api/v1/sos/problem-types
```

Authorization: Public or authenticated user.

Response:

```json
{
  "data": [
    {
      "id": "breakdown",
      "label": "Breakdown",
      "labelAr": "عطل مفاجئ",
      "description": "Car will not start or stalled"
    },
    {
      "id": "flat-tire",
      "label": "Flat Tire",
      "labelAr": "إطار مثقوب",
      "description": "Puncture or blowout"
    }
  ]
}
```

## 7.2 Create emergency request

```http
POST /api/v1/emergency-requests
```

Authorization: `Customer`.

Request:

```json
{
  "carLicencePlate": "ABC123",
  "problemType": "breakdown",
  "latitude": "30.0444",
  "longitude": "31.2357",
  "description": "The car stopped while driving."
}
```

Response `201 Created`:

```json
{
  "data": {
    "emergencyRequestId": 500,
    "emergencyTime": "2026-10-27T18:30:00Z",
    "carLicencePlate": "ABC123",
    "latitude": "30.0444",
    "longitude": "31.2357",
    "status": "Requested"
  }
}
```

Rules:

- The car must belong to the customer.
- Coordinates must be valid.
- A customer cannot create multiple active requests for the same car.
- Assignment should prefer the nearest available driver and truck.

## 7.3 Get emergency request

```http
GET /api/v1/emergency-requests/{emergencyRequestId}
```

Authorization: Request owner, assigned Driver, or Admin.

Response should include request status, car, driver, truck, current driver location, and estimated arrival time.

## 7.4 List my emergency requests

```http
GET /api/v1/emergency-requests
```

Authorization: `Customer`.

Query parameters: `status`, `fromDate`, `toDate`, `page`, and `pageSize`.

## 7.5 Assign driver and truck

```http
PUT /api/v1/emergency-requests/{emergencyRequestId}/assignment
```

Authorization: Admin.

Request:

```json
{
  "driverId": 7,
  "truckLicencePlate": "TRK-001"
}
```

Driver and truck must be available and belong to the same branch. Both become unavailable after assignment.

## 7.6 Update emergency status

```http
PUT /api/v1/emergency-requests/{emergencyRequestId}/status
```

Authorization: Assigned Driver or Admin.

Request:

```json
{
  "status": "OnTheWay",
  "latitude": "30.0500",
  "longitude": "31.2400"
}
```

Recommended status flow:

```text
Requested -> Assigned -> OnTheWay -> Arrived -> Completed
```

## 7.7 Cancel emergency request

```http
POST /api/v1/emergency-requests/{emergencyRequestId}/cancel
```

Authorization: Request owner, assigned Driver, or Admin.

Request:

```json
{
  "reason": "Help is no longer needed."
}
```

## 7.8 List drivers

```http
GET /api/v1/drivers
```

Authorization: Admin.

Query parameters: `branchId`, `available`, `search`, `page`, and `pageSize`.

## 7.9 Create driver

```http
POST /api/v1/drivers
```

Authorization: `Admin`.

Request:

```json
{
  "fullName": "Marcus Johnson",
  "phoneNumber": "+201005550001",
  "email": "marcus@example.com",
  "startWorkDate": "2024-01-20",
  "salary": 5000,
  "branchId": 1,
  "latitude": "30.0444",
  "longitude": "31.2357",
  "password": "Password123!"
}
```

## 7.10 Update driver location and availability

```http
PUT /api/v1/drivers/me/location
```

Authorization: `Driver`.

Request:

```json
{
  "latitude": "30.0500",
  "longitude": "31.2400",
  "isAvailable": false
}
```

## 7.11 List emergency trucks

```http
GET /api/v1/emergency-trucks
```

Authorization: Admin.

Query parameters: `branchId` and `available`.

## 7.12 Create emergency truck

```http
POST /api/v1/emergency-trucks
```

Authorization: `Admin`.

Request:

```json
{
  "licencePlate": "TRK-001",
  "truckCompany": "Ford",
  "truckModel": "Transit",
  "isAvailable": true,
  "startDate": "2024-01-01",
  "manufactureDate": "2023-01-01",
  "branchId": 1,
  "driverId": 7
}
```

## 7.13 Update emergency truck

```http
PUT /api/v1/emergency-trucks/{licencePlate}
```

Authorization: Admin.

## 7.14 Delete emergency truck

```http
DELETE /api/v1/emergency-trucks/{licencePlate}
```

Authorization: `Admin`.

---

# 8. Chunk 7 — Driver Operations

This chunk defines the APIs available to a driver. A driver can see all emergency requests, not only requests already assigned to that driver. Sensitive customer data should be limited to what is needed to provide emergency assistance.

## 8.1 List all emergency requests

```http
GET /api/v1/driver/emergency-requests
```

Authorization: `Driver`.

Query parameters:

```text
status
branchId
fromDate
toDate
assigned
page
pageSize
```

`assigned` accepts `true` or `false`. If omitted, both assigned and unassigned requests are returned.

Response:

```json
{
  "data": [
    {
      "emergencyRequestId": 500,
      "emergencyTime": "2026-10-27T18:30:00Z",
      "status": "Requested",
      "problemType": "breakdown",
      "description": "The car stopped while driving.",
      "location": {
        "latitude": "30.0444",
        "longitude": "31.2357",
        "address": "Tahrir Square, Cairo"
      },
      "customer": {
        "customerId": 1,
        "fullName": "Ahmed Hassan",
        "phone": "+201001234567"
      },
      "car": {
        "licencePlate": "ABC123",
        "carCompany": "Toyota",
        "model": "Camry",
        "color": "Pearl White"
      },
      "driver": null,
      "truck": null,
      "branch": {
        "branchId": 1,
        "branchName": "Downtown Cairo Hub"
      }
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalCount": 1
}
```

Rules:

- The authenticated driver may read all emergency requests.
- The API must never accept a driver ID from the query string to determine identity; it comes from the JWT.
- The result should support filtering by status, branch, date range, and assignment.
- Do not return customer passwords, Identity IDs, salary, or unrelated private profile fields.
- Return the nearest or most urgent requests first when no explicit sort is supplied.

## 8.2 Get an emergency request

```http
GET /api/v1/driver/emergency-requests/{emergencyRequestId}
```

Authorization: `Driver`.

Response:

```json
{
  "data": {
    "emergencyRequestId": 500,
    "requestReference": "SOS-500",
    "emergencyTime": "2026-10-27T18:30:00Z",
    "status": "Assigned",
    "problemType": "breakdown",
    "description": "The car stopped while driving.",
    "location": {
      "latitude": "30.0444",
      "longitude": "31.2357",
      "address": "Tahrir Square, Cairo"
    },
    "customer": {
      "customerId": 1,
      "fullName": "Ahmed Hassan",
      "phone": "+201001234567"
    },
    "car": {
      "licencePlate": "ABC123",
      "carCompany": "Toyota",
      "model": "Camry",
      "color": "Pearl White",
      "currentKm": 42800
    },
    "driver": {
      "driverId": 7,
      "fullName": "Marcus Johnson",
      "phoneNumber": "+201005550001"
    },
    "truck": {
      "licencePlate": "TRK-001",
      "truckCompany": "Ford",
      "truckModel": "Transit"
    },
    "branch": {
      "branchId": 1,
      "branchName": "Downtown Cairo Hub"
    }
  }
}
```

## 8.3 Accept an emergency request

```http
POST /api/v1/driver/emergency-requests/{emergencyRequestId}/accept
```

Authorization: `Driver`.

Request:

```json
{
  "truckLicencePlate": "TRK-001"
}
```

Rules:

- The authenticated driver becomes the assigned driver.
- The driver must be available.
- The truck must be available and assigned to that driver.
- An already assigned or completed request cannot be accepted.

Response:

```json
{
  "data": {
    "emergencyRequestId": 500,
    "status": "Assigned",
    "driverId": 7,
    "truckLicencePlate": "TRK-001"
  }
}
```

## 8.4 Update emergency request status

```http
PUT /api/v1/driver/emergency-requests/{emergencyRequestId}/status
```

Authorization: `Driver`.

The driver may update only requests assigned to the authenticated driver.

Request:

```json
{
  "status": "OnTheWay",
  "latitude": "30.0500",
  "longitude": "31.2400"
}
```

Allowed status flow:

```text
Assigned -> OnTheWay -> Arrived -> Completed
```

Response:

```json
{
  "data": {
    "emergencyRequestId": 500,
    "status": "OnTheWay",
    "driverLocation": {
      "latitude": "30.0500",
      "longitude": "31.2400",
      "updatedAt": "2026-10-27T18:35:00Z"
    }
  }
}
```

## 8.5 Update driver location

```http
PUT /api/v1/drivers/me/location
```

Authorization: `Driver`.

Request:

```json
{
  "latitude": "30.0500",
  "longitude": "31.2400",
  "isAvailable": false
}
```

Response:

```json
{
  "data": {
    "driverId": 7,
    "latitude": "30.0500",
    "longitude": "31.2400",
    "isAvailable": false
  }
}
```

## 8.6 List assigned emergency requests

```http
GET /api/v1/driver/emergency-requests/assigned
```

Authorization: `Driver`.

Query parameters: `status`, `fromDate`, `toDate`, `page`, and `pageSize`.

Returns the same emergency-request JSON object as `GET /api/v1/driver/emergency-requests`, restricted to the authenticated driver's assignments.

---

# 9. Chunk 8 — Employees and Administration

Based on `Employee` and `ServiceBranch`.

## 9.1 List employees

```http
GET /api/v1/employees
```

Authorization: `Admin`.

Query parameters: `branchId`, `search`, `page`, and `pageSize`.

Response:

```json
{
  "data": [
    {
      "employeeId": 4,
      "fullName": "David Chen",
      "email": "david.chen@example.com",
      "phoneNumber": "+201005551001",
      "faculty": "Automotive Engineering",
      "yearsOfExperience": 5,
      "startingWorkDate": "2023-03-15",
      "branchId": 1
    }
  ]
}
```

Do not include salary in general employee lists unless the caller is an authorized Admin.

## 9.2 Get current employee

```http
GET /api/v1/employees/me
```

Authorization: `Employee`.

Returns the employee profile, branch, and salary for an authorized self request.

## 9.3 Create employee

```http
POST /api/v1/employees
```

Authorization: `Admin`.

Request:

```json
{
  "fullName": "David Chen",
  "email": "david.chen@example.com",
  "phoneNumber": "+201005551001",
  "faculty": "Automotive Engineering",
  "yearsOfExperience": 5,
  "startingWorkDate": "2023-03-15",
  "salary": 4800,
  "branchId": 1,
  "password": "Password123!"
}
```

Never return the password.

## 9.4 Update employee

```http
PUT /api/v1/employees/{employeeId}
```

Authorization: `Admin`.

Request:

```json
{
  "fullName": "David Chen",
  "phoneNumber": "+201005551001",
  "faculty": "Automotive Engineering",
  "yearsOfExperience": 6,
  "branchId": 1
}
```

Salary changes should be restricted to Admin.

## 9.5 Deactivate employee

```http
DELETE /api/v1/employees/{employeeId}
```

Authorization: `Admin`.

Prefer deactivation over physical deletion because historical visits reference employees.

---

# 10. Chunk 9 — Notifications

Based on `Notification` and its employee, customer, and visit relationships.

## 10.1 List notifications

```http
GET /api/v1/notifications
```

Authorization: Any authenticated user.

Query parameters: `unreadOnly`, `page`, and `pageSize`.

Response:

```json
{
  "data": [
    {
      "notificationId": 1,
      "message": "Your diagnosis is ready for confirmation.",
      "employeeId": null,
      "customerId": 1,
      "visitId": 100,
      "isRead": false,
      "createdAt": "2026-10-27T10:00:00Z"
    }
  ]
}
```

Only notifications belonging to the current user may be returned.

## 10.2 Mark notification as read

```http
PUT /api/v1/notifications/{notificationId}/read
```

Authorization: Notification owner.

## 10.3 Mark all notifications as read

```http
PUT /api/v1/notifications/read-all
```

Authorization: Any authenticated user.

Response:

```json
{
  "data": {
    "updatedCount": 5
  }
}
```

---

# 11. Chunk 10 — Admin Dashboard and Reports

These APIs support the dashboard, fleet, staff, branch, and report screens.

## 11.1 Dashboard summary

```http
GET /api/v1/admin/dashboard
```

Authorization: `Admin`.

Query parameters: `fromDate`, `toDate`, and `branchId`.

Response:

```json
{
  "data": {
    "totalCustomers": 1200,
    "totalEmployees": 35,
    "totalBranches": 3,
    "totalRentalCars": 48,
    "activeEmergencyRequests": 2,
    "upcomingVisits": 18,
    "completedVisits": 250,
    "totalRevenue": 125000
  }
}
```

## 11.2 Revenue report

```http
GET /api/v1/admin/reports/revenue
```

Authorization: `Admin`.

Query parameters: `fromDate`, `toDate`, `branchId`, and `groupBy=day|month|year`.

Response:

```json
{
  "data": [
    {
      "period": "2026-09",
      "rentalRevenue": 31200,
      "serviceRevenue": 19800,
      "emergencyRevenue": 4700,
      "totalRevenue": 55700
    }
  ]
}
```

## 11.3 Fleet utilization report

```http
GET /api/v1/admin/reports/fleet-utilization
```

Authorization: `Admin`.

Response:

```json
{
  "data": {
    "available": 42,
    "rented": 31,
    "maintenance": 8,
    "reserved": 19
  }
}
```

## 11.4 Branch performance report

```http
GET /api/v1/admin/reports/branches
```

Authorization: `Admin`.

Query parameters: `fromDate` and `toDate`.

Response:

```json
{
  "data": [
    {
      "branchId": 1,
      "branchName": "Downtown Cairo Hub",
      "completedServices": 142,
      "rentals": 87,
      "emergencyRequests": 12,
      "revenue": 85000
    }
  ]
}
```

---

# 12. Recommended Implementation Order

Implement the API in these vertical slices:

```text
1. Authentication and customer profile
2. Customer cars
3. Branches and service catalog
4. Service bookings and visits
5. Employee diagnosis and customer approval
6. Rental cars and reservations
7. Emergency and SOS operations
8. Employees, drivers, and trucks
9. Notifications
10. Admin reports
```

## Main service flow

```text
Authentication
    ↓
Customer profile
    ↓
Customer cars
    ↓
Branches and products
    ↓
Service bookings
    ↓
Visits
    ↓
Diagnosis
    ↓
Customer approval
    ↓
Repair completion
```

## Rental flow

```text
Authentication
    ↓
Rental cars
    ↓
Rental reservations
```

## Emergency flow

```text
Customer car
    ↓
Emergency request
    ↓
Driver/truck assignment
    ↓
Driver location updates
    ↓
OnTheWay
    ↓
Arrived
    ↓
Completed
```

---

# 13. Required Model Adjustments

The existing models are a good starting point, but the following changes are recommended before implementation.

## 13.1 Identity relationships

`Customer`, `Employee`, `Driver`, and `Admin` contain `ApplicationUser User`, but the relationships should be explicitly configured in `ApplicationDbContext`.

Prefer explicit foreign keys such as:

```text
ApplicationUserId
```

and configure the relationship and delete behavior.

## 13.2 Diagnosis items

The frontend requires diagnosis items containing severity, estimated cost, description, product, and customer approval. The current `Service` model does not provide a proper diagnosis-item entity.

Add a `VisitDiagnosisItem` entity with:

```text
DiagnosisItemId
VisitId
Description
Severity
EstimatedCost
ProductId
SelectedByCustomer
```

## 13.3 Booking time

`Visit` currently has `DateOnly ServiceDate`, while the frontend uses a date and time. Use either:

```text
DateTime ServiceDate
```

or add:

```text
TimeOnly ServiceTime
```

## 13.4 Rental daily price

`CarsForRent` does not contain a daily rental price. Add:

```text
PricePerDay
```

or create a separate rental-pricing table.

## 13.5 Emergency customer ownership

`EmergencyRequest` reaches the customer indirectly through the car. Adding `CustomerId` makes authorization and reporting clearer.

Recommended fields:

```text
CustomerId
ProblemType
Description
CancelledAt
CompletedAt
```

## 13.6 Notifications

Add:

```text
IsRead
CreatedAt
NotificationType
```

At least one recipient should be present, but not necessarily all employee, customer, and visit references.

## 13.7 Employee active state

Add `IsActive`, or use the Identity lockout/disabled state. Deactivation is preferred over deleting employees with historical visits.

## 13.8 Phone number types

Phone numbers should be strings. In particular, change `Driver.PhoneNumber` from an integer to a string so that country codes, leading zeros, and formatting are preserved.

## 13.9 Enum definitions

Finalize the values for:

```text
FuelType
EngineType
Status
StatusService
StatusEmergency
```

Store enum values consistently in the database and expose stable string values in the API.

## 13.10 Admin persistence

Decide whether administrators are represented only by ASP.NET Identity roles or also have an `Admin` profile entity. If the `Admin` entity is retained, add an `Admins` DbSet and explicitly configure its relationship with `ApplicationUser`.
