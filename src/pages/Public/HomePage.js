import Header from '../../components/layout/Header';
import Footer from '../../components/layout/Footer';
import HeroSection from '../../components/home/HeroSection';
import ServicesSection from '../../components/home/ServicesSection';
import PetGallerySection from '../../components/home/PetGallerySection';
import PricingSection from '../../components/home/PricingSection';
import TestimonialsSection from '../../components/home/TestimonialsSection';
import BookingSection from '../../components/home/BookingSection';
import '../../styles/home.css';

export default function HomePage() {
  return (
    <div className="petcare-home">
      <Header />
      <main id="top">
        <HeroSection />
        <ServicesSection />
        <PetGallerySection />
        <PricingSection />
        <TestimonialsSection />
        <BookingSection />
      </main>
      <Footer />
    </div>
  );
}
