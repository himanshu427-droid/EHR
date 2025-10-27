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
// No longer need Prescription type, only Record
import type { Record } from '@shared/schema';
import { api } from '@/lib/api';
import { useMemo } from 'react'; // Import useMemo for derived data

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // --- REMOVED: Separate query for prescriptions ---

  // --- Fetch ALL records created by this doctor ---
  const { data: records, isLoading: recordsLoading, error: recordsError } = useQuery<Record[]>({
    queryKey: ['/api/records/created-by-me'],
    queryFn: async () => {
      const res = await api.get('/records/created-by-me');
      return res.data;
    },
  });

  // --- Filter records to get only prescriptions using useMemo ---
  const prescriptionRecords = useMemo(() => {
    return records?.filter((r) => r.recordType === 'prescription') || [];
  }, [records]); // Recalculate only when records data changes

  // --- Update Stats based on filtered records ---
  const stats = useMemo(() => [
    {
      title: 'Active Prescriptions',
      // Filter prescription records further by status
      value: prescriptionRecords.filter((p) => p.status === 'active').length,
      icon: ClipboardList,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Total Records Created', // Changed title for clarity
      value: records?.length || 0, // Count all records
      icon: FileText,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      title: 'Total Patients (Prescribed)', // Changed title for clarity
      // Get unique patient IDs from prescription records
      value: new Set(prescriptionRecords.map((p) => p.patientId)).size,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
    },
  ], [records, prescriptionRecords]); // Recalculate stats if records or prescriptions change

  // --- Get recent prescriptions from the filtered list ---
  const recentPrescriptions = prescriptionRecords.slice(0, 5);

  // Determine overall loading state
  const isLoading = recordsLoading; // Only depends on the single query now

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

        {/* Stats Section - Renders based on calculated stats */}
        <div className="grid gap-4 md:grid-cols-3">
          {isLoading ? (
             [...Array(3)].map((_, i) => <Skeleton key={i} className="h-[109px] w-full" />) // Skeleton for stats cards
          ) : (
            stats.map((stat) => {
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
            })
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Prescriptions Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
              <div>
                <CardTitle>Recent Prescriptions</CardTitle>
                <CardDescription>Your latest prescriptions</CardDescription>
              </div>
              <Button
                size="sm"
                // Navigate to a general records page, potentially with filter
                onClick={() => setLocation('/records?type=prescription')}
                data-testid="button-view-all-prescriptions"
              >
                View All Prescriptions
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? ( // Use the combined loading state
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recordsError ? ( // Handle error state for the records query
                 <p className="text-sm text-destructive">Could not load data.</p>
              ): recentPrescriptions.length === 0 ? (
                // Empty state specific to prescriptions
                <div className="text-center py-12">
                  <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No prescriptions created yet.
                  </p>
                </div>
              ) : (
                // Display recent prescription records
                <div className="space-y-3">
                  {recentPrescriptions.map((prescriptionRecord) => (
                    <div
                      key={prescriptionRecord.id}
                      className="flex items-center justify-between p-3 rounded-md border hover:bg-muted/50 cursor-pointer" // Adjusted hover style
                      // Optional: onClick could navigate to record detail page
                      // onClick={() => setLocation(`/record/${prescriptionRecord.id}`)}
                      data-testid={`prescription-${prescriptionRecord.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {/* Display diagnosis from the record */}
                          {prescriptionRecord.diagnosis || prescriptionRecord.title /* Fallback to title */}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(
                            prescriptionRecord.createdAt,
                          ).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant={prescriptionRecord.status === 'active' ? 'success' : 'outline'}
                      >
                        {prescriptionRecord.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
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
                data-testid="button-manage-patients" // Updated testid
              >
                <Search className="w-4 h-4" />
                Manage Patients
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                // This should trigger the unified "Create Record" flow/modal
                // For now, points to a hypothetical creation page
                onClick={() => setLocation('/records/create')} // Or trigger modal state
                data-testid="button-create-record" // Updated testid
              >
                <ClipboardList className="w-4 h-4" />
                Create Record / Prescription
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

        {/* Patient Records Access Card (No changes needed here) */}
        <Card>
           {/* ... This card likely fetches accessible records via a different endpoint - keep as is ... */}
           {/* ... or if it also used `/api/records/created-by-me`, update its display logic ... */}
          <CardHeader>
            <CardTitle>All Records Created</CardTitle>
            <CardDescription>
              Most recent records you have created.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recordsError ? (
                 <p className="text-sm text-destructive">Could not load records.</p>
            ): !records || records.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No records created yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {records?.slice(0, 5).map((record) => ( // Display first 5 of ALL records
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                    data-testid={`record-${record.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="text-sm font-medium">
                           {record.recordType === 'prescription' ? (record.diagnosis || record.title) : record.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize">
                       {record.recordType.replace('_', ' ')}
                    </Badge>
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

