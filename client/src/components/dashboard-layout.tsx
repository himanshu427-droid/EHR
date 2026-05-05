import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Home,
  FileText,
  Users,
  Activity,
  ShieldCheck,
  LogOut,
  FileStack,
  ClipboardList,
  Building2,
  User,
} from 'lucide-react';
import { UserRole } from '@shared/schema';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    setLocation('/login');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      patient: 'bg-role-patient',
      doctor: 'bg-role-doctor',
      lab: 'bg-role-lab',
      hospital_admin: 'bg-role-admin',
      insurance: 'bg-role-insurance',
      researcher: 'bg-role-researcher',
    };
    return colors[role] || 'bg-primary';
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      patient: 'Patient',
      doctor: 'Doctor',
      lab: 'Lab',
      hospital_admin: 'Hospital Admin',
      insurance: 'Insurance',
      researcher: 'Researcher',
    };
    return labels[role] || role;
  };

  const getNavItems = () => {
    const items = [];
    
    items.push({
      label: 'Dashboard',
      icon: Home,
      path: '/dashboard',
    });

    if (user.role === UserRole.PATIENT) {
      items.push(
        { label: 'My Records', icon: FileText, path: '/my-records' },
        { label: 'Consent Management', icon: ShieldCheck, path: '/consent' }
      );
    }

    if (user.role === UserRole.DOCTOR) {
      items.push(
        { label: 'Patients', icon: Users, path: '/patients' },
        { label: 'Prescriptions', icon: ClipboardList, path: '/records?type=prescription' }
      );
    }

    if (user.role === UserRole.LAB) {
      items.push({ label: 'Lab Reports', icon: FileStack, path: '/lab-reports' });
    }

    if (user.role === UserRole.HOSPITAL_ADMIN) {
      items.push(
        { label: 'Manage Users', icon: Users, path: '/manage-users' },
        { label: 'Blockchain Audit', icon: Activity, path: '/blockchain-audit' }
      );
    }

    if (user.role === UserRole.INSURANCE) {
      items.push({ label: 'Claims', icon: FileText, path: '/claims' });
    }

    if (user.role === UserRole.RESEARCHER) {
      items.push({ label: 'Datasets', icon: FileStack, path: '/datasets' });
    }

    // items.push({ label: 'Blockchain Verify', icon: ShieldCheck, path: '/blockchain' });

    return items;
  };

  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">MediChain</span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                return (
                  <Button
                    key={item.path}
                    variant={isActive ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setLocation(item.path)}
                    className="gap-2"
                    data-testid={`nav-${item.path.replace('/', '')}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden lg:inline">{item.label}</span>
                  </Button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Badge
              variant="secondary"
              className={`${getRoleColor(user.role)} text-white hidden sm:flex`}
            >
              {getRoleLabel(user.role)}
            </Badge>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  data-testid="button-user-menu"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className={`${getRoleColor(user.role)} text-white text-sm`}>
                      {getInitials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user.fullName}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="sm:hidden">
                  <User className="w-4 h-4 mr-2" />
                  {getRoleLabel(user.role)}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
