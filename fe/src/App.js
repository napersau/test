import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from './components/auth/RequireRole';
import RequireAuth from './components/auth/RequireAuth';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import HomePage from './pages/Public/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ProfilePage from './pages/Customer/ProfilePage';
import PetsPage from './pages/Customer/PetsPage';
import PetDetailPage from './pages/Customer/PetDetailPage';
import BookingPage from './pages/Customer/BookingPage';
import AppointmentsPage from './pages/Customer/AppointmentsPage';
import MedicalHistoryPage from './pages/Customer/MedicalHistoryPage';
import NotificationsPage from './pages/Customer/NotificationsPage';
import ReceptionQueuePage from './pages/Reception/QueuePage';
import ReceptionIntakePage from './pages/Reception/IntakePage';
import ReceptionAppointmentsPage from './pages/Reception/AppointmentsPage';
import ReceptionInvoicesPage from './pages/Reception/InvoicesPage';
import ReceptionInvoiceDetailPage from './pages/Reception/InvoiceDetailPage';
import ReceptionDispensePage from './pages/Reception/DispensePage';
import ReceptionCustomersPage from './pages/Reception/CustomersPage';
import ReceptionCustomerDetailPage from './pages/Reception/CustomerDetailPage';
import ReceptionPetsPage from './pages/Reception/PetsPage';
import ReceptionHistoryPage from './pages/Reception/HistoryPage';
import VetTodayPage from './pages/Veterinarian/TodayPage';
import VetVisitPage from './pages/Veterinarian/VisitPage';
import VetHistoryPage from './pages/Veterinarian/HistoryPage';
import VetMedicinesPage from './pages/Veterinarian/MedicinesPage';
import ParaclinicQueuePage from './pages/Paraclinic/QueuePage';
import ParaclinicEntryPage from './pages/Paraclinic/EntryPage';
import AdminDashboardPage from './pages/Admin/DashboardPage';
import AdminUsersPage from './pages/Admin/UsersPage';
import AdminVisitsPage from './pages/Admin/VisitsPage';
import AdminServicesPage from './pages/Admin/ServicesPage';
import AdminLabConfigPage from './pages/Admin/LabConfigPage';
import AdminSpeciesPage from './pages/Admin/SpeciesPage';
import AdminMedicinesPage from './pages/Admin/MedicinesPage';
import AdminReportsPage from './pages/Admin/ReportsPage';

const owner = (element) => <RequireRole role="PET_OWNER">{element}</RequireRole>;
const reception = (element) => <RequireRole role="RECEPTIONIST">{element}</RequireRole>;
const vet = (element) => <RequireRole role="VETERINARIAN">{element}</RequireRole>;
const lab = (element) => <RequireRole role="LAB_TECHNICIAN">{element}</RequireRole>;
const imaging = (element) => <RequireRole role="IMAGING_TECHNICIAN">{element}</RequireRole>;
const admin = (element) => <RequireRole role="ADMIN">{element}</RequireRole>;

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <NotificationProvider>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/auth/register" element={<RegisterPage />} />

            <Route path="/portal/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
            <Route path="/portal/pets" element={owner(<PetsPage />)} />
            <Route path="/portal/pets/:petId" element={owner(<PetDetailPage />)} />
            <Route path="/portal/booking" element={owner(<BookingPage />)} />
            <Route path="/portal/appointments" element={owner(<AppointmentsPage />)} />
            <Route path="/portal/medical-history" element={owner(<MedicalHistoryPage />)} />
            <Route path="/portal/notifications" element={owner(<NotificationsPage />)} />

            <Route path="/reception" element={<Navigate to="/reception/queue" replace />} />
            <Route path="/reception/queue" element={reception(<ReceptionQueuePage />)} />
            <Route path="/reception/intake" element={reception(<ReceptionIntakePage />)} />
            <Route path="/reception/appointments" element={reception(<ReceptionAppointmentsPage />)} />
            <Route path="/reception/invoices" element={reception(<ReceptionInvoicesPage />)} />
            <Route path="/reception/invoices/:invoiceId" element={reception(<ReceptionInvoiceDetailPage />)} />
            <Route path="/reception/dispense" element={reception(<ReceptionDispensePage />)} />
            <Route path="/reception/customers" element={reception(<ReceptionCustomersPage />)} />
            <Route path="/reception/customers/:customerId" element={reception(<ReceptionCustomerDetailPage />)} />
            <Route path="/reception/pets" element={reception(<ReceptionPetsPage />)} />
            <Route path="/reception/history" element={reception(<ReceptionHistoryPage />)} />

            <Route path="/vet" element={<Navigate to="/vet/today" replace />} />
            <Route path="/vet/today" element={vet(<VetTodayPage />)} />
            <Route path="/vet/visits/:visitId" element={<RequireRole role={['VETERINARIAN']}><VetVisitPage /></RequireRole>} />
            <Route path="/vet/history" element={vet(<VetHistoryPage />)} />
            <Route path="/vet/medicines" element={vet(<VetMedicinesPage />)} />

            <Route path="/lab" element={<Navigate to="/lab/queue" replace />} />
            <Route path="/lab/queue" element={lab(<ParaclinicQueuePage kind="lab" />)} />
            <Route path="/lab/entry/:detailId" element={lab(<ParaclinicEntryPage kind="lab" />)} />
            <Route path="/imaging" element={<Navigate to="/imaging/queue" replace />} />
            <Route path="/imaging/queue" element={imaging(<ParaclinicQueuePage kind="imaging" />)} />
            <Route path="/imaging/entry/:detailId" element={imaging(<ParaclinicEntryPage kind="imaging" />)} />

            <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/dashboard" element={admin(<AdminDashboardPage />)} />
            <Route path="/admin/users" element={admin(<AdminUsersPage />)} />
            <Route path="/admin/visits" element={admin(<AdminVisitsPage />)} />
            <Route path="/admin/services" element={admin(<AdminServicesPage />)} />
            <Route path="/admin/lab-config" element={admin(<AdminLabConfigPage />)} />
            <Route path="/admin/species" element={admin(<AdminSpeciesPage />)} />
            <Route path="/admin/medicines" element={admin(<AdminMedicinesPage />)} />
            <Route path="/admin/reports" element={admin(<AdminReportsPage />)} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
