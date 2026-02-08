/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AIAssistant from './pages/AIAssistant';
import AccessPending from './pages/AccessPending';
import ActivityLog from './pages/ActivityLog';
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
import AdminModuleToggles from './pages/AdminModuleToggles';
import AdminModules from './pages/AdminModules';
import AdminNumberingRules from './pages/AdminNumberingRules';
import AdminOrganizationActivity from './pages/AdminOrganizationActivity';
import AdminOrganizationBranding from './pages/AdminOrganizationBranding';
import AdminOrganizations from './pages/AdminOrganizations';
import AdminPatientPortal from './pages/AdminPatientPortal';
import AdminPermissionMatrix from './pages/AdminPermissionMatrix';
import AdminPermissions from './pages/AdminPermissions';
import AdminPostingRules from './pages/AdminPostingRules';
import AdminRetentionPolicies from './pages/AdminRetentionPolicies';
import AdminRolePermissions from './pages/AdminRolePermissions';
import AdminRoleStandards from './pages/AdminRoleStandards';
import AdminSecurityPosture from './pages/AdminSecurityPosture';
import AdminSecurityValidation from './pages/AdminSecurityValidation';
import AdminServiceCatalog from './pages/AdminServiceCatalog';
import AdminSystemHealth from './pages/AdminSystemHealth';
import AdminSystemVersion from './pages/AdminSystemVersion';
import AdminTaxRules from './pages/AdminTaxRules';
import AdminUsers from './pages/AdminUsers';
import Analytics from './pages/Analytics';
import AppAdministration from './pages/AppAdministration';
import Appointments from './pages/Appointments';
import AssignMyRoles from './pages/AssignMyRoles';
import BarcodeSetup from './pages/BarcodeSetup';
import Billing from './pages/Billing';
import BlockedUsers from './pages/BlockedUsers';
import Communications from './pages/Communications';
import CompanyHierarchy from './pages/CompanyHierarchy';
import CompanyModuleManagement from './pages/CompanyModuleManagement';
import CriticalQueue from './pages/CriticalQueue';
import DailyClose from './pages/DailyClose';
import DailyOps from './pages/DailyOps';
import Dashboard from './pages/Dashboard';
import DataExport from './pages/DataExport';
import DentalBilling from './pages/DentalBilling';
import DentalModule from './pages/DentalModule';
import DentalRecalls from './pages/DentalRecalls';
import DentalSchedule from './pages/DentalSchedule';
import DentalSterilization from './pages/DentalSterilization';
import DiagnosticsWorkspace from './pages/DiagnosticsWorkspace';
import EMR from './pages/EMR';
import FinanceCompanies from './pages/FinanceCompanies';
import FinanceDashboard from './pages/FinanceDashboard';
import FinanceLedger from './pages/FinanceLedger';
import FrontDeskWorkspace from './pages/FrontDeskWorkspace';
import GovernmentReporting from './pages/GovernmentReporting';
import HRDashboard from './pages/HRDashboard';
import Home from './pages/Home';
import HomeCareBatchManagement from './pages/HomeCareBatchManagement';
import HomeCareDashboard from './pages/HomeCareDashboard';
import HomeCareManagement from './pages/HomeCareManagement';
import HomeCarePatients from './pages/HomeCarePatients';
import HomeCareReports from './pages/HomeCareReports';
import HomeCareScheduling from './pages/HomeCareScheduling';
import HomeCareStaff from './pages/HomeCareStaff';
import LISAdmin from './pages/LISAdmin';
import LISAnalyzerInbox from './pages/LISAnalyzerInbox';
import LISDashboard from './pages/LISDashboard';
import LISOrders from './pages/LISOrders';
import LISQC from './pages/LISQC';
import LISReports from './pages/LISReports';
import LISResults from './pages/LISResults';
import LISSpecimens from './pages/LISSpecimens';
import LabWorkspace from './pages/LabWorkspace';
import LaunchChecklist from './pages/LaunchChecklist';
import ManagementReports from './pages/ManagementReports';
import MedicalRecords from './pages/MedicalRecords';
import Messaging from './pages/Messaging';
import OperationsReports from './pages/OperationsReports';
import OrdersResults from './pages/OrdersResults';
import OrganizationModulePermissions from './pages/OrganizationModulePermissions';
import OrganizationUserManagement from './pages/OrganizationUserManagement';
import OwnerWorkspace from './pages/OwnerWorkspace';
import PartnerManagement from './pages/PartnerManagement';
import PatientDetails from './pages/PatientDetails';
import PatientEditApprovals from './pages/PatientEditApprovals';
import PatientHub from './pages/PatientHub';
import PatientPortal from './pages/PatientPortal';
import Patients from './pages/Patients';
import PayrollManagement from './pages/PayrollManagement';
import PharmacyBillCardReports from './pages/PharmacyBillCardReports';
import PharmacyBilling from './pages/PharmacyBilling';
import PharmacyDashboard from './pages/PharmacyDashboard';
import PharmacyInventory from './pages/PharmacyInventory';
import PharmacyOperations from './pages/PharmacyOperations';
import PharmacyPOS from './pages/PharmacyPOS';
import PharmacyProductImport from './pages/PharmacyProductImport';
import PharmacyRequests from './pages/PharmacyRequests';
import PharmacyStockImport from './pages/PharmacyStockImport';
import PharmacyStockTaking from './pages/PharmacyStockTaking';
import PharmacyWorkQueue from './pages/PharmacyWorkQueue';
import PharmacyWorkspace from './pages/PharmacyWorkspace';
import PhysicianWorkspace from './pages/PhysicianWorkspace';
import PlatformBilling from './pages/PlatformBilling';
import PlatformConfiguration from './pages/PlatformConfiguration';
import PlatformDataExport from './pages/PlatformDataExport';
import PlatformIntegrations from './pages/PlatformIntegrations';
import PlatformOwnership from './pages/PlatformOwnership';
import PlatformSecurity from './pages/PlatformSecurity';
import PlatformSettings from './pages/PlatformSettings';
import PlatformSetup from './pages/PlatformSetup';
import PlatformSmsSettings from './pages/PlatformSmsSettings';
import Prescriptions from './pages/Prescriptions';
import PricingCatalogs from './pages/PricingCatalogs';
import Procurement from './pages/Procurement';
import ProviderDashboard from './pages/ProviderDashboard';
import ReleaseQueue from './pages/ReleaseQueue';
import Reports from './pages/Reports';
import SOAPNotes from './pages/SOAPNotes';
import SalesWorkspace from './pages/SalesWorkspace';
import SendSMS from './pages/SendSMS';
import Settings from './pages/Settings';
import ShiftHandover from './pages/ShiftHandover';
import SmsLogs from './pages/SmsLogs';
import StaffDirectory from './pages/StaffDirectory';
import TaskManagement from './pages/TaskManagement';
import ThirdPartyProviders from './pages/ThirdPartyProviders';
import TodaySalesDetails from './pages/TodaySalesDetails';
import UserApprovals from './pages/UserApprovals';
import UserManagement from './pages/UserManagement';
import VendorManagement from './pages/VendorManagement';
import VitalsTrend from './pages/VitalsTrend';
import SalesAnalytics from './pages/SalesAnalytics';
import SaleDeletionRequests from './pages/SaleDeletionRequests';
import OrgAdminAuditReport from './pages/OrgAdminAuditReport';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AIAssistant": AIAssistant,
    "AccessPending": AccessPending,
    "ActivityLog": ActivityLog,
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
    "AdminModuleToggles": AdminModuleToggles,
    "AdminModules": AdminModules,
    "AdminNumberingRules": AdminNumberingRules,
    "AdminOrganizationActivity": AdminOrganizationActivity,
    "AdminOrganizationBranding": AdminOrganizationBranding,
    "AdminOrganizations": AdminOrganizations,
    "AdminPatientPortal": AdminPatientPortal,
    "AdminPermissionMatrix": AdminPermissionMatrix,
    "AdminPermissions": AdminPermissions,
    "AdminPostingRules": AdminPostingRules,
    "AdminRetentionPolicies": AdminRetentionPolicies,
    "AdminRolePermissions": AdminRolePermissions,
    "AdminRoleStandards": AdminRoleStandards,
    "AdminSecurityPosture": AdminSecurityPosture,
    "AdminSecurityValidation": AdminSecurityValidation,
    "AdminServiceCatalog": AdminServiceCatalog,
    "AdminSystemHealth": AdminSystemHealth,
    "AdminSystemVersion": AdminSystemVersion,
    "AdminTaxRules": AdminTaxRules,
    "AdminUsers": AdminUsers,
    "Analytics": Analytics,
    "AppAdministration": AppAdministration,
    "Appointments": Appointments,
    "AssignMyRoles": AssignMyRoles,
    "BarcodeSetup": BarcodeSetup,
    "Billing": Billing,
    "BlockedUsers": BlockedUsers,
    "Communications": Communications,
    "CompanyHierarchy": CompanyHierarchy,
    "CompanyModuleManagement": CompanyModuleManagement,
    "CriticalQueue": CriticalQueue,
    "DailyClose": DailyClose,
    "DailyOps": DailyOps,
    "Dashboard": Dashboard,
    "DataExport": DataExport,
    "DentalBilling": DentalBilling,
    "DentalModule": DentalModule,
    "DentalRecalls": DentalRecalls,
    "DentalSchedule": DentalSchedule,
    "DentalSterilization": DentalSterilization,
    "DiagnosticsWorkspace": DiagnosticsWorkspace,
    "EMR": EMR,
    "FinanceCompanies": FinanceCompanies,
    "FinanceDashboard": FinanceDashboard,
    "FinanceLedger": FinanceLedger,
    "FrontDeskWorkspace": FrontDeskWorkspace,
    "GovernmentReporting": GovernmentReporting,
    "HRDashboard": HRDashboard,
    "Home": Home,
    "HomeCareBatchManagement": HomeCareBatchManagement,
    "HomeCareDashboard": HomeCareDashboard,
    "HomeCareManagement": HomeCareManagement,
    "HomeCarePatients": HomeCarePatients,
    "HomeCareReports": HomeCareReports,
    "HomeCareScheduling": HomeCareScheduling,
    "HomeCareStaff": HomeCareStaff,
    "LISAdmin": LISAdmin,
    "LISAnalyzerInbox": LISAnalyzerInbox,
    "LISDashboard": LISDashboard,
    "LISOrders": LISOrders,
    "LISQC": LISQC,
    "LISReports": LISReports,
    "LISResults": LISResults,
    "LISSpecimens": LISSpecimens,
    "LabWorkspace": LabWorkspace,
    "LaunchChecklist": LaunchChecklist,
    "ManagementReports": ManagementReports,
    "MedicalRecords": MedicalRecords,
    "Messaging": Messaging,
    "OperationsReports": OperationsReports,
    "OrdersResults": OrdersResults,
    "OrganizationModulePermissions": OrganizationModulePermissions,
    "OrganizationUserManagement": OrganizationUserManagement,
    "OwnerWorkspace": OwnerWorkspace,
    "PartnerManagement": PartnerManagement,
    "PatientDetails": PatientDetails,
    "PatientEditApprovals": PatientEditApprovals,
    "PatientHub": PatientHub,
    "PatientPortal": PatientPortal,
    "Patients": Patients,
    "PayrollManagement": PayrollManagement,
    "PharmacyBillCardReports": PharmacyBillCardReports,
    "PharmacyBilling": PharmacyBilling,
    "PharmacyDashboard": PharmacyDashboard,
    "PharmacyInventory": PharmacyInventory,
    "PharmacyOperations": PharmacyOperations,
    "PharmacyPOS": PharmacyPOS,
    "PharmacyProductImport": PharmacyProductImport,
    "PharmacyRequests": PharmacyRequests,
    "PharmacyStockImport": PharmacyStockImport,
    "PharmacyStockTaking": PharmacyStockTaking,
    "PharmacyWorkQueue": PharmacyWorkQueue,
    "PharmacyWorkspace": PharmacyWorkspace,
    "PhysicianWorkspace": PhysicianWorkspace,
    "PlatformBilling": PlatformBilling,
    "PlatformConfiguration": PlatformConfiguration,
    "PlatformDataExport": PlatformDataExport,
    "PlatformIntegrations": PlatformIntegrations,
    "PlatformOwnership": PlatformOwnership,
    "PlatformSecurity": PlatformSecurity,
    "PlatformSettings": PlatformSettings,
    "PlatformSetup": PlatformSetup,
    "PlatformSmsSettings": PlatformSmsSettings,
    "Prescriptions": Prescriptions,
    "PricingCatalogs": PricingCatalogs,
    "Procurement": Procurement,
    "ProviderDashboard": ProviderDashboard,
    "ReleaseQueue": ReleaseQueue,
    "Reports": Reports,
    "SOAPNotes": SOAPNotes,
    "SalesWorkspace": SalesWorkspace,
    "SendSMS": SendSMS,
    "Settings": Settings,
    "ShiftHandover": ShiftHandover,
    "SmsLogs": SmsLogs,
    "StaffDirectory": StaffDirectory,
    "TaskManagement": TaskManagement,
    "ThirdPartyProviders": ThirdPartyProviders,
    "TodaySalesDetails": TodaySalesDetails,
    "UserApprovals": UserApprovals,
    "UserManagement": UserManagement,
    "VendorManagement": VendorManagement,
    "VitalsTrend": VitalsTrend,
    "SalesAnalytics": SalesAnalytics,
    "SaleDeletionRequests": SaleDeletionRequests,
    "OrgAdminAuditReport": OrgAdminAuditReport,
}

export const pagesConfig = {
    mainPage: "Admin",
    Pages: PAGES,
    Layout: __Layout,
};