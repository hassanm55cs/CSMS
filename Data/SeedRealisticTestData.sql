SET NOCOUNT ON;

-- 1. Service Branches (4 realistic Cairo & Giza branches with real coordinates)
IF NOT EXISTS (SELECT 1 FROM dbo.service_branches WHERE Branch_name = N'Nasr City Service Center')
    INSERT INTO dbo.service_branches (Branch_name, Branch_location, Open_time, Close_time, Opening_date, ManagerId, Latitude, Longitude)
    VALUES (N'Nasr City Service Center', N'Abbas El Akkad St, Nasr City, Cairo', '08:00:00', '22:00:00', '2021-03-15', NULL, 30.0561, 31.3396);

IF NOT EXISTS (SELECT 1 FROM dbo.service_branches WHERE Branch_name = N'Maadi Auto Hub')
    INSERT INTO dbo.service_branches (Branch_name, Branch_location, Open_time, Close_time, Opening_date, ManagerId, Latitude, Longitude)
    VALUES (N'Maadi Auto Hub', N'Corniche El Maadi, Cairo', '08:30:00', '21:30:00', '2022-01-10', NULL, 29.9602, 31.2569);

IF NOT EXISTS (SELECT 1 FROM dbo.service_branches WHERE Branch_name = N'6th of October Service Hub')
    INSERT INTO dbo.service_branches (Branch_name, Branch_location, Open_time, Close_time, Opening_date, ManagerId, Latitude, Longitude)
    VALUES (N'6th of October Service Hub', N'26th of July Corridor, 6th of October, Giza', '09:00:00', '22:00:00', '2022-09-01', NULL, 29.9737, 30.9410);

IF NOT EXISTS (SELECT 1 FROM dbo.service_branches WHERE Branch_name = N'New Cairo 5th Settlement')
    INSERT INTO dbo.service_branches (Branch_name, Branch_location, Open_time, Close_time, Opening_date, ManagerId, Latitude, Longitude)
    VALUES (N'New Cairo 5th Settlement', N'North 90th St, 5th Settlement, New Cairo', '08:00:00', '23:00:00', '2023-05-20', NULL, 30.0254, 31.4913);

DECLARE @bNasr INT = (SELECT TOP 1 BranchId FROM dbo.service_branches WHERE Branch_name = N'Nasr City Service Center');
DECLARE @bMaadi INT = (SELECT TOP 1 BranchId FROM dbo.service_branches WHERE Branch_name = N'Maadi Auto Hub');
DECLARE @bOct INT = (SELECT TOP 1 BranchId FROM dbo.service_branches WHERE Branch_name = N'6th of October Service Hub');
DECLARE @bNewCairo INT = (SELECT TOP 1 BranchId FROM dbo.service_branches WHERE Branch_name = N'New Cairo 5th Settlement');

-- 2. Products (12 realistic automotive parts & maintenance services)
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'Full Synthetic Oil 5W-30 (4L)')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'Full Synthetic Oil 5W-30 (4L)', 1450.00, 6, N'API SP full synthetic motor oil change including drain plug washer.');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'Genuine Oil Filter')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'Genuine Oil Filter', 320.00, 6, N'OEM-grade spin-on engine oil filter replacement.');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'Front Ceramic Brake Pads')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'Front Ceramic Brake Pads', 1850.00, 12, N'Low-dust ceramic front brake pad set with caliper inspection.');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'Rear Brake Pads Set')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'Rear Brake Pads Set', 1400.00, 12, N'Rear axle brake pad replacement and rotor check.');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'Engine Air Filter')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'Engine Air Filter', 380.00, 6, N'High-flow pleated engine intake air filter.');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'Cabin AC Micro-Filter')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'Cabin AC Micro-Filter', 340.00, 6, N'Activated carbon cabin pollen and dust filter.');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'Iridium Spark Plugs (Set of 4)')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'Iridium Spark Plugs (Set of 4)', 1250.00, 12, N'Long-life iridium spark plugs with ignition coil test.');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'70Ah Maintenance-Free Battery')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'70Ah Maintenance-Free Battery', 3900.00, 18, N'12V 70Ah calcium battery with alternator charging check.');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'AC Gas Recharge (R134a)')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'AC Gas Recharge (R134a)', 750.00, 3, N'AC vacuum leak test and R134a refrigerant refill.');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'Computerized Wheel Alignment')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'Computerized Wheel Alignment', 450.00, 1, N'4-wheel laser alignment and suspension geometry check.');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'Brake Fluid DOT 4 Flush')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'Brake Fluid DOT 4 Flush', 520.00, 6, N'Complete hydraulic brake fluid bleed and DOT 4 refill.');
IF NOT EXISTS (SELECT 1 FROM dbo.Products WHERE Name = N'Coolant System Flush & Refill')
    INSERT INTO dbo.Products (Name, Price, WarrantyMonths, Description) VALUES (N'Coolant System Flush & Refill', 680.00, 6, N'Radiator flush and long-life antifreeze coolant refill.');

