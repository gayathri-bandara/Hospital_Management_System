# Hospital Management System (HMS) - Step-by-Step Guide

Stack: **React** (frontend) + **Node.js / Express** (backend) + **SQL Server** (database) + **VS Code**.

This project covers every module in your specification: users and roles, patients, doctors, appointments,
medical records, laboratory, pharmacy, billing and payments, inpatients (admissions), staff, reports,
audit logs, backup and recovery.

---

## 1. How the system works (simple picture)

```
Browser (React, port 5173)  --->  Node.js API (Express, port 5000)  --->  SQL Server (HMS_DB)
   what the user sees               checks login, rules, permissions         stores all data
```

This matches the 4 layers in your specification:

| Specification layer | Where it is in the project |
|---|---|
| Presentation layer | `frontend/src/pages`, `frontend/src/components` |
| Application layer | `backend/src/routes` (the API endpoints) |
| Business logic layer | rules inside the routes (stock check, payment check, appointment clash check) |
| Database layer | `backend/src/db.js` + `database/01_create_database.sql` |

---

## 2. Install the tools (one time)

1. **Node.js LTS** (version 18 or newer) - https://nodejs.org . After install, open a terminal and check:
   `node --version` and `npm --version`.
2. **SQL Server** - install **SQL Server Developer** or **Express** (both free).
3. **SSMS** (SQL Server Management Studio) - the tool to run SQL scripts.
4. **VS Code** - https://code.visualstudio.com . Useful extensions: *ES7+ React snippets*, *Prettier*, *SQL Server (mssql)*.

---

## 3. Prepare SQL Server (very important)

The Node.js backend connects with a SQL login over TCP, so check these 3 settings:

1. **Mixed mode login**: In SSMS, right-click your server -> *Properties* -> *Security* -> choose
   **SQL Server and Windows Authentication mode** -> OK. Then restart the SQL Server service.
2. **Enable TCP/IP**: Open *SQL Server Configuration Manager* -> *SQL Server Network Configuration* ->
   *Protocols for MSSQLSERVER* (or *SQLEXPRESS*) -> right-click **TCP/IP** -> *Enable*.
   Double-click TCP/IP -> *IP Addresses* tab -> scroll to **IPAll** -> set **TCP Port = 1433**
   (clear *TCP Dynamic Ports*). Restart the SQL Server service.
3. **If you use SQL Server Express with a named instance** (`localhost\SQLEXPRESS`), keep port 1433 as above and use
   `DB_SERVER=localhost` in the `.env` file.

---

## 4. Create the database

1. Open SSMS and connect to your server.
2. Open the file `database/01_create_database.sql` (File -> Open -> File).
3. Click **Execute** (F5).
4. You should see `HMS_DB is ready.` in the Messages tab.

This script creates:

* The database `HMS_DB`
* 22 tables: Roles, Users, Departments, Doctors, Patients, PatientDocuments, Appointments, Admissions, MedicalRecords,
  LabTests, LabRequests, Medicines, PharmacyDispenses, Bills, BillItems, Payments, Employees, Attendance, LeaveRecords, AuditLogs
* Primary keys, foreign keys, CHECK rules (for example, a payment must be above 0) and indexes
* Starting data: 7 roles, 9 departments, 6 lab tests, 4 medicines
* A SQL login `hms_user` (password `Hms@Strong#2026` - **change it** in the script before you run it if you want your own)

### Database tables at a glance

| Module in your specification | Tables |
|---|---|
| User management | Roles, Users, AuditLogs |
| Patient management | Patients, PatientDocuments |
| Doctor management | Doctors, Departments |
| Appointments | Appointments |
| Inpatient | Admissions |
| Electronic medical records | MedicalRecords |
| Laboratory | LabTests, LabRequests |
| Pharmacy | Medicines, PharmacyDispenses |
| Billing | Bills, BillItems, Payments |
| Staff | Employees, Attendance, LeaveRecords |

---

## 5. Set up the backend (Node.js)

