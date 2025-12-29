import Admin from './pages/Admin';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminChartOfAccounts from './pages/AdminChartOfAccounts';
import AdminConfig from './pages/AdminConfig';
import AdminDepartments from './pages/AdminDepartments';
import AdminLocations from './pages/AdminLocations';
import AdminModules from './pages/AdminModules';
import AdminNumberingRules from './pages/AdminNumberingRules';
import AdminOrganizations from './pages/AdminOrganizations';
import AdminPatientPortal from './pages/AdminPatientPortal';
import AdminPermissions from './pages/AdminPermissions';
import AdminPostingRules from './pages/AdminPostingRules';
import AdminServiceCatalog from './pages/AdminServiceCatalog';
import AdminSystemHealth from './pages/AdminSystemHealth';
import AdminTaxRules from './pages/AdminTaxRules';
import AdminUsers from './pages/AdminUsers';
import Analytics from './pages/Analytics';
import Appointments from './pages/Appointments';
import Billing from './pages/Billing';
import Communications from './pages/Communications';
import Dashboard from './pages/Dashboard';
import GovernmentReporting from './pages/GovernmentReporting';
import MedicalRecords from './pages/MedicalRecords';
import Messaging from './pages/Messaging';
import OrdersResults from './pages/OrdersResults';
import PartnerManagement from './pages/PartnerManagement';
import PatientDetails from './pages/PatientDetails';
import PatientPortal from './pages/PatientPortal';
import Patients from './pages/Patients';
import PharmacyInventory from './pages/PharmacyInventory';
import PharmacyPOS from './pages/PharmacyPOS';
import Procurement from './pages/Procurement';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import AdminPermissionMatrix from './pages/AdminPermissionMatrix';
import AdminBreakGlassReport from './pages/AdminBreakGlassReport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "AdminAuditLogs": AdminAuditLogs,
    "AdminChartOfAccounts": AdminChartOfAccounts,
    "AdminConfig": AdminConfig,
    "AdminDepartments": AdminDepartments,
    "AdminLocations": AdminLocations,
    "AdminModules": AdminModules,
    "AdminNumberingRules": AdminNumberingRules,
    "AdminOrganizations": AdminOrganizations,
    "AdminPatientPortal": AdminPatientPortal,
    "AdminPermissions": AdminPermissions,
    "AdminPostingRules": AdminPostingRules,
    "AdminServiceCatalog": AdminServiceCatalog,
    "AdminSystemHealth": AdminSystemHealth,
    "AdminTaxRules": AdminTaxRules,
    "AdminUsers": AdminUsers,
    "Analytics": Analytics,
    "Appointments": Appointments,
    "Billing": Billing,
    "Communications": Communications,
    "Dashboard": Dashboard,
    "GovernmentReporting": GovernmentReporting,
    "MedicalRecords": MedicalRecords,
    "Messaging": Messaging,
    "OrdersResults": OrdersResults,
    "PartnerManagement": PartnerManagement,
    "PatientDetails": PatientDetails,
    "PatientPortal": PatientPortal,
    "Patients": Patients,
    "PharmacyInventory": PharmacyInventory,
    "PharmacyPOS": PharmacyPOS,
    "Procurement": Procurement,
    "Reports": Reports,
    "Settings": Settings,
    "AdminPermissionMatrix": AdminPermissionMatrix,
    "AdminBreakGlassReport": AdminBreakGlassReport,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};