-- 3. Branch Inventory (realistic mix of healthy, low-stock 1-5, and out-of-stock 0)
INSERT INTO dbo.BranchProducts (BranchId, ProductId, Quantity)
SELECT b.BranchId, p.ProductId,
       CASE
           WHEN (b.BranchId + p.ProductId) % 9 = 0 THEN 0
           WHEN (b.BranchId + p.ProductId) % 4 = 0 THEN 3
           WHEN (b.BranchId + p.ProductId) % 3 = 0 THEN 5
           ELSE 14 + ((b.BranchId * 3 + p.ProductId * 2) % 25)
       END
FROM dbo.service_branches b
CROSS JOIN dbo.Products p
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.BranchProducts bp
    WHERE bp.BranchId = b.BranchId AND bp.ProductId = p.ProductId
);

-- 4. Periodic Service Schedules (ServiceByKm + ServiceByKmProducts)
IF NOT EXISTS (SELECT 1 FROM dbo.ServiceByKm WHERE KilometerInterval = 10000)
    INSERT INTO dbo.ServiceByKm (KilometerInterval, Description, Price)
    VALUES (10000, N'10,000 km Minor Service — Synthetic oil, oil filter, and 25-point inspection.', 1950);

IF NOT EXISTS (SELECT 1 FROM dbo.ServiceByKm WHERE KilometerInterval = 20000)
    INSERT INTO dbo.ServiceByKm (KilometerInterval, Description, Price)
    VALUES (20000, N'20,000 km Standard Service — Oil, oil/air/cabin filters, and wheel alignment.', 2850);

IF NOT EXISTS (SELECT 1 FROM dbo.ServiceByKm WHERE KilometerInterval = 40000)
    INSERT INTO dbo.ServiceByKm (KilometerInterval, Description, Price)
    VALUES (40000, N'40,000 km Major Service — Full fluids, filters, spark plugs, and brake check.', 4600);

IF NOT EXISTS (SELECT 1 FROM dbo.ServiceByKm WHERE KilometerInterval = 60000)
    INSERT INTO dbo.ServiceByKm (KilometerInterval, Description, Price)
    VALUES (60000, N'60,000 km Comprehensive Service — Major service plus brake pads and coolant flush.', 6400);

DECLARE @s10 INT = (SELECT TOP 1 ServiceByKmId FROM dbo.ServiceByKm WHERE KilometerInterval = 10000);
DECLARE @s20 INT = (SELECT TOP 1 ServiceByKmId FROM dbo.ServiceByKm WHERE KilometerInterval = 20000);
DECLARE @s40 INT = (SELECT TOP 1 ServiceByKmId FROM dbo.ServiceByKm WHERE KilometerInterval = 40000);
DECLARE @s60 INT = (SELECT TOP 1 ServiceByKmId FROM dbo.ServiceByKm WHERE KilometerInterval = 60000);

INSERT INTO dbo.ServiceByKmProducts (productId, serviceByKmId)
SELECT p.ProductId, @s10 FROM dbo.Products p
WHERE p.Name IN (N'Full Synthetic Oil 5W-30 (4L)', N'Genuine Oil Filter')
  AND NOT EXISTS (SELECT 1 FROM dbo.ServiceByKmProducts x WHERE x.productId = p.ProductId AND x.serviceByKmId = @s10);

INSERT INTO dbo.ServiceByKmProducts (productId, serviceByKmId)
SELECT p.ProductId, @s20 FROM dbo.Products p
WHERE p.Name IN (N'Full Synthetic Oil 5W-30 (4L)', N'Genuine Oil Filter', N'Engine Air Filter', N'Cabin AC Micro-Filter', N'Computerized Wheel Alignment')
  AND NOT EXISTS (SELECT 1 FROM dbo.ServiceByKmProducts x WHERE x.productId = p.ProductId AND x.serviceByKmId = @s20);

