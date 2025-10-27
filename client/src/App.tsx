import { Switch, Route, Redirect } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AuthProvider, useAuth } from '@/lib/auth';
import NotFound from '@/pages/not-found';
import Login from '@/pages/login';
import Register from '@/pages/register';
import Dashboard from '@/pages/dashboard';
import Records from '@/pages/records';
import Consent from '@/pages/consent';
import Blockchain from '@/pages/blockchain';
import PatientsPage from './pages/patients';
import PatientRecordsPage from './pages/patient-records';
import CreateRecordPage from './pages/create-record';
import DoctorRecordsPage from './pages/doctor-records';
import HomePage from './pages/home';

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <Component />;
}

function PublicRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return <Component />;
}


function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <PublicRoute component={HomePage} />} />
      <Route path="/login" component={() => <PublicRoute component={Login} />} />
      <Route path="/register" component={() => <PublicRoute component={Register} />} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={Dashboard} />} />
      <Route path="/my-records" component={() => <ProtectedRoute component={Records} />} />
      <Route path ="/records" component={()=>< ProtectedRoute component={DoctorRecordsPage}/>} />
      <Route path="/consent" component={() => <ProtectedRoute component={Consent} />} />
      <Route path="/blockchain" component={() => <ProtectedRoute component={Blockchain} />} />
      <Route path="/patients" component={()=>< ProtectedRoute component={PatientsPage}/>} />
      <Route path="/patient/:patientId/records" component={()=><ProtectedRoute component={PatientRecordsPage}/>} />
      <Route path="/records/create" component={()=>< ProtectedRoute component={CreateRecordPage}/>} />
      <Route path="/" component={() => <Redirect to="/dashboard" />} />
  
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}
