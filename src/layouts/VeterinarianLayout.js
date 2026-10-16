import StaffLayout from './StaffLayout';
import VetStatusBar from '../components/veterinarian/VetStatusBar';
export default function VeterinarianLayout({ children, ...props }) { return <StaffLayout {...props} area="vet"><VetStatusBar />{children}</StaffLayout>; }
