import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  FileText,
  ClipboardList,
  Activity,
  Search,
} from 'lucide-react';
import { useLocation } from 'wouter';
import type { Prescription, Record } from '@shared/schema';
import { api } from '@/lib/api'; // <-- 1. IMPORT THE API CLIENT

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // 2. ADDED queryFn TO FETCH DATA
  const { data: prescriptions, isLoading: prescriptionsLoading } = useQuery<
    Prescription[]
  >({
    queryKey: ['/api/prescriptions/my-prescriptions'],
    queryFn: async () => {
      const res = await api.get('/prescriptions/my-prescriptions');
      return res.data;
    },
  });

  // 3. ADDED queryFn TO FETCH DATA
  const { data: records, isLoading: recordsLoading } = useQuery<Record[]>({
    queryKey: ['/api/records/created-by-me'],
    queryFn: async () => {
      const res = await api.get('/records/created-by-me');
      return res.data;
    },
  });

  const stats = [
    {
      title: 'Active Prescriptions',
      value: prescriptions?.filter((p) => p.status === 'active').length || 0,
      icon: ClipboardList,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Patient Records',
      value: records?.length || 0,
      icon: FileText,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      title: 'Total Patients',
      value: new Set(prescriptions?.map((p) => p.patientId)).size || 0,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
    },
  ];

  const recentPrescriptions = prescriptions?.slice(0, 5) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome, Dr. {user?.fullName}
          </h1>
          <p className="text-muted-foreground mt-2">
            {user?.username &&
              `Specialty: ${(user as any).speciality || 'General Practice'}`}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`${stat.bg} p-2 rounded-md`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
              <div>
                <CardTitle>Recent Prescriptions</CardTitle>
                <CardDescription>Your latest prescriptions</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setLocation('/prescriptions')}
                data-testid="button-view-all-prescriptions"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {prescriptionsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentPrescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No prescriptions yet
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first prescription
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentPrescriptions.map((prescription) => (
                    <div
                      key={prescription.id}
                      className="flex items-center justify-between p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => setLocation('/prescriptions')}
                      data-testid={`prescription-${prescription.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {prescription.diagnosis}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(
                            prescription.createdAt,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant="secondary"
                        className={
                          prescription.status === 'active'
                            ? 'bg-success text-white'
                            : ''
                        }
                      >
                        {prescription.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Manage patient care</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/patients')}
                data-testid="button-search-patients"
              >
                <Search className="w-4 h-4" />
                Manage Patients
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/prescriptions')}
                data-testid="button-create-prescription"
              >
                <ClipboardList className="w-4 h-4" />
                Create Prescription
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/blockchain')}
                data-testid="button-verify-records"
              >
                <Activity className="w-4 h-4" />
                Verify Records on Blockchain
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Patient Records Access</CardTitle>
            <CardDescription>
              Records you can access based on patient consent
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recordsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : records?.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No accessible records
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Patients need to grant you access to their records
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {records?.slice(0, 5).map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                    data-testid={`record-${record.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">{record.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{record.recordType}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

