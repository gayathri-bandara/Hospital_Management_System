import { NavLink, Outlet, Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Which menu items each role can see (must match the backend permissions).
export const MENU = [
  { path: '/dashboard', label: 'Dashboard', roles: 'all' },
  { path: '/patients', label: 'Patients', roles: 'all' },
  { path: '/appointments', label: 'Appointments', roles: ['Receptionist', 'Doctor', 'Nurse'] },
  { path: '/doctors', label: 'Doctors', roles: 'all' },
  { path: '/departments', label: 'Departments', roles: 'all' },
  { path: '/records', label: 'Medical records', roles: ['Doctor', 'Nurse'] },
  { path: '/admissions', label: 'Admissions', roles: ['Receptionist', 'Doctor', 'Nurse', 'Accountant'] },
  { path: '/lab', label: 'Lab requests', roles: ['Doctor', 'Nurse', 'LabStaff'] },
  { path: '/lab-tests', label: 'Lab test list', roles: ['Doctor', 'Nurse', 'LabStaff', 'Receptionist'] },
  { path: '/pharmacy', label: 'Pharmacy', roles: ['Pharmacist'] },
  { path: '/medicines', label: 'Medicine stock', roles: ['Pharmacist', 'Doctor', 'Nurse'] },
  { path: '/billing', label: 'Billing', roles: ['Receptionist', 'Accountant'] },
  { path: '/staff', label: 'Staff', roles: [] },
  { path: '/attendance', label: 'Attendance', roles: [] },
  { path: '/leaves', label: 'Leave records', roles: [] },
  { path: '/reports', label: 'Reports', roles: ['Receptionist', 'Doctor', 'Accountant', 'Pharmacist', 'LabStaff'] },
  { path: '/users', label: 'Users', roles: [] },
  { path: '/audit', label: 'Audit log', roles: [] },
];

export const canSee = (item, role) =>
  role === 'Admin' || item.roles === 'all' || item.roles.includes(role);

export default function Layout() {
  const { user, logout } = useAuth();
  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Main menu">
        <div className="brand">HMS<small>Hospital Management</small></div>
        {MENU.filter((m) => canSee(m, user.role)).map((m) => (
          <NavLink key={m.path} to={m.path} className={({ isActive }) => (isActive ? 'active' : '')}>
            {m.label}
          </NavLink>
        ))}
      </nav>
      <div className="main">
        <div className="topbar">
          <span className="who">{user.name} ({user.role})</span>
          <Link to="/change-password">Change password</Link>
          <button onClick={logout}>Log out</button>
        </div>
        <div className="content"><Outlet /></div>
      </div>
    </div>
  );
}