INSERT INTO dbo.ServiceByKmProducts (productId, serviceByKmId)
SELECT p.ProductId, @s40 FROM dbo.Products p
WHERE p.Name IN (N'Full Synthetic Oil 5W-30 (4L)', N'Genuine Oil Filter', N'Engine Air Filter', N'Iridium Spark Plugs (Set of 4)', N'Brake Fluid DOT 4 Flush')
  AND NOT EXISTS (SELECT 1 FROM dbo.ServiceByKmProducts x WHERE x.productId = p.ProductId AND x.serviceByKmId = @s40);

INSERT INTO dbo.ServiceByKmProducts (productId, serviceByKmId)
SELECT p.ProductId, @s60 FROM dbo.Products p
WHERE p.Name IN (N'Full Synthetic Oil 5W-30 (4L)', N'Genuine Oil Filter', N'Front Ceramic Brake Pads', N'Coolant System Flush & Refill', N'Iridium Spark Plugs (Set of 4)')
  AND NOT EXISTS (SELECT 1 FROM dbo.ServiceByKmProducts x WHERE x.productId = p.ProductId AND x.serviceByKmId = @s60);

-- 5. Rental Fleet (CarsForRents)
IF NOT EXISTS (SELECT 1 FROM dbo.CarsForRents WHERE LicencePlate = N'RNT101')
    INSERT INTO dbo.CarsForRents (LicencePlate, Color, No_of_cylinders, Fuel_Type, Engine_type, manufactuare_date, Car_Company, Model, PricePerDay, IsUnderMaintenance, BranchId)
    VALUES (N'RNT101', N'Pearl White', 4, N'Gasoline', N'NaturallyAspirated', '2024-01-01', N'Toyota', N'Corolla', 1450.00, 0, @bNasr);

IF NOT EXISTS (SELECT 1 FROM dbo.CarsForRents WHERE LicencePlate = N'RNT102')
    INSERT INTO dbo.CarsForRents (LicencePlate, Color, No_of_cylinders, Fuel_Type, Engine_type, manufactuare_date, Car_Company, Model, PricePerDay, IsUnderMaintenance, BranchId)
    VALUES (N'RNT102', N'Metallic Silver', 4, N'Gasoline', N'NaturallyAspirated', '2024-02-01', N'Hyundai', N'Elantra CN7', 1350.00, 0, @bMaadi);

IF NOT EXISTS (SELECT 1 FROM dbo.CarsForRents WHERE LicencePlate = N'RNT103')
    INSERT INTO dbo.CarsForRents (LicencePlate, Color, No_of_cylinders, Fuel_Type, Engine_type, manufactuare_date, Car_Company, Model, PricePerDay, IsUnderMaintenance, BranchId)
    VALUES (N'RNT103', N'Graphite Gray', 4, N'Gasoline', N'Turbocharged', '2023-06-01', N'Kia', N'Sportage', 2100.00, 0, @bNewCairo);

IF NOT EXISTS (SELECT 1 FROM dbo.CarsForRents WHERE LicencePlate = N'RNT104')
    INSERT INTO dbo.CarsForRents (LicencePlate, Color, No_of_cylinders, Fuel_Type, Engine_type, manufactuare_date, Car_Company, Model, PricePerDay, IsUnderMaintenance, BranchId)
    VALUES (N'RNT104', N'Midnight Black', 4, N'Gasoline', N'NaturallyAspirated', '2024-03-01', N'Nissan', N'Sunny', 950.00, 0, @bOct);

IF NOT EXISTS (SELECT 1 FROM dbo.CarsForRents WHERE LicencePlate = N'RNT105')
    INSERT INTO dbo.CarsForRents (LicencePlate, Color, No_of_cylinders, Fuel_Type, Engine_type, manufactuare_date, Car_Company, Model, PricePerDay, IsUnderMaintenance, BranchId)
    VALUES (N'RNT105', N'Deep Blue', 4, N'Gasoline', N'Turbocharged', '2023-08-01', N'MG', N'ZS', 1550.00, 0, @bNasr);

IF NOT EXISTS (SELECT 1 FROM dbo.CarsForRents WHERE LicencePlate = N'RNT106')
    INSERT INTO dbo.CarsForRents (LicencePlate, Color, No_of_cylinders, Fuel_Type, Engine_type, manufactuare_date, Car_Company, Model, PricePerDay, IsUnderMaintenance, BranchId)
    VALUES (N'RNT106', N'Mineral White', 4, N'Gasoline', N'Turbocharged', '2023-04-01', N'BMW', N'320i', 3800.00, 1, @bNewCairo);

