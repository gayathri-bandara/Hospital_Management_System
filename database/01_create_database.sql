/* =====================================================================
   HOSPITAL MANAGEMENT SYSTEM  -  DATABASE SCRIPT (SQL Server)
   Run this whole file in SSMS (SQL Server Management Studio).
   It is safe to run again: it only creates things that do not exist.
   ===================================================================== */

-- 1) Create the database -------------------------------------------------
IF DB_ID('HMS_DB') IS NULL
    CREATE DATABASE HMS_DB;
GO
USE HMS_DB;
GO

-- 2) Security: Roles and Users -------------------------------------------
IF OBJECT_ID('dbo.Roles') IS NULL
CREATE TABLE dbo.Roles (
    RoleId    INT IDENTITY(1,1) PRIMARY KEY,
    RoleName  NVARCHAR(50) NOT NULL UNIQUE
);
GO
IF OBJECT_ID('dbo.Users') IS NULL
CREATE TABLE dbo.Users (
    UserId        INT IDENTITY(1,1) PRIMARY KEY,
    Username      NVARCHAR(50)  NOT NULL UNIQUE,
    PasswordHash  NVARCHAR(200) NOT NULL,          -- bcrypt hash, never plain text
    FullName      NVARCHAR(100) NOT NULL,
    RoleId        INT NOT NULL REFERENCES dbo.Roles(RoleId),
    IsActive      BIT NOT NULL DEFAULT 1,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- 3) Departments, Doctors, Patients --------------------------------------
