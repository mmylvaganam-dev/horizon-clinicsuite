import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import PatientInvoiceManager from './pages/PatientInvoiceManager';
import PatientHealthOverview from './pages/PatientHealthOverview';
import CreditCustomerManagement from './pages/CreditCustomerManagement';
import CreditBuyerPortal from './pages/CreditBuyerPortal';
import StockMonitoring from './pages/StockMonitoring';
import InstitutionManagement from './pages/InstitutionManagement';
import LandingPage from './pages/LandingPage';
import PatientAccessRequests from './pages/PatientAccessRequests';
import HomeCareInvoiceManager from './pages/HomeCareInvoiceManager';
import HomeCareWorkers from './pages/HomeCareWorkers';
import AppointmentScheduler from './pages/AppointmentScheduler';
import TelePaymentGateways from './pages/TelePaymentGateways';
import TeleProviderSchedule from './pages/TeleProviderSchedule';
import HomeCareCaretakerReport from './pages/HomeCareCaretakerReport';
import HomeCareFamilyReport from './pages/HomeCareFamilyReport';
import HomeCareSupervisorReport from './pages/HomeCareSupervisorReport';
import PatientSelfPortal from './pages/PatientSelfPortal';
import LabReportView from './pages/LabReportView';
import FindLabReport from './pages/FindLabReport';
import InstitutionPortal from './pages/InstitutionPortal';
import InstitutionOrderHistory from './pages/InstitutionOrderHistory';
import InstitutionPaymentPortal from './pages/InstitutionPaymentPortal';
import PharmacyOrderRequests from './pages/PharmacyOrderRequests';
import CreditUsageDashboard from './pages/CreditUsageDashboard';
import ConsultationTranscriber from './pages/ConsultationTranscriber';
import DriverDeliveryApp from './pages/DriverDeliveryApp';
import PrescriptionManager from './pages/PrescriptionManager';
import PrescriptionPrint from './pages/PrescriptionPrint';
import UnifiedUserManagement from './pages/UnifiedUserManagement';
import OperatorManual from './pages/OperatorManual';
import FirebaseTest from './pages/FirebaseTest';
import FirebaseAuthTest from './pages/FirebaseAuthTest';
import BackendTest from './pages/BackendTest';
import FirebaseSessionTest from './pages/FirebaseSessionTest';
import AppDashboardTest from './pages/AppDashboardTest';
import ProfileTest from './pages/ProfileTest';
import AppHomeTest from './pages/AppHomeTest';
import FileUploadTest from './pages/FileUploadTest';
import AdminOrgTest from './pages/AdminOrgTest';
import RbacTest from './pages/RbacTest';
import DocumentsTest from './pages/DocumentsTest';
import { FirebaseSessionProvider } from '@/context/FirebaseSessionContext';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="/PatientInvoiceManager" element={<LayoutWrapper currentPageName="PatientInvoiceManager"><PatientInvoiceManager /></LayoutWrapper>} />
      <Route path="/PatientHealthOverview" element={<LayoutWrapper currentPageName="PatientHealthOverview"><PatientHealthOverview /></LayoutWrapper>} />
      <Route path="/CreditCustomerManagement" element={<LayoutWrapper currentPageName="CreditCustomerManagement"><CreditCustomerManagement /></LayoutWrapper>} />
      <Route path="/StockMonitoring" element={<LayoutWrapper currentPageName="StockMonitoring"><StockMonitoring /></LayoutWrapper>} />
      <Route path="/InstitutionManagement" element={<LayoutWrapper currentPageName="InstitutionManagement"><InstitutionManagement /></LayoutWrapper>} />
      <Route path="/PatientAccessRequests" element={<LayoutWrapper currentPageName="PatientAccessRequests"><PatientAccessRequests /></LayoutWrapper>} />
      <Route path="/HomeCareInvoiceManager" element={<LayoutWrapper currentPageName="HomeCareInvoiceManager"><HomeCareInvoiceManager /></LayoutWrapper>} />
      <Route path="/HomeCareWorkers" element={<LayoutWrapper currentPageName="HomeCareWorkers"><HomeCareWorkers /></LayoutWrapper>} />
      <Route path="/AppointmentScheduler" element={<LayoutWrapper currentPageName="AppointmentScheduler"><AppointmentScheduler /></LayoutWrapper>} />
      <Route path="/patient-portal" element={<PatientSelfPortal />} />
      <Route path="/institution-portal" element={<InstitutionPortal />} />
      <Route path="/institution-order-history" element={<InstitutionOrderHistory />} />
      <Route path="/institution-payment-portal" element={<InstitutionPaymentPortal />} />
      <Route path="/pharmacy-order-requests" element={<LayoutWrapper currentPageName="PharmacyOrderRequests"><PharmacyOrderRequests /></LayoutWrapper>} />
      <Route path="/credit-usage-dashboard" element={<LayoutWrapper currentPageName="CreditUsageDashboard"><CreditUsageDashboard /></LayoutWrapper>} />
      <Route path="/lab-report-view" element={<LabReportView />} />
      <Route path="/find-lab-report" element={<FindLabReport />} />
      <Route path="/ConsultationTranscriber" element={<LayoutWrapper currentPageName="ConsultationTranscriber"><ConsultationTranscriber /></LayoutWrapper>} />
      <Route path="/PrescriptionManager" element={<LayoutWrapper currentPageName="PrescriptionManager"><PrescriptionManager /></LayoutWrapper>} />
      <Route path="/PrescriptionPrint" element={<PrescriptionPrint />} />
      <Route path="/driver" element={<DriverDeliveryApp />} />
      <Route path="/credit-buyer-portal" element={<CreditBuyerPortal />} />
      <Route path="/TelePaymentGateways" element={<LayoutWrapper currentPageName="TelePaymentGateways"><TelePaymentGateways /></LayoutWrapper>} />
      <Route path="/TeleProviderSchedule" element={<LayoutWrapper currentPageName="TeleProviderSchedule"><TeleProviderSchedule /></LayoutWrapper>} />
      <Route path="/HomeCareCaretakerReport" element={<LayoutWrapper currentPageName="HomeCareCaretakerReport"><HomeCareCaretakerReport /></LayoutWrapper>} />
      <Route path="/HomeCareFamilyReport" element={<LayoutWrapper currentPageName="HomeCareFamilyReport"><HomeCareFamilyReport /></LayoutWrapper>} />
      <Route path="/HomeCareSupervisorReport" element={<LayoutWrapper currentPageName="HomeCareSupervisorReport"><HomeCareSupervisorReport /></LayoutWrapper>} />
      <Route path="/UnifiedUserManagement" element={<LayoutWrapper currentPageName="UnifiedUserManagement"><UnifiedUserManagement /></LayoutWrapper>} />
      <Route path="/OperatorManual" element={<LayoutWrapper currentPageName="OperatorManual"><OperatorManual /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <FirebaseSessionProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <Routes>
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/firebase-test" element={<FirebaseTest />} />
              <Route path="/firebase-auth-test" element={<FirebaseAuthTest />} />
              <Route path="/firebase-session-test" element={<FirebaseSessionTest />} />
              <Route path="/app-dashboard-test" element={<AppDashboardTest />} />
              <Route path="/app-home-test" element={<AppHomeTest />} />
              <Route path="/file-upload-test" element={<FileUploadTest />} />
              <Route path="/admin-org-test" element={<AdminOrgTest />} />
              <Route path="/rbac-test" element={<RbacTest />} />
              <Route path="/documents-test" element={<DocumentsTest />} />
              <Route path="/profile-test" element={<ProfileTest />} />
              <Route path="/backend-test" element={<BackendTest />} />
              <Route path="*" element={<AuthenticatedApp />} />
            </Routes>
          </Router>
          <Toaster />
        </QueryClientProvider>
      </FirebaseSessionProvider>
    </AuthProvider>
  )
}

export default App
