import Analytics from './pages/Analytics';
import Appointments from './pages/Appointments';
import Dashboard from './pages/Dashboard';
import MedicalRecords from './pages/MedicalRecords';
import PatientDetails from './pages/PatientDetails';
import Patients from './pages/Patients';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import AdminOrganizations from './pages/AdminOrganizations';
import AdminLocations from './pages/AdminLocations';
import AdminDepartments from './pages/AdminDepartments';
import AdminUsers from './pages/AdminUsers';
import AdminPermissions from './pages/AdminPermissions';
import AdminModules from './pages/AdminModules';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Analytics": Analytics,
    "Appointments": Appointments,
    "Dashboard": Dashboard,
    "MedicalRecords": MedicalRecords,
    "PatientDetails": PatientDetails,
    "Patients": Patients,
    "Settings": Settings,
    "Admin": Admin,
    "AdminOrganizations": AdminOrganizations,
    "AdminLocations": AdminLocations,
    "AdminDepartments": AdminDepartments,
    "AdminUsers": AdminUsers,
    "AdminPermissions": AdminPermissions,
    "AdminModules": AdminModules,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};