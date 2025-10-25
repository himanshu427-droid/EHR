import { useQuery } from '@tanstack/react-query';
import { useParams, Redirect, Link } from 'wouter';
import { DashboardLayout } from '@/components/dashboard-layout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { User, Record as PatientRecord } from '@shared/schema'; // Renamed Record to PatientRecord to avoid conflict

// Helper function for user initials
const getInitials = (name?: string) => {
  if (!name) return '?';
  const names = name.split(' ');
  return names
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

export default function PatientRecordsPage() {
  // 1. Get patientId from URL parameters provided by wouter
  const params = useParams<{ patientId?: string }>();
  const patientId = params.patientId;

  // Redirect if patientId is missing (shouldn't happen with correct routing)
  if (!patientId) {
    return <Redirect to="/patients" />;
  }

  // 2. Fetch Patient Details (Optional but good for display)
  // Assumes an endpoint like GET /api/users/:id exists
  const { data: patient, isLoading: patientLoading, error: patientError } = useQuery<User>({
      queryKey: [`/api/auth/users/${patientId}`], // Use a specific key including ID
      queryFn: async () => {
          const res = await api.get(`/auth/users/${patientId}`); 
          return res.data;
      },
      enabled: !!patientId, // Only run query if patientId is available
      retry: 1, // Don't retry endlessly if patient not found
  });


 
const { data: records, isLoading: recordsLoading, error: recordsError } = useQuery<
    PatientRecord[]
  >({
    queryKey: ['/api/access/patient', patientId, 'records'], // More specific query key
    queryFn: async () => {
      const res = await api.get(`/access/patient/${patientId}/records`);
      return res.data;
    },
    enabled: !!patientId, // Only run query if patientId is available
  });

  // Handle combined loading state
  const isLoading = patientLoading || recordsLoading;
  // Handle combined error state (prioritize record fetch error if both fail)
  const queryError = recordsError || patientError;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button and Header */}
        <div>
           <Button variant="outline" size="sm" asChild className='mb-4'>
                <Link href="/patients">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Patients
                </Link>
           </Button>
           {patientLoading ? (
               <>
                 <Skeleton className="h-8 w-1/2 mb-2" />
                 <Skeleton className="h-4 w-1/4" />
               </>
           ) : patient ? (
               <>
                 <h1 className="text-3xl font-bold tracking-tight">
                   Records for {patient.fullName}
                 </h1>
                 <p className="text-muted-foreground mt-1">
                   @{patient.username}
                 </p>
               </>
           ) : (
                <h1 className="text-3xl font-bold tracking-tight text-destructive">
                   Patient Not Found
                 </h1>
           )}
        </div>

        {/* Records Card */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Records</CardTitle>
            <CardDescription>
              List of records accessible for this patient.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              // Loading Skeleton for Table
              <div className="space-y-2">
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-12 w-full" />
                 <Skeleton className="h-12 w-full" />
                 <Skeleton className="h-12 w-full" />
              </div>
            ) : queryError ? (
              // Error State
              <div className="text-center py-12 text-destructive">
                <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                <p className="font-medium">Could not load records</p>
                <p className="text-sm mt-1">{queryError.message}</p>
                 {/* Provide context for access denied */}
                 {(queryError as any).response?.status === 403 && (
                     <p className="text-xs mt-2 text-muted-foreground">Make sure you still have active consent from the patient.</p>
                 )}
              </div>
            ) : !records || records.length === 0 ? (
              // Empty State
              <div className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No records found for this patient.
                </p>
              </div>
            ) : (
              // Data Table
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} data-testid={`record-row-${record.id}`}>
                      <TableCell className="font-medium">{record.title}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{record.recordType}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(record.createdAt).toLocaleDateString()}
                      </TableCell>
                       <TableCell>
                         <Badge variant={record.status === 'active' ? 'success' : 'outline'}>
                             {record.status}
                         </Badge>
                       </TableCell>
                      <TableCell className="text-right">
                        {/* Add actions like "View Details" linking to another page/modal */}
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