IF OBJECT_ID('dbo.Departments') IS NULL
CREATE TABLE dbo.Departments (
    DepartmentId    INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentName  NVARCHAR(100) NOT NULL UNIQUE,
    Description     NVARCHAR(300) NULL
);
GO
IF OBJECT_ID('dbo.Doctors') IS NULL
CREATE TABLE dbo.Doctors (
    DoctorId         INT IDENTITY(1,1) PRIMARY KEY,
    FullName         NVARCHAR(100) NOT NULL,
    Specialization   NVARCHAR(100) NULL,
    Phone            NVARCHAR(30)  NULL,
    Email            NVARCHAR(100) NULL,
    DepartmentId     INT NULL REFERENCES dbo.Departments(DepartmentId),
    ConsultationFee  DECIMAL(10,2) NOT NULL DEFAULT 0,
    Schedule         NVARCHAR(200) NULL,            -- example: Mon-Fri 09:00-13:00
    IsActive         BIT NOT NULL DEFAULT 1
);
GO
IF OBJECT_ID('dbo.Patients') IS NULL
CREATE TABLE dbo.Patients (
    PatientId         INT IDENTITY(1,1) PRIMARY KEY,
    FullName          NVARCHAR(100) NOT NULL,
    Gender            NVARCHAR(10)  NOT NULL CHECK (Gender IN ('Male','Female','Other')),
    DateOfBirth       DATE NULL,
    Phone             NVARCHAR(30)  NULL,
    Email             NVARCHAR(100) NULL,
    Address           NVARCHAR(250) NULL,
    BloodGroup        NVARCHAR(5)   NULL,
    EmergencyContact  NVARCHAR(100) NULL,
    CreatedAt         DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.PatientDocuments') IS NULL
CREATE TABLE dbo.PatientDocuments (
    DocumentId    INT IDENTITY(1,1) PRIMARY KEY,
    PatientId     INT NOT NULL REFERENCES dbo.Patients(PatientId) ON DELETE CASCADE,
    OriginalName  NVARCHAR(255) NOT NULL,
    StoredName    NVARCHAR(255) NOT NULL,
    UploadedBy    NVARCHAR(50)  NULL,
    UploadedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- 4) Appointments, Admissions, Medical Records ---------------------------
IF OBJECT_ID('dbo.Appointments') IS NULL
CREATE TABLE dbo.Appointments (
    AppointmentId    INT IDENTITY(1,1) PRIMARY KEY,
    PatientId        INT NOT NULL REFERENCES dbo.Patients(PatientId),
    DoctorId         INT NOT NULL REFERENCES dbo.Doctors(DoctorId),
    AppointmentDate  DATE NOT NULL,
    AppointmentTime  TIME(0) NOT NULL,
    Reason           NVARCHAR(300) NULL,
    Status           NVARCHAR(20) NOT NULL DEFAULT 'Scheduled'
                     CHECK (Status IN ('Scheduled','Completed','Cancelled','No Show')),
    CreatedAt        DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.Admissions') IS NULL
CREATE TABLE dbo.Admissions (
    AdmissionId    INT IDENTITY(1,1) PRIMARY KEY,
    PatientId      INT NOT NULL REFERENCES dbo.Patients(PatientId),
    DoctorId       INT NULL REFERENCES dbo.Doctors(DoctorId),
    RoomNo         NVARCHAR(20) NOT NULL,
    AdmitDate      DATE NOT NULL,
    DischargeDate  DATE NULL,
    DailyCharge    DECIMAL(10,2) NOT NULL DEFAULT 0,
    Status         NVARCHAR(20) NOT NULL DEFAULT 'Admitted' CHECK (Status IN ('Admitted','Discharged')),
    Notes          NVARCHAR(300) NULL
);
GO
IF OBJECT_ID('dbo.MedicalRecords') IS NULL
CREATE TABLE dbo.MedicalRecords (
    RecordId      INT IDENTITY(1,1) PRIMARY KEY,
    PatientId     INT NOT NULL REFERENCES dbo.Patients(PatientId),
    DoctorId      INT NOT NULL REFERENCES dbo.Doctors(DoctorId),
    VisitDate     DATE NOT NULL DEFAULT CAST(GETDATE() AS DATE),
    Diagnosis     NVARCHAR(500) NOT NULL,
    Prescription  NVARCHAR(1000) NULL,
    Treatment     NVARCHAR(1000) NULL,
    Notes         NVARCHAR(1000) NULL,
    CreatedAt     DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- 5) Laboratory ----------------------------------------------------------
IF OBJECT_ID('dbo.LabTests') IS NULL
CREATE TABLE dbo.LabTests (
    TestId    INT IDENTITY(1,1) PRIMARY KEY,
    TestName  NVARCHAR(100) NOT NULL UNIQUE,
    Price     DECIMAL(10,2) NOT NULL DEFAULT 0
);
GO
IF OBJECT_ID('dbo.LabRequests') IS NULL
CREATE TABLE dbo.LabRequests (
    RequestId         INT IDENTITY(1,1) PRIMARY KEY,
    PatientId         INT NOT NULL REFERENCES dbo.Patients(PatientId),
    DoctorId          INT NULL REFERENCES dbo.Doctors(DoctorId),
    TestId            INT NOT NULL REFERENCES dbo.LabTests(TestId),
    Status            NVARCHAR(20) NOT NULL DEFAULT 'Requested'
                      CHECK (Status IN ('Requested','Sample Collected','Completed')),
    RequestedAt       DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    SampleCollectedAt DATETIME2 NULL,
    Result            NVARCHAR(2000) NULL,
    ResultAt          DATETIME2 NULL,
    Notes             NVARCHAR(300) NULL
);
GO

-- 6) Pharmacy ------------------------------------------------------------
IF OBJECT_ID('dbo.Medicines') IS NULL
CREATE TABLE dbo.Medicines (
    MedicineId    INT IDENTITY(1,1) PRIMARY KEY,
    MedicineName  NVARCHAR(150) NOT NULL,
    Category      NVARCHAR(80)  NULL,
    UnitPrice     DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (UnitPrice >= 0),
    StockQty      INT NOT NULL DEFAULT 0 CHECK (StockQty >= 0),
    ReorderLevel  INT NOT NULL DEFAULT 10,
    ExpiryDate    DATE NULL
);
GO
IF OBJECT_ID('dbo.PharmacyDispenses') IS NULL
CREATE TABLE dbo.PharmacyDispenses (
    DispenseId   INT IDENTITY(1,1) PRIMARY KEY,
    PatientId    INT NOT NULL REFERENCES dbo.Patients(PatientId),
    MedicineId   INT NOT NULL REFERENCES dbo.Medicines(MedicineId),
    Quantity     INT NOT NULL CHECK (Quantity > 0),
    TotalPrice   DECIMAL(10,2) NOT NULL,
    DispensedBy  NVARCHAR(50) NULL,
    DispensedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- 7) Billing and Payments ------------------------------------------------
IF OBJECT_ID('dbo.Bills') IS NULL
CREATE TABLE dbo.Bills (
    BillId       INT IDENTITY(1,1) PRIMARY KEY,
    PatientId    INT NOT NULL REFERENCES dbo.Patients(PatientId),
    TotalAmount  DECIMAL(12,2) NOT NULL DEFAULT 0,
    PaidAmount   DECIMAL(12,2) NOT NULL DEFAULT 0,
    Status       NVARCHAR(20) NOT NULL DEFAULT 'Unpaid' CHECK (Status IN ('Unpaid','Partial','Paid')),
    CreatedBy    NVARCHAR(50) NULL,
    CreatedAt    DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO
IF OBJECT_ID('dbo.BillItems') IS NULL
CREATE TABLE dbo.BillItems (
    BillItemId   INT IDENTITY(1,1) PRIMARY KEY,
    BillId       INT NOT NULL REFERENCES dbo.Bills(BillId) ON DELETE CASCADE,
    ItemType     NVARCHAR(20) NOT NULL
                 CHECK (ItemType IN ('Consultation','Laboratory','Pharmacy','Admission','Other')),
    Description  NVARCHAR(200) NOT NULL,
    Amount       DECIMAL(12,2) NOT NULL CHECK (Amount > 0)
);
GO
IF OBJECT_ID('dbo.Payments') IS NULL
CREATE TABLE dbo.Payments (
    PaymentId   INT IDENTITY(1,1) PRIMARY KEY,
    BillId      INT NOT NULL REFERENCES dbo.Bills(BillId),
    Amount      DECIMAL(12,2) NOT NULL CHECK (Amount > 0),
    Method      NVARCHAR(20) NOT NULL CHECK (Method IN ('Cash','Card','Online','Insurance')),
    ReceivedBy  NVARCHAR(50) NULL,
    PaidAt      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- 8) Staff: Employees, Attendance, Leave ---------------------------------
IF OBJECT_ID('dbo.Employees') IS NULL
CREATE TABLE dbo.Employees (
    EmployeeId    INT IDENTITY(1,1) PRIMARY KEY,
    FullName      NVARCHAR(100) NOT NULL,
    Position      NVARCHAR(100) NOT NULL,
    DepartmentId  INT NULL REFERENCES dbo.Departments(DepartmentId),
    Phone         NVARCHAR(30)  NULL,
    Email         NVARCHAR(100) NULL,
    JoinDate      DATE NULL,
    IsActive      BIT NOT NULL DEFAULT 1
);
GO
IF OBJECT_ID('dbo.Attendance') IS NULL
CREATE TABLE dbo.Attendance (
    AttendanceId    INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId      INT NOT NULL REFERENCES dbo.Employees(EmployeeId) ON DELETE CASCADE,
    AttendanceDate  DATE NOT NULL,
    Status          NVARCHAR(20) NOT NULL CHECK (Status IN ('Present','Absent','Late','On Leave')),
    CONSTRAINT UQ_Attendance UNIQUE (EmployeeId, AttendanceDate)
);
GO
IF OBJECT_ID('dbo.LeaveRecords') IS NULL
CREATE TABLE dbo.LeaveRecords (
    LeaveId     INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId  INT NOT NULL REFERENCES dbo.Employees(EmployeeId) ON DELETE CASCADE,
    FromDate    DATE NOT NULL,
    ToDate      DATE NOT NULL,
    Reason      NVARCHAR(300) NULL,
    Status      NVARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (Status IN ('Pending','Approved','Rejected')),
    CONSTRAINT CK_Leave_Dates CHECK (ToDate >= FromDate)
);
GO

-- 9) Audit log -----------------------------------------------------------
IF OBJECT_ID('dbo.AuditLogs') IS NULL
CREATE TABLE dbo.AuditLogs (
    LogId      BIGINT IDENTITY(1,1) PRIMARY KEY,
    UserId     INT NULL,
    Username   NVARCHAR(50) NULL,
    Action     NVARCHAR(20) NULL,
    Details    NVARCHAR(500) NULL,
    CreatedAt  DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

-- 10) Indexes (make searching faster) ------------------------------------
CREATE INDEX IX_Patients_Name        ON dbo.Patients(FullName);
CREATE INDEX IX_Patients_Phone       ON dbo.Patients(Phone);
CREATE INDEX IX_Appointments_Date    ON dbo.Appointments(AppointmentDate, DoctorId);
CREATE INDEX IX_Appointments_Patient ON dbo.Appointments(PatientId);
CREATE INDEX IX_Records_Patient      ON dbo.MedicalRecords(PatientId);
CREATE INDEX IX_LabRequests_Status   ON dbo.LabRequests(Status);
CREATE INDEX IX_Bills_Patient        ON dbo.Bills(PatientId);
CREATE INDEX IX_Payments_PaidAt      ON dbo.Payments(PaidAt);
CREATE INDEX IX_Audit_CreatedAt      ON dbo.AuditLogs(CreatedAt);
GO

-- 11) Starting data ------------------------------------------------------
INSERT INTO dbo.Roles (RoleName)
SELECT v.RoleName FROM (VALUES
  ('Admin'),('Doctor'),('Nurse'),('Receptionist'),
  ('LabStaff'),('Pharmacist'),('Accountant')) AS v(RoleName)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Roles r WHERE r.RoleName = v.RoleName);

