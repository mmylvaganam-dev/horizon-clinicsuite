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
import StockMonitoring from './pages/StockMonitoring';
import InstitutionManagement from './pages/InstitutionManagement';
import LandingPage from './pages/LandingPage';
import PatientAccessRequests from './pages/PatientAccessRequests';
import HomeCareInvoiceManager from './pages/HomeCareInvoiceManager';
import AppointmentScheduler from './pages/AppointmentScheduler';
import PatientSelfPortal from './pages/PatientSelfPortal';
import LabReportView from './pages/LabReportView';
import FindLabReport from './pages/FindLabReport';
import ConsultationTranscriber from './pages/ConsultationTranscriber';
import PrescriptionManager from './pages/PrescriptionManager';
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
      <Route path="/AppointmentScheduler" element={<LayoutWrapper currentPageName="AppointmentScheduler"><AppointmentScheduler /></LayoutWrapper>} />
      <Route path="/patient-portal" element={<PatientSelfPortal />} />
      <Route path="/lab-report-view" element={<LabReportView />} />
      <Route path="/find-lab-report" element={<FindLabReport />} />
      <Route path="/ConsultationTranscriber" element={<LayoutWrapper currentPageName="ConsultationTranscriber"><ConsultationTranscriber /></LayoutWrapper>} />
      <Route path="/PrescriptionManager" element={<LayoutWrapper currentPageName="PrescriptionManager"><PrescriptionManager /></LayoutWrapper>} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <NavigationTracker />
          <Routes>
            <Route path="/landing" element={<LandingPage />} />
            <Route path="*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App