import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import PatientDetails from './pages/PatientDetails';
import Appointments from './pages/Appointments';
import MedicalRecords from './pages/MedicalRecords';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Patients": Patients,
    "PatientDetails": PatientDetails,
    "Appointments": Appointments,
    "MedicalRecords": MedicalRecords,
    "Analytics": Analytics,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};