INSERT INTO dbo.Departments (DepartmentName, Description)
SELECT v.n, v.d FROM (VALUES
  ('General Medicine','General check-ups and common illnesses'),
  ('Pediatrics','Child health'),
  ('Cardiology','Heart care'),
  ('Orthopedics','Bones and joints'),
  ('Gynecology','Womens health'),
  ('Emergency','24-hour emergency care'),
  ('Laboratory','Diagnostic tests'),
  ('Pharmacy','Medicine store'),
  ('Administration','Hospital administration')) AS v(n,d)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Departments x WHERE x.DepartmentName = v.n);

INSERT INTO dbo.LabTests (TestName, Price)
SELECT v.n, v.p FROM (VALUES
  ('Full Blood Count',1500.00),('Blood Sugar (Fasting)',600.00),
  ('Lipid Profile',2500.00),('Urine Full Report',800.00),
  ('Liver Function Test',2200.00),('Chest X-Ray',2000.00)) AS v(n,p)
WHERE NOT EXISTS (SELECT 1 FROM dbo.LabTests x WHERE x.TestName = v.n);

IF NOT EXISTS (SELECT 1 FROM dbo.Medicines)
INSERT INTO dbo.Medicines (MedicineName, Category, UnitPrice, StockQty, ReorderLevel, ExpiryDate) VALUES
  ('Paracetamol 500mg','Pain relief',5.00,500,100,DATEADD(YEAR,2,GETDATE())),
  ('Amoxicillin 500mg','Antibiotic',25.00,200,50,DATEADD(YEAR,1,GETDATE())),
  ('Cetirizine 10mg','Allergy',8.00,300,50,DATEADD(YEAR,2,GETDATE())),
  ('Omeprazole 20mg','Stomach',12.00,150,40,DATEADD(MONTH,10,GETDATE()));
GO

-- 12) A limited login for the Node.js backend ----------------------------
-- CHANGE THE PASSWORD below, then use the same one in backend/.env
USE master;
GO
IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = 'hms_user')
    CREATE LOGIN hms_user WITH PASSWORD = 'Hms@Strong#2026', CHECK_POLICY = OFF;
GO
USE HMS_DB;
GO
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = 'hms_user')
    CREATE USER hms_user FOR LOGIN hms_user;
ALTER ROLE db_datareader ADD MEMBER hms_user;
ALTER ROLE db_datawriter ADD MEMBER hms_user;
GO

PRINT 'HMS_DB is ready.';