-- 6. Branch Employees (1 senior lead per branch)
IF NOT EXISTS (SELECT 1 FROM dbo.Employee WHERE Email = N'karim.mansour@csms.eg')
    INSERT INTO dbo.Employee (Full_name, Email, Phone_number, Facultly, Years_of_experince, Starting_work_date, salary, BranchId, UserId)
    VALUES (N'Karim Mansour', N'karim.mansour@csms.eg', N'01012345001', N'Automotive Engineering', 8, '2021-04-01', 16500.00, @bNasr, NULL);

IF NOT EXISTS (SELECT 1 FROM dbo.Employee WHERE Email = N'tarek.nabil@csms.eg')
    INSERT INTO dbo.Employee (Full_name, Email, Phone_number, Facultly, Years_of_experince, Starting_work_date, salary, BranchId, UserId)
    VALUES (N'Tarek Nabil', N'tarek.nabil@csms.eg', N'01012345002', N'Mechanical Engineering', 6, '2022-02-01', 14800.00, @bMaadi, NULL);

IF NOT EXISTS (SELECT 1 FROM dbo.Employee WHERE Email = N'sherif.adel@csms.eg')
    INSERT INTO dbo.Employee (Full_name, Email, Phone_number, Facultly, Years_of_experince, Starting_work_date, salary, BranchId, UserId)
    VALUES (N'Sherif Adel', N'sherif.adel@csms.eg', N'01012345003', N'Mechatronics Engineering', 7, '2022-09-15', 15200.00, @bOct, NULL);

IF NOT EXISTS (SELECT 1 FROM dbo.Employee WHERE Email = N'youssef.sami@csms.eg')
    INSERT INTO dbo.Employee (Full_name, Email, Phone_number, Facultly, Years_of_experince, Starting_work_date, salary, BranchId, UserId)
    VALUES (N'Youssef Sami', N'youssef.sami@csms.eg', N'01012345004', N'Automotive Engineering', 9, '2023-06-01', 17500.00, @bNewCairo, NULL);

-- Assign branch managers if not already set
UPDATE dbo.service_branches SET ManagerId = (SELECT TOP 1 EmployeeId FROM dbo.Employee WHERE Email = N'karim.mansour@csms.eg') WHERE BranchId = @bNasr AND ManagerId IS NULL;
UPDATE dbo.service_branches SET ManagerId = (SELECT TOP 1 EmployeeId FROM dbo.Employee WHERE Email = N'tarek.nabil@csms.eg') WHERE BranchId = @bMaadi AND ManagerId IS NULL;
UPDATE dbo.service_branches SET ManagerId = (SELECT TOP 1 EmployeeId FROM dbo.Employee WHERE Email = N'sherif.adel@csms.eg') WHERE BranchId = @bOct AND ManagerId IS NULL;
UPDATE dbo.service_branches SET ManagerId = (SELECT TOP 1 EmployeeId FROM dbo.Employee WHERE Email = N'youssef.sami@csms.eg') WHERE BranchId = @bNewCairo AND ManagerId IS NULL;

-- 7. Tow Drivers & Emergency Trucks (1 per branch)
IF NOT EXISTS (SELECT 1 FROM dbo.Drivers WHERE Email = N'mahmoud.tow@csms.eg')
    INSERT INTO dbo.Drivers (FullName, PhoneNumber, Email, StartWorkDate, Salary, IsAvailable, Latitude, Longitude, BranchId, UserId)
    VALUES (N'Mahmoud El-Sayed', N'01122334401', N'mahmoud.tow@csms.eg', '2022-05-01', 9500, 1, N'30.0570', N'31.3402', @bNasr, NULL);

IF NOT EXISTS (SELECT 1 FROM dbo.Drivers WHERE Email = N'hassan.tow@csms.eg')
    INSERT INTO dbo.Drivers (FullName, PhoneNumber, Email, StartWorkDate, Salary, IsAvailable, Latitude, Longitude, BranchId, UserId)
    VALUES (N'Hassan Mostafa', N'01122334402', N'hassan.tow@csms.eg', '2022-08-15', 9200, 1, N'29.9610', N'31.2580', @bMaadi, NULL);

