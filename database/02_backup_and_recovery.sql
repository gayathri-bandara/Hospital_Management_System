/* =====================================================================
   BACKUP AND RECOVERY  (matches section 10 of the specification)
   Change the folder path to a folder that exists on your SQL Server PC.
   ===================================================================== */
USE master;
GO

-- A) FULL backup (run weekly)
BACKUP DATABASE HMS_DB
TO DISK = 'C:\HMS_Backups\HMS_DB_FULL.bak'
WITH INIT, COMPRESSION, CHECKSUM, NAME = 'HMS weekly full backup';
GO

-- B) DIFFERENTIAL backup (run daily - saves only changes since the last full backup)
BACKUP DATABASE HMS_DB
TO DISK = 'C:\HMS_Backups\HMS_DB_DIFF.bak'
WITH DIFFERENTIAL, INIT, COMPRESSION, CHECKSUM, NAME = 'HMS daily differential backup';
GO

-- C) Check that a backup file is healthy
RESTORE VERIFYONLY FROM DISK = 'C:\HMS_Backups\HMS_DB_FULL.bak' WITH CHECKSUM;
GO

-- D) RESTORE after a disaster (full + differential)
/*
USE master;
ALTER DATABASE HMS_DB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
RESTORE DATABASE HMS_DB FROM DISK = 'C:\HMS_Backups\HMS_DB_FULL.bak' WITH NORECOVERY, REPLACE;
RESTORE DATABASE HMS_DB FROM DISK = 'C:\HMS_Backups\HMS_DB_DIFF.bak' WITH RECOVERY;
ALTER DATABASE HMS_DB SET MULTI_USER;
*/

/* AUTOMATIC SCHEDULE:
   In SSMS -> SQL Server Agent -> Jobs -> New Job.
   Job 1: step = the FULL backup above, schedule = every Sunday 01:00.
   Job 2: step = the DIFFERENTIAL backup, schedule = every day 01:00.
   (SQL Server Express has no Agent: use Windows Task Scheduler + sqlcmd instead.) */
