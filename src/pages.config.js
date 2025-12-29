import Admin from './pages/Admin';
import AdminArchive from './pages/AdminArchive';
import AdminAuditLogs from './pages/AdminAuditLogs';
import AdminBackups from './pages/AdminBackups';
import AdminBreakGlassReport from './pages/AdminBreakGlassReport';
import AdminChartOfAccounts from './pages/AdminChartOfAccounts';
import AdminComplianceChecklist from './pages/AdminComplianceChecklist';
import AdminConfig from './pages/AdminConfig';
import AdminDepartments from './pages/AdminDepartments';
import AdminExportApprovals from './pages/AdminExportApprovals';
import AdminGoLiveChecklist from './pages/AdminGoLiveChecklist';
import AdminLocations from './pages/AdminLocations';
import AdminModules from './pages/AdminModules';
import AdminNumberingRules from './pages/AdminNumberingRules';
import AdminOrganizations from './pages/AdminOrganizations';
import AdminPatientPortal from './pages/AdminPatientPortal';
import AdminPermissionMatrix from './pages/AdminPermissionMatrix';
import AdminPermissions from './pages/AdminPermissions';
import AdminPostingRules from './pages/AdminPostingRules';
import AdminRetentionPolicies from './pages/AdminRetentionPolicies';
import AdminSecurityPosture from './pages/AdminSecurityPosture';
import AdminServiceCatalog from './pages/AdminServiceCatalog';
import AdminSystemHealth from './pages/AdminSystemHealth';
import AdminSystemVersion from './pages/AdminSystemVersion';
import AdminTaxRules from './pages/AdminTaxRules';
import AdminUsers from './pages/AdminUsers';
import Analytics from './pages/Analytics';
import Appointments from './pages/Appointments';
import Billing from './pages/Billing';
import Communications from './pages/Communications';
import CriticalQueue from './pages/CriticalQueue';
import DailyOps from './pages/DailyOps';
import Dashboard from './pages/Dashboard';
import DataExport from './pages/DataExport';
import EMR from './pages/EMR';
import FinanceCompanies from './pages/FinanceCompanies';
import FinanceDashboard from './pages/FinanceDashboard';
import GovernmentReporting from './pages/GovernmentReporting';
import ManagementReports from './pages/ManagementReports';
import MedicalRecords from './pages/MedicalRecords';
import Messaging from './pages/Messaging';
import OrdersResults from './pages/OrdersResults';
import PartnerManagement from './pages/PartnerManagement';
import PatientDetails from './pages/PatientDetails';
import PatientPortal from './pages/PatientPortal';
import Patients from './pages/Patients';
import PharmacyDashboard from './pages/PharmacyDashboard';
import PharmacyInventory from './pages/PharmacyInventory';
import PharmacyPOS from './pages/PharmacyPOS';
import Prescriptions from './pages/Prescriptions';
import Procurement from './pages/Procurement';
import ReleaseQueue from './pages/ReleaseQueue';
import Reports from './pages/Reports';
import SOAPNotes from './pages/SOAPNotes';
import Settings from './pages/Settings';
import TaskManagement from './pages/TaskManagement';
import AdminSecurityValidation from './pages/AdminSecurityValidation';
import PlatformSettings from './pages/PlatformSettings';
import AppAdministration from './pages/AppAdministration';
import PlatformConfiguration from './pages/PlatformConfiguration';
import AdminRoleStandards from './pages/AdminRoleStandards';
import OrganizationUserManagement from './pages/OrganizationUserManagement';
import AdminRolePermissions from './pages/AdminRolePermissions';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Admin": Admin,
    "AdminArchive": AdminArchive,
    "AdminAuditLogs": AdminAuditLogs,
    "AdminBackups": AdminBackups,
    "AdminBreakGlassReport": AdminBreakGlassReport,
    "AdminChartOfAccounts": AdminChartOfAccounts,
    "AdminComplianceChecklist": AdminComplianceChecklist,
    "AdminConfig": AdminConfig,
    "AdminDepartments": AdminDepartments,
    "AdminExportApprovals": AdminExportApprovals,
    "AdminGoLiveChecklist": AdminGoLiveChecklist,
    "AdminLocations": AdminLocations,
    "AdminModules": AdminModules,
    "AdminNumberingRules": AdminNumberingRules,
    "AdminOrganizations": AdminOrganizations,
    "AdminPatientPortal": AdminPatientPortal,
    "AdminPermissionMatrix": AdminPermissionMatrix,
    "AdminPermissions": AdminPermissions,
    "AdminPostingRules": AdminPostingRules,
    "AdminRetentionPolicies": AdminRetentionPolicies,
    "AdminSecurityPosture": AdminSecurityPosture,
    "AdminServiceCatalog": AdminServiceCatalog,
    "AdminSystemHealth": AdminSystemHealth,
    "AdminSystemVersion": AdminSystemVersion,
    "AdminTaxRules": AdminTaxRules,
    "AdminUsers": AdminUsers,
    "Analytics": Analytics,
    "Appointments": Appointments,
    "Billing": Billing,
    "Communications": Communications,
    "CriticalQueue": CriticalQueue,
    "DailyOps": DailyOps,
    "Dashboard": Dashboard,
    "DataExport": DataExport,
    "EMR": EMR,
    "FinanceCompanies": FinanceCompanies,
    "FinanceDashboard": FinanceDashboard,
    "GovernmentReporting": GovernmentReporting,
    "ManagementReports": ManagementReports,
    "MedicalRecords": MedicalRecords,
    "Messaging": Messaging,
    "OrdersResults": OrdersResults,
    "PartnerManagement": PartnerManagement,
    "PatientDetails": PatientDetails,
    "PatientPortal": PatientPortal,
    "Patients": Patients,
    "PharmacyDashboard": PharmacyDashboard,
    "PharmacyInventory": PharmacyInventory,
    "PharmacyPOS": PharmacyPOS,
    "Prescriptions": Prescriptions,
    "Procurement": Procurement,
    "ReleaseQueue": ReleaseQueue,
    "Reports": Reports,
    "SOAPNotes": SOAPNotes,
    "Settings": Settings,
    "TaskManagement": TaskManagement,
    "AdminSecurityValidation": AdminSecurityValidation,
    "PlatformSettings": PlatformSettings,
    "AppAdministration": AppAdministration,
    "PlatformConfiguration": PlatformConfiguration,
    "AdminRoleStandards": AdminRoleStandards,
    "OrganizationUserManagement": OrganizationUserManagement,
    "AdminRolePermissions": AdminRolePermissions,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};