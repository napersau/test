import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import RequireRole from './components/auth/RequireRole';
import RequireAuth from './components/auth/RequireAuth';
import { AuthProvider } from './contexts/AuthContext';
import HomePage from './pages/Public/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ProfilePage from './pages/Customer/ProfilePage';
import PetsPage from './pages/Customer/PetsPage';
import PetDetailPage from './pages/Customer/PetDetailPage';
import BookingPage from './pages/Customer/BookingPage';
import AppointmentsPage from './pages/Customer/AppointmentsPage';
import MedicalHistoryPage from './pages/Customer/MedicalHistoryPage';
import MedicalRecordPage from './pages/Customer/MedicalRecordPage';
import CustomerRecordsPage from './pages/Customer/CustomerRecordsPage';
import CustomerRecordDetailPage from './pages/Customer/CustomerRecordDetailPage';
import DashboardPage from './pages/Admin/DashboardPage';
import UsersPage from './pages/Admin/UsersPage';
import ServicesPage from './pages/Admin/ServicesPage';
import MedicinesPage from './pages/Admin/MedicinesPage';
import ActivityPage from './pages/Admin/ActivityPage';
import ReportsPage from './pages/Admin/ReportsPage';
import ReceptionCustomersPage from './pages/Reception/CustomersPage';
import ReceptionCustomerDetailPage from './pages/Reception/CustomerDetailPage';
import ReceptionPetsPage from './pages/Reception/PetsPage';
import ReceptionPetDetailPage from './pages/Reception/PetDetailPage';
import QueuePage from './pages/Reception/QueuePage';
import IntakePage from './pages/Reception/IntakePage';
import ReceptionAppointmentsPage from './pages/Reception/AppointmentsPage';
import ReceptionInvoicesPage from './pages/Reception/InvoicesPage';
import ReceptionInvoiceDetailPage from './pages/Reception/InvoiceDetailPage';
import DispensePage from './pages/Reception/DispensePage';
import VetTodayPage from './pages/Veterinarian/TodayPage';
import VetCallbackPage from './pages/Veterinarian/CallbackPage';
import RoomQueuePage from './pages/Veterinarian/RoomQueuePage';
import RoomEntryPage from './pages/Veterinarian/RoomEntryPage';
import VetAppointmentsPage from './pages/Veterinarian/AppointmentsPage';
import ExaminationPage from './pages/Veterinarian/ExaminationPage';
import VetRecordsPage from './pages/Veterinarian/RecordsPage';
import VetDiagnosesPage from './pages/Veterinarian/DiagnosesPage';
import ClinicalPlanPage from './pages/Veterinarian/ClinicalPlanPage';
import VetHealthHistoryPage from './pages/Veterinarian/HealthHistoryPage';
import NotificationsPage from './pages/Customer/NotificationsPage';
import StaffPage from './pages/Admin/StaffPage';
import LabConfigPage from './pages/Admin/LabConfigPage';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/portal/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
          <Route path="/portal/pets" element={<RequireRole role="CUSTOMER"><PetsPage /></RequireRole>} />
          <Route path="/portal/pets/:petId" element={<RequireRole role="CUSTOMER"><PetDetailPage /></RequireRole>} />
          <Route path="/portal/booking" element={<RequireRole role="CUSTOMER"><BookingPage /></RequireRole>} />
          <Route path="/portal/appointments" element={<RequireRole role="CUSTOMER"><AppointmentsPage /></RequireRole>} />
          <Route path="/portal/notifications" element={<RequireRole role="CUSTOMER"><NotificationsPage /></RequireRole>} />
          <Route path="/portal/medical-history" element={<RequireRole role="CUSTOMER"><MedicalHistoryPage /></RequireRole>} />
          <Route path="/portal/medical-history/:recordId" element={<RequireRole role="CUSTOMER"><MedicalRecordPage /></RequireRole>} />
          {['vaccinations', 'prescriptions', 'invoices'].map((kind) => <Route key={kind} path={`/portal/${kind}`} element={<RequireRole role="CUSTOMER"><CustomerRecordsPage key={kind} kind={kind} /></RequireRole>} />)}
          {['vaccinations', 'prescriptions', 'invoices'].map((kind) => <Route key={`${kind}-detail`} path={`/portal/${kind}/:recordId`} element={<RequireRole role="CUSTOMER"><CustomerRecordDetailPage key={kind} kind={kind} /></RequireRole>} />)}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/vet" element={<Navigate to="/vet/today" replace />} />
          <Route path="/vet/today" element={<RequireRole role="VETERINARIAN"><VetTodayPage /></RequireRole>} />
          <Route path="/vet/callback" element={<RequireRole role="VETERINARIAN"><VetCallbackPage /></RequireRole>} />
          <Route path="/vet/lab" element={<RequireRole role="VETERINARIAN"><RoomQueuePage room="LABORATORY" /></RequireRole>} />
          <Route path="/vet/lab/:key" element={<RequireRole role="VETERINARIAN"><RoomEntryPage room="LABORATORY" /></RequireRole>} />
          <Route path="/vet/imaging" element={<RequireRole role="VETERINARIAN"><RoomQueuePage room="IMAGING" /></RequireRole>} />
          <Route path="/vet/imaging/:key" element={<RequireRole role="VETERINARIAN"><RoomEntryPage room="IMAGING" /></RequireRole>} />
          <Route path="/vet/health-history" element={<RequireRole role="VETERINARIAN"><VetHealthHistoryPage /></RequireRole>} />
          <Route path="/vet/health-history/:petId" element={<RequireRole role="VETERINARIAN"><VetHealthHistoryPage /></RequireRole>} />
          <Route path="/vet/appointments" element={<RequireRole role="VETERINARIAN"><VetAppointmentsPage /></RequireRole>} />
          <Route path="/vet/records" element={<RequireRole role="VETERINARIAN"><VetRecordsPage /></RequireRole>} />
          <Route path="/vet/diagnoses" element={<RequireRole role="VETERINARIAN"><VetDiagnosesPage /></RequireRole>} />
          <Route path="/vet/prescriptions" element={<RequireRole role="VETERINARIAN"><ClinicalPlanPage kind="prescriptions" /></RequireRole>} />
          <Route path="/vet/prescriptions/:appointmentId" element={<RequireRole role="VETERINARIAN"><ClinicalPlanPage kind="prescriptions" /></RequireRole>} />
          <Route path="/vet/service-orders" element={<RequireRole role="VETERINARIAN"><ClinicalPlanPage kind="services" /></RequireRole>} />
          <Route path="/vet/service-orders/:appointmentId" element={<RequireRole role="VETERINARIAN"><ClinicalPlanPage kind="services" /></RequireRole>} />
          <Route path="/vet/records/:appointmentId" element={<RequireRole role="VETERINARIAN"><ExaminationPage mode="records" /></RequireRole>} />
          <Route path="/vet/diagnoses/:appointmentId" element={<RequireRole role="VETERINARIAN"><ExaminationPage mode="diagnoses" /></RequireRole>} />
          <Route path="/vet/examinations/:appointmentId" element={<RequireRole role="VETERINARIAN"><ExaminationPage /></RequireRole>} />
          <Route path="/reception" element={<Navigate to="/reception/queue" replace />} />
          <Route path="/reception/queue" element={<RequireRole role="RECEPTIONIST"><QueuePage /></RequireRole>} />
          <Route path="/reception/intake" element={<RequireRole role="RECEPTIONIST"><IntakePage /></RequireRole>} />
          <Route path="/reception/appointments" element={<RequireRole role="RECEPTIONIST"><ReceptionAppointmentsPage /></RequireRole>} />
          <Route path="/reception/invoices" element={<RequireRole role="RECEPTIONIST"><ReceptionInvoicesPage /></RequireRole>} />
          <Route path="/reception/invoices/:invoiceId" element={<RequireRole role="RECEPTIONIST"><ReceptionInvoiceDetailPage /></RequireRole>} />
          <Route path="/reception/dispense" element={<RequireRole role="RECEPTIONIST"><DispensePage /></RequireRole>} />
          <Route path="/reception/customers" element={<RequireRole role="RECEPTIONIST"><ReceptionCustomersPage /></RequireRole>} />
          <Route path="/reception/customers/:customerId" element={<RequireRole role="RECEPTIONIST"><ReceptionCustomerDetailPage /></RequireRole>} />
          <Route path="/reception/pets" element={<RequireRole role="RECEPTIONIST"><ReceptionPetsPage /></RequireRole>} />
          <Route path="/reception/pets/:petId" element={<RequireRole role="RECEPTIONIST"><ReceptionPetDetailPage /></RequireRole>} />
          <Route path="/admin/dashboard" element={<RequireRole role="ADMIN"><DashboardPage /></RequireRole>} />
          <Route path="/admin/users" element={<RequireRole role="ADMIN"><UsersPage /></RequireRole>} />
          <Route path="/admin/staff" element={<RequireRole role="ADMIN"><StaffPage /></RequireRole>} />
          <Route path="/admin/services" element={<RequireRole role="ADMIN"><ServicesPage /></RequireRole>} />
          <Route path="/admin/lab-config" element={<RequireRole role="ADMIN"><LabConfigPage /></RequireRole>} />
          <Route path="/admin/medicines" element={<RequireRole role="ADMIN"><MedicinesPage /></RequireRole>} />
          <Route path="/admin/activity" element={<RequireRole role="ADMIN"><ActivityPage /></RequireRole>} />
          <Route path="/admin/reports" element={<RequireRole role="ADMIN"><ReportsPage /></RequireRole>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
