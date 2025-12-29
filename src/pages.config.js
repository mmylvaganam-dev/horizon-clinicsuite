import Admin from './pages/Admin';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminConfig from './pages/AdminConfig';
import AdminDepartments from './pages/AdminDepartments';
import AdminLocations from './pages/AdminLocations';
import AdminModules from './pages/AdminModules';
import AdminOrganizations from './pages/AdminOrganizations';
import AdminPermissions from './pages/AdminPermissions';
import AdminSystemHealth from './pages/AdminSystemHealth';
import AdminUsers from './pages/AdminUsers';
import Analytics from './pages/Analytics';
import Appointments from './pages/Appointments';
import Dashboard from './pages/Dashboard';
import MedicalRecords from './pages/MedicalRecords';
import OrdersResults from './pages/OrdersResults';
import PatientDetails from './pages/PatientDetails';
import Patients from './pages/Patients';
import Settings from './pages/Settings';
import PharmacyPOS from './pages/PharmacyPOS';
import PharmacyInventory from './pages/PharmacyInventory';
import Procurement from './pages/Procurement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "AdminAuditLogs": AdminAuditLogs,
    "AdminConfig": AdminConfig,
    "AdminDepartments": AdminDepartments,
    "AdminLocations": AdminLocations,
    "AdminModules": AdminModules,
    "AdminOrganizations": AdminOrganizations,
    "AdminPermissions": AdminPermissions,
    "AdminSystemHealth": AdminSystemHealth,
    "AdminUsers": AdminUsers,
    "Analytics": Analytics,
    "Appointments": Appointments,
    "Dashboard": Dashboard,
    "MedicalRecords": MedicalRecords,
    "OrdersResults": OrdersResults,
    "PatientDetails": PatientDetails,
    "Patients": Patients,
    "Settings": Settings,
    "PharmacyPOS": PharmacyPOS,
    "PharmacyInventory": PharmacyInventory,
    "Procurement": Procurement,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};