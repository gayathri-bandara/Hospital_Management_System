import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Layout, { MENU, canSee } from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import PatientDetail from './pages/PatientDetail';
import Billing from './pages/Billing';
import Pharmacy from './pages/Pharmacy';
import Reports from './pages/Reports';
import ChangePassword from './pages/ChangePassword';
import * as P from './pages/SimplePages';

const pages = {
  '/dashboard': <Dashboard />,
  '/patients': <P.Patients />,
  '/appointments': <P.Appointments />,
  '/doctors': <P.Doctors />,
  '/departments': <P.Departments />,
  '/records': <P.Records />,
  '/admissions': <P.Admissions />,
  '/lab': <P.LabRequests />,
  '/lab-tests': <P.LabTests />,
  '/pharmacy': <Pharmacy />,
  '/medicines': <P.Medicines />,
  '/billing': <Billing />,
  '/staff': <P.Staff />,
  '/attendance': <P.Attendance />,
  '/leaves': <P.Leaves />,
  '/reports': <Reports />,
  '/users': <P.Users />,
  '/audit': <P.AuditLogs />,
};

export default function App() {
  const { user } = useAuth();
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        {MENU.filter((m) => canSee(m, user.role)).map((m) => (
          <Route key={m.path} path={m.path} element={pages[m.path]} />
        ))}
        {['Admin', 'Doctor', 'Nurse'].includes(user.role) && (
          <Route path="/patients/:id" element={<PatientDetail />} />
        )}
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<div className="panel">Page not found or not allowed for your role.</div>} />
      </Route>
    </Routes>
  );
}
