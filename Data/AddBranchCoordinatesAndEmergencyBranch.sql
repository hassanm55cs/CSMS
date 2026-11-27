-- Run this idempotent script against your CSMS SQL Server database
-- Adds Latitude/Longitude to service_branches and nearest BranchId to EmergencyRequests

IF COL_LENGTH('dbo.service_branches', 'Latitude') IS NULL
BEGIN
    ALTER TABLE dbo.service_branches ADD Latitude FLOAT NULL;
END

IF COL_LENGTH('dbo.service_branches', 'Longitude') IS NULL
BEGIN
    ALTER TABLE dbo.service_branches ADD Longitude FLOAT NULL;
END

IF COL_LENGTH('dbo.EmergencyRequests', 'BranchId') IS NULL
BEGIN
    ALTER TABLE dbo.EmergencyRequests ADD BranchId INT NULL;
END

IF NOT EXISTS (
    SELECT 1 FROM sys.foreign_keys
    WHERE name = 'FK_EmergencyRequests_service_branches_BranchId'
)
BEGIN
    ALTER TABLE dbo.EmergencyRequests
    ADD CONSTRAINT FK_EmergencyRequests_service_branches_BranchId
        FOREIGN KEY (BranchId) REFERENCES dbo.service_branches (BranchId);
END

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_EmergencyRequests_BranchId'
      AND object_id = OBJECT_ID('dbo.EmergencyRequests')
)
BEGIN
    CREATE INDEX IX_EmergencyRequests_BranchId ON dbo.EmergencyRequests (BranchId);
END
GO
