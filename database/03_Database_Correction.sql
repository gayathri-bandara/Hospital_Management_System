ALTER LOGIN [hms_user]
WITH PASSWORD = 'gayathri';

ALTER LOGIN [hms_user] ENABLE;

USE [HMS_DB];

IF USER_ID('hms_user') IS NULL
    CREATE USER [hms_user] FOR LOGIN [hms_user];
ELSE
    ALTER USER [hms_user] WITH LOGIN = [hms_user];

IF NOT EXISTS (
    SELECT 1
    FROM sys.database_role_members drm
    JOIN sys.database_principals rolep ON rolep.principal_id = drm.role_principal_id
    JOIN sys.database_principals userp ON userp.principal_id = drm.member_principal_id
    WHERE rolep.name = 'db_datareader' AND userp.name = 'hms_user'
)
    ALTER ROLE [db_datareader] ADD MEMBER [hms_user];

IF NOT EXISTS (
    SELECT 1
    FROM sys.database_role_members drm
    JOIN sys.database_principals rolep ON rolep.principal_id = drm.role_principal_id
    JOIN sys.database_principals userp ON userp.principal_id = drm.member_principal_id
    WHERE rolep.name = 'db_datawriter' AND userp.name = 'hms_user'
)
    ALTER ROLE [db_datawriter] ADD MEMBER [hms_user];