IF NOT EXISTS (SELECT 1 FROM dbo.Drivers WHERE Email = N'omar.tow@csms.eg')
    INSERT INTO dbo.Drivers (FullName, PhoneNumber, Email, StartWorkDate, Salary, IsAvailable, Latitude, Longitude, BranchId, UserId)
    VALUES (N'Omar Farouk', N'01122334403', N'omar.tow@csms.eg', '2023-01-10', 9400, 1, N'29.9742', N'30.9425', @bOct, NULL);

IF NOT EXISTS (SELECT 1 FROM dbo.Drivers WHERE Email = N'khaled.tow@csms.eg')
    INSERT INTO dbo.Drivers (FullName, PhoneNumber, Email, StartWorkDate, Salary, IsAvailable, Latitude, Longitude, BranchId, UserId)
    VALUES (N'Khaled Ibrahim', N'01122334404', N'khaled.tow@csms.eg', '2023-07-01', 9800, 1, N'30.0261', N'31.4920', @bNewCairo, NULL);

DECLARE @dNasr INT = (SELECT TOP 1 DriverId FROM dbo.Drivers WHERE Email = N'mahmoud.tow@csms.eg');
DECLARE @dMaadi INT = (SELECT TOP 1 DriverId FROM dbo.Drivers WHERE Email = N'hassan.tow@csms.eg');
DECLARE @dOct INT = (SELECT TOP 1 DriverId FROM dbo.Drivers WHERE Email = N'omar.tow@csms.eg');
DECLARE @dNewCairo INT = (SELECT TOP 1 DriverId FROM dbo.Drivers WHERE Email = N'khaled.tow@csms.eg');

IF NOT EXISTS (SELECT 1 FROM dbo.EmergencyTrucks WHERE Licence_Plate = N'TOW101')
    INSERT INTO dbo.EmergencyTrucks (Licence_Plate, TruckCompany, TruckModel, IsAvailable, StartDate, Manufactuare_Date, BranchId, DriverId)
    VALUES (N'TOW101', N'Isuzu', N'NPR Flatbed', 1, '2022-05-01', '2021-01-01', @bNasr, @dNasr);

IF NOT EXISTS (SELECT 1 FROM dbo.EmergencyTrucks WHERE Licence_Plate = N'TOW102')
    INSERT INTO dbo.EmergencyTrucks (Licence_Plate, TruckCompany, TruckModel, IsAvailable, StartDate, Manufactuare_Date, BranchId, DriverId)
    VALUES (N'TOW102', N'Mitsubishi', N'Canter Recovery', 1, '2022-08-15', '2022-01-01', @bMaadi, @dMaadi);

IF NOT EXISTS (SELECT 1 FROM dbo.EmergencyTrucks WHERE Licence_Plate = N'TOW103')
    INSERT INTO dbo.EmergencyTrucks (Licence_Plate, TruckCompany, TruckModel, IsAvailable, StartDate, Manufactuare_Date, BranchId, DriverId)
    VALUES (N'TOW103', N'Hyundai', N'HD72 Tow', 1, '2023-01-10', '2022-06-01', @bOct, @dOct);

IF NOT EXISTS (SELECT 1 FROM dbo.EmergencyTrucks WHERE Licence_Plate = N'TOW104')
    INSERT INTO dbo.EmergencyTrucks (Licence_Plate, TruckCompany, TruckModel, IsAvailable, StartDate, Manufactuare_Date, BranchId, DriverId)
    VALUES (N'TOW104', N'Isuzu', N'NQR Heavy Flatbed', 1, '2023-07-01', '2023-01-01', @bNewCairo, @dNewCairo);

SELECT 'service_branches' AS TableName, COUNT(*) AS Rows FROM dbo.service_branches
UNION ALL SELECT 'Products', COUNT(*) FROM dbo.Products
UNION ALL SELECT 'BranchProducts', COUNT(*) FROM dbo.BranchProducts
UNION ALL SELECT 'ServiceByKm', COUNT(*) FROM dbo.ServiceByKm
UNION ALL SELECT 'ServiceByKmProducts', COUNT(*) FROM dbo.ServiceByKmProducts
UNION ALL SELECT 'CarsForRents', COUNT(*) FROM dbo.CarsForRents
UNION ALL SELECT 'Employee', COUNT(*) FROM dbo.Employee
UNION ALL SELECT 'Drivers', COUNT(*) FROM dbo.Drivers
UNION ALL SELECT 'EmergencyTrucks', COUNT(*) FROM dbo.EmergencyTrucks;
