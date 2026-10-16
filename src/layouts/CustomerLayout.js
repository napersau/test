import Footer from '../components/layout/Footer';
import Header from '../components/layout/Header';
import CustomerNavigation from '../components/customer/CustomerNavigation';
import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { refreshCustomerReminders } from '../features/notifications/notificationWriter';
import { MEDICAL_RECORDS_CHANGED } from '../features/appointments/appointmentPolicy';
import { VACCINATIONS_CHANGED } from '../features/vaccinations/vaccinationPolicy';
import '../styles/home.css';
import '../styles/customer.css';

export default function CustomerLayout({ children }) {
  const { user } = useAuth();
  useEffect(() => {
    if (user?.role !== 'CUSTOMER') return undefined;
    const refresh = () => refreshCustomerReminders(user.id);
    refresh(); const timer = window.setInterval(refresh, 60000);
    const events = [MEDICAL_RECORDS_CHANGED, VACCINATIONS_CHANGED, 'storage'];
    events.forEach((name) => window.addEventListener(name, refresh)); document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); events.forEach((name) => window.removeEventListener(name, refresh)); document.removeEventListener('visibilitychange', refresh); };
  }, [user?.id, user?.role, user?.receiveAppointmentReminders]);
  return (
    <div className="customer-shell">
      <Header />
      <CustomerNavigation />
      {children}
      <Footer />
    </div>
  );
}