Open the **project folder** in VS Code (File -> Open Folder -> `hms`). Open a terminal (Ctrl + `).

```bash
cd backend
npm install
```

Check the file `backend/.env` (already created from `.env.example`):

```
PORT=5000
CLIENT_URL=http://localhost:5173
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=HMS_DB
DB_USER=hms_user
DB_PASSWORD=Hms@Strong#2026      <- same as the password in the SQL script
JWT_SECRET=...                   <- change this to your own long random text
JWT_EXPIRES=30m
```

Create the first administrator (the password is stored as a secure hash, never as plain text):

```bash
npm run create-admin
```

This creates username **admin** with password **Admin@12345**. (Custom: `node scripts/createAdmin.js myname MyPassword123`.)

Start the backend:

```bash
npm run dev
```

You should see:
```
Connected to SQL Server database.
HMS API running on http://localhost:5000
```
Test it: open http://localhost:5000/api/health in the browser. You should see `{"status":"ok"}`.

---

## 6. Set up the frontend (React)

Open a **second terminal** (keep the first one running):

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** and log in with `admin` / `Admin@12345`.

(The file `vite.config.js` sends every `/api` request to the backend, so you do not need to deal with CORS during development.)

---

## 7. First-time use (recommended order)

1. Log in as **admin** and change the password (top right -> *Change password*).
2. **Departments**: check or add departments.
3. **Doctors**: add doctors (department, fee, schedule).
4. **Users**: create one user for each role, for example `reception1` (Receptionist), `dr.silva` (Doctor),
   `lab1` (LabStaff), `pharma1` (Pharmacist), `acc1` (Accountant), `nurse1` (Nurse).
5. Log in as the Receptionist: register a patient -> book an appointment.
6. Log in as the Doctor: add a medical record, request a lab test.
7. Log in as LabStaff: mark *Sample collected* -> *Enter result* -> *Print report*.
8. Log in as the Pharmacist: add medicines (Medicine stock) -> dispense medicine.
9. Log in as the Accountant: *Create invoice* -> *Receive payment* -> *Print receipt*.
10. Open **Reports** and the **Audit log** (admin) to check everything was recorded.

---

## 8. Who can do what (Role-Based Access Control)

The rules are enforced **on the server** (`backend/src/routes`), and the menu in React hides what a role cannot use.
Admin can do everything.

| Module | Can view | Can add / edit / delete |
|---|---|---|
| Patients | All staff | Receptionist, Nurse |
| Patient history & documents | Doctor, Nurse | Doctor, Nurse (upload) |
| Doctors, Departments | All staff | Admin |
| Appointments | Receptionist, Doctor, Nurse | Receptionist (status: also Doctor, Nurse) |
| Medical records | Doctor, Nurse | Doctor |
| Admissions | Receptionist, Doctor, Nurse, Accountant | Receptionist, Doctor, Nurse |
| Lab requests | Doctor, Nurse, LabStaff | Request: Doctor, Nurse. Sample: Nurse, LabStaff. Result: LabStaff |
| Lab test list | Doctor, Nurse, LabStaff, Receptionist | LabStaff |
| Medicines / Pharmacy | Pharmacist (Doctor, Nurse view stock) | Pharmacist |
| Billing | Receptionist, Accountant | Receptionist, Accountant |
| Staff, Attendance, Leave | Admin | Admin |
| Users, Audit log | Admin | Admin |
| Reports | Each role sees its own reports | - |

---

## 9. Project structure and what each file does

```
hms/
|-- database/
|   |-- 01_create_database.sql        create database, tables, indexes, starting data, SQL login
|   `-- 02_backup_and_recovery.sql    full + differential backup and restore commands
|-- backend/
|   |-- .env                          secret settings (database password, JWT secret)
|   |-- package.json                  list of libraries
|   |-- scripts/createAdmin.js        creates the first admin user
|   `-- src/
|       |-- server.js                 starts Express, connects all routes, handles errors
|       |-- db.js                     SQL Server connection, query() and transaction()
|       |-- config/roles.js           role names
|       |-- middleware/auth.js        login check, role check, audit log writer
|       |-- utils/helpers.js          small helper functions
|       |-- utils/crud.js             reusable list/get/create/update/delete builder
|       `-- routes/
|           |-- auth.js               login, logout, change password
|           |-- users.js              user management (Admin)
|           |-- simpleCrud.js         patients, doctors, departments, employees, attendance, leave, medicines, lab tests
|           |-- patients.js           patient history + document upload/download
|           |-- appointments.js       appointments + clash check + status change
|           |-- admissions.js         inpatients + discharge
|           |-- records.js            medical records
|           |-- lab.js                lab requests, sample collection, result entry
|           |-- pharmacy.js           dispense (reduces stock), alerts (low stock / expiry)
|           |-- billing.js            invoices, items, payments
|           |-- dashboard.js          dashboard numbers
|           |-- reports.js            6 reports
|           `-- auditLogs.js          audit log list
`-- frontend/
    |-- vite.config.js                dev server + proxy to the backend
    `-- src/
        |-- main.jsx, App.jsx         start-up and page routes
        |-- api.js                    axios (adds the login token to every request)
        |-- AuthContext.jsx           login state + 15-minute inactivity logout
        |-- utils.js                  date/money formatting, print and CSV helpers
        |-- index.css                 all styling
        |-- components/               Layout (menu), Modal, ResourcePage (table + form)
        `-- pages/                    Login, Dashboard, SimplePages, PatientDetail, Pharmacy, Billing, Reports, ChangePassword
```

**Tip - add a new simple module later:** create a backend config with `crud({...})` and a frontend page with
`<ResourcePage ... />`. Copy any existing one (for example Departments).

---

## 10. Your specification mapped to the code

| Requirement | How it is done |
|---|---|
| Login, Logout, Password management | `routes/auth.js`, `pages/Login.jsx`, `pages/ChangePassword.jsx` |
| Password encryption | `bcryptjs` hash in the database |
| Role-based access control | `authorize()` in `middleware/auth.js` + `MENU` roles in `Layout.jsx` |
| Audit logs | Every POST/PUT/DELETE and login/logout is written to `AuditLogs` |
| Automatic session timeout | JWT expires in 30 minutes + 15 minutes inactivity logout in `AuthContext.jsx` |
| Search patient | Search box on the Patients page |
| Upload documents | Patient history page -> Documents |
| Appointment cancel / reschedule / status | Buttons and Edit form on the Appointments page |
| Lab: request -> sample -> result -> report | Lab requests page with action buttons and *Print report* |
| Pharmacy: inventory, prescription, stock, expiry | Medicine stock + Pharmacy page (dispense reduces stock, alerts for expiry) |
| Billing: consultation, lab, pharmacy, admission charges | Item types in *Create invoice*; payments and receipts |
| Staff: registration, attendance, leave | Staff, Attendance, Leave records pages |
| Reports | Reports page (screen, CSV, print) |
| Dashboard | Dashboard page (patients, appointments, revenue, lab, pharmacy alerts) |
| Responsive design | CSS media queries in `index.css` |
| Daily / weekly backup, disaster recovery | `database/02_backup_and_recovery.sql` |

---

## 11. Backup and recovery

Open `database/02_backup_and_recovery.sql`, change `C:\HMS_Backups\` to a real folder, and run the commands you need.
To make it automatic, create two **SQL Server Agent jobs** (weekly FULL backup, daily DIFFERENTIAL backup).
For SQL Server Express (no Agent), use **Windows Task Scheduler** to run `sqlcmd` with the same commands.
Also copy the `backend/uploads` folder (patient documents) to your backup location.
Test a restore on another computer at least once. A backup that was never tested is not a backup.

---

## 12. Go live (production) checklist

* Change `JWT_SECRET`, the `hms_user` password and the admin password.
* Run the frontend build: `cd frontend && npm run build` (creates the `dist` folder). Serve `dist` with Nginx or IIS and
  forward `/api` to the Node.js backend (`pm2 start src/server.js --name hms-api` keeps Node running).
* Use **HTTPS** (a certificate on Nginx/IIS). Medical data must never travel over plain HTTP.
* Set `CLIENT_URL` in `.env` to your real website address.
* Install the SQL Server on a separate server, and keep a backup server (as in your hardware list).
* Follow your country's health-data privacy law (for example the Sri Lanka PDPA, or HIPAA / GDPR if they apply to you).

---

## 13. Troubleshooting

| Problem | Fix |
|---|---|
| `Could not connect to SQL Server: ... ECONNREFUSED` | TCP/IP is not enabled or the port is not 1433 (section 3). Restart the SQL Server service. |
| `Login failed for user 'hms_user'` | Mixed mode not enabled, or the password in `.env` differs from the SQL script. |
| `Cannot open database "HMS_DB"` | Run `01_create_database.sql` fully. |
| `npm run create-admin` fails | The backend `.env` is wrong, or the SQL script was not run. |
| Login page says "Cannot reach the server" | The backend is not running (terminal 1) or the port is not 5000. |
| Date/time shows one day off | Keep the SQL Server and PC time zones correct; dates are stored as DATE (no time zone). |
| "Too many login attempts" | Wait 15 minutes (this protects against password guessing). |

---

## 14. Future enhancements (from section 12 of your specification) - how to start

| Enhancement | First step |
|---|---|
| Patient portal | Add a `Patient` role + `PatientUserId` column in Patients; new React pages that show only the patient's own data. |
| SMS and email notifications | Add `nodemailer` (email) and an SMS gateway API; send from `appointments.js` after booking. |
| Telemedicine | Add a `MeetingLink` column to Appointments and create video links (Jitsi / Zoom API). |
| Insurance integration | Add `InsuranceCompanies` and `PatientInsurance` tables; the `Insurance` payment method already exists. |
| Mobile app | Build a React Native app that uses the same API. |
| Biometric authentication | Use WebAuthn (fingerprint / security key) as a second login step. |
| Cloud deployment | Azure SQL + Azure App Service (set `encrypt: true` in `db.js`). |
| AI decision support | Add a service that reads MedicalRecords and LabRequests and returns suggestions - always reviewed by a doctor. |

---

## 15. Known limits of this first version (so you are not surprised)

* Drop-downs load full lists of patients/doctors. For a very large hospital, replace them with a search-as-you-type box.
* The appointment screen has a date / doctor / status filter (a daily schedule). A drag-and-drop calendar can be added later
  (for example with the `react-big-calendar` library).
* Pharmacy dispensing and billing are separate steps: after dispensing, add the amount in *Create invoice*.
* There are no automated tests yet. Test each module by hand using the order in section 7.
