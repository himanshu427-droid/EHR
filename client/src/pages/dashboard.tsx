import { useAuth } from '@/lib/auth';
import { UserRole } from '@shared/schema';
import PatientDashboard from './patient-dashboard';
import DoctorDashboard from './doctor-dashboard';
import LabDashboard from './lab-dashboard';
import AdminDashboard from './admin-dashboard';
import InsuranceDashboard from './insurance-dashboard';
import ResearcherDashboard from './researcher-dashboard';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  switch (user.role) {
    case UserRole.PATIENT:
      return <PatientDashboard />;
    case UserRole.DOCTOR:
      return <DoctorDashboard />;
    case UserRole.LAB:
      return <LabDashboard />;
    case UserRole.HOSPITAL_ADMIN:
      return <AdminDashboard />;
    case UserRole.INSURANCE:
      return <InsuranceDashboard />;
    case UserRole.RESEARCHER:
      return <ResearcherDashboard />;
    default:
      return <PatientDashboard />;
  }
}
