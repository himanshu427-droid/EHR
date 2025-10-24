import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Plus, Search, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
// Import the new 'api' object
import { api } from '@/lib/api';
import type { User, AccessControl } from '@shared/schema';

// This is a "joined" type. The API route will need to construct this.
interface PatientWithAccess {
  id: string; // Patient's User ID
  fullName: string;
  username: string;
  accessStatus: 'active' | 'pending' | 'revoked';
  accessId: string; // The ID of the access_control record
}

// Zod schema for the search form in the dialog
const findPatientSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
});
type FindPatientForm = z.infer<typeof findPatientSchema>;

// The API response for a successful patient search
type PatientSearchResult = Pick<User, 'id' | 'fullName' | 'username'>;

// We no longer need the handleFetchErrors function,
// as the axios interceptor in api.ts handles this.

export default function PatientsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<PatientSearchResult | null>(
    null,
  );

  // 1. Query to get the doctor's current patients
  const { data: patients, isLoading: patientsLoading } = useQuery<
    PatientWithAccess[]
  >({
    queryKey: ['/api/access/my-patients'],
    queryFn: async () => {
      // Use the new 'api' object
      const res = await api.get('/access/my-patients');
      return res.data; // axios automatically provides 'data'
    },
  });

  // 2. Form hook for the search dialog
  const form = useForm<FindPatientForm>({
    resolver: zodResolver(findPatientSchema),
    defaultValues: { username: '' },
  });

  // 3. Mutation to find a patient by username
  const findPatientMutation = useMutation<
    PatientSearchResult,
    Error,
    FindPatientForm
  >({
    mutationFn: async (data) => {
      // Use the new 'api' object
      const res = await api.post('/access/find-patients', data);
      return res.data;
    },
    onSuccess: (data) => {
      setSearchResult(data);
    },
    onError: (error: Error) => {
      // The 'error.message' now comes from our axios interceptor
      toast({
        title: 'Search Failed',
        description: error.message || 'Patient not found',
        variant: 'destructive',
      });
      setSearchResult(null);
    },
  });

  // 4. Mutation to request access to a patient
  const requestAccessMutation = useMutation<AccessControl, Error, string>({
    mutationFn: async (patientId) => {
      // Use the new 'api' object
      const res = await api.post('/access/request', { patientId });
      return res.data;
    },
    onSuccess: () => {
      toast({
        title: 'Access Requested',
        description:
          'The patient has been notified and will appear in your list as "Pending".',
      });
      // Refetch the patient list to show the new pending request
      queryClient.invalidateQueries({
        queryKey: ['/api/access/my-patients'],
      });
      setIsDialogOpen(false); // Close the dialog
      setSearchResult(null); // Reset search result
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Request Failed',
        description: error.message || 'Could not request access.',
        variant: 'destructive',
      });
    },
  });

  // Handle form submission for finding a patient
  function onFindPatient(data: FindPatientForm) {
    findPatientMutation.mutate(data);
  }

  // Handle click for requesting access
  function onRequestAccess() {
    if (searchResult) {
      requestAccessMutation.mutate(searchResult.id);
    }
  }

  // Helper to get badge color
  const getBadgeVariant = (
    status: 'active' | 'pending' | 'revoked',
  ): 'success' | 'secondary' | 'outline' => {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'secondary';
      case 'revoked':
        return 'outline';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Manage Patients
            </h1>
            <p className="text-muted-foreground mt-2">
              Track existing patients and request access to new ones.
            </p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                // Reset form when dialog closes
                form.reset();
                setSearchResult(null);
              }
            }}
          >
            <DialogTrigger asChild>
              <Button data-testid="button-find-patient">
                <Plus className="w-4 h-4 mr-2" /> Find New Patient
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Find New Patient</DialogTitle>
                <DialogDescription>
                  Search for a patient by their username to request access to
                  their records.
                </DialogDescription>
              </DialogHeader>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onFindPatient)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patient Username</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g., alice, bob"
                              data-testid="input-patient-username"
                              {...field}
                            />
                            <Button
                              type="submit"
                              variant="secondary"
                              disabled={findPatientMutation.isPending}
                              data-testid="button-search"
                            >
                              {findPatientMutation.isPending ? (
                                <div className="animate-spin w-4 h-4" />
                              ) : (
                                <Search className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>

              {searchResult && (
                <div className="space-y-4 pt-4">
                  <p className="text-sm font-medium">Patient Found:</p>
                  <div className="flex items-center justify-between p-3 rounded-md border">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {searchResult.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {searchResult.fullName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          @{searchResult.username}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={onRequestAccess}
                      disabled={requestAccessMutation.isPending}
                      data-testid="button-request-access"
                    >
                      {requestAccessMutation.isPending ? (
                        <div className="animate-spin w-4 h-4 mr-2" />
                      ) : (
                        <UserCheck className="w-4 h-4 mr-2" />
                      )}
                      Request Access
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your Patients</CardTitle>
            <CardDescription>
              A list of patients you have active or pending access to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patientsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : patients?.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No patients found.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Find New Patient" to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {patients?.map((patient) => (
                  <div
                    key={patient.accessId}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md border gap-3"
                    data-testid={`patient-row-${patient.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {patient.fullName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {patient.fullName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          @{patient.username}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <Badge
                        variant={getBadgeVariant(patient.accessStatus)}
                        className="w-full sm:w-auto justify-center"
                      >
                        {patient.accessStatus}
                      </Badge>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
                        onClick={() =>
                          setLocation(`/patient/${patient.id}/records`)
                        }
                        disabled={patient.accessStatus !== 'active'}
                      >
                        View Records
                      </Button>
                    </div>
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

