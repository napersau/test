import Footer from '../components/layout/Footer';
import Header from '../components/layout/Header';
import CustomerNavigation from '../components/customer/CustomerNavigation';
import '../styles/home.css';
import '../styles/customer.css';
import '../styles/ui.css';

export default function CustomerLayout({ children }) {
  return (
    <div className="customer-shell">
      <Header />
      <CustomerNavigation />
      <main className="ui-portal"><div className="profile-container">{children}</div></main>
      <Footer />
    </div>
  );
}
