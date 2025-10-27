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
import { Users, Plus, Search, UserCheck, Loader2, AlertCircle } from 'lucide-react'; // Added Loader2, AlertCircle
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { User, AccessControl } from '@shared/schema';

// Joined type for display
interface PatientWithAccess {
  id: string;
  fullName: string;
  username: string;
  accessStatus: 'active' | 'pending' | 'revoked';
  accessId: string;
}

// Zod schema still uses 'username' field name for the form, but searches broader criteria
const findPatientSchema = z.object({
  username: z.string().min(2, 'Search term must be at least 2 characters'),
});
type FindPatientForm = z.infer<typeof findPatientSchema>;

// Search result type
type PatientSearchResult = Pick<User, 'id' | 'fullName' | 'username'>;

export default function PatientsPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // State holds the single result to display after successful unique search
  const [searchResult, setSearchResult] = useState<PatientSearchResult | null>(null);

  // Query for doctor's current patients
  const { data: patients, isLoading: patientsLoading, error: patientsError } = useQuery<
    PatientWithAccess[]
  >({
    queryKey: ['/api/access/my-patients'],
    queryFn: async () => {
      const res = await api.get('/access/my-patients');
      return res.data;
    },
  });

  // Form hook for the search dialog
  const form = useForm<FindPatientForm>({
    resolver: zodResolver(findPatientSchema),
    defaultValues: { username: '' },
  });

  // --- MODIFIED Mutation to find a patient using GET endpoint ---
  const findPatientMutation = useMutation<
    PatientSearchResult | null, // Returns single patient or null if not unique/found
    Error,
    FindPatientForm // Input from the form
  >({
    mutationFn: async (formData) => {
      const searchTerm = formData.username; // Get search term from form field
      // Basic client-side check (redundant if using zod schema resolver, but safe)
      if (searchTerm.length < 2) {
         throw new Error('Search term must be at least 2 characters');
      }

      console.log(`Searching patients with query: ${searchTerm}`);
      // Use GET request with query parameter
      const res = await api.get(`/access/find-patient?query=${encodeURIComponent(searchTerm)}`);
      const results: PatientSearchResult[] = res.data; // Expect an array back

      console.log(`Found ${results.length} results.`);

      if (results.length === 1) {
        return results[0]; // Exactly one match found - success!
      } else if (results.length === 0) {
        throw new Error(`No patient found matching "${searchTerm}".`);
      } else {
        // More than one match found
        throw new Error('Multiple patients found. Please provide a more specific username or name.');
        // TODO: Optionally, you could update state here to show a selection list instead of erroring
      }
    },
    onSuccess: (data) => {
      // 'data' is the single PatientSearchResult if successful
      setSearchResult(data); // Set the result to display in the dialog
    },
    onError: (error: Error) => {
      toast({
        title: 'Search Failed',
        description: error.message || 'Could not find patient.', // Use error message from mutationFn
        variant: 'destructive',
      });
      setSearchResult(null); // Clear previous result on error
    },
  });
  // --- END MODIFICATION ---

  // Mutation to request access (no changes needed)
  const requestAccessMutation = useMutation<AccessControl, Error, string>({
    mutationFn: async (patientId) => {
      const res = await api.post('/access/request', { patientId });
      return res.data;
    },
    onSuccess: () => {
      toast({
            title: 'Access Requested',
            description:
              'The patient has been notified and will appear in your list as "Pending".',
          });
      queryClient.invalidateQueries({ queryKey: ['/api/access/my-patients'] });
      setIsDialogOpen(false);
      setSearchResult(null);
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

  // --- Handlers ---
  function onFindPatient(data: FindPatientForm) {
    // Clear previous result before starting new search
    setSearchResult(null);
    findPatientMutation.mutate(data);
  }

  function onRequestAccess() {
    if (searchResult) {
      requestAccessMutation.mutate(searchResult.id);
    }
  }

  // Helper for badge variant
  const getBadgeVariant = (status: 'active' | 'pending' | 'revoked'): 'success' | 'secondary' | 'outline' => {
      switch (status) {
          case 'active': return 'success';
          case 'pending': return 'secondary';
          case 'revoked': return 'outline';
      }
   };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Manage Patients</h1>
            <p className="text-muted-foreground mt-2">
              Track existing patients and request access to new ones.
            </p>
          </div>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) { form.reset(); setSearchResult(null); } // Reset on close
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
                  Search by username or name to request access.
                </DialogDescription>
              </DialogHeader>

              {/* Search Form */}
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onFindPatient)} className="space-y-4 pt-2">
                  <FormField
                    control={form.control}
                    name="username" // Field name still 'username' but label/placeholder updated
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Patient Username or Name</FormLabel> {/* Updated Label */}
                        <FormControl>
                          <div className="flex gap-2">
                            <Input
                              placeholder="Enter username or name..." // Updated Placeholder
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
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Search className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage /> {/* Displays Zod validation errors */}
                      </FormItem>
                    )}
                  />
                </form>
              </Form>

              {/* Display Single Search Result (if found and unique) */}
              {searchResult && (
                <div className="space-y-4 pt-4">
                  <p className="text-sm font-medium">Patient Found:</p>
                  <div className="flex items-center justify-between p-3 rounded-md border">
                    <div className="flex items-center gap-3">
                      <Avatar><AvatarFallback>{searchResult.fullName.charAt(0).toUpperCase()}</AvatarFallback></Avatar>
                      <div>
                        <p className="font-medium">{searchResult.fullName}</p>
                        <p className="text-sm text-muted-foreground">@{searchResult.username}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={onRequestAccess}
                      disabled={requestAccessMutation.isPending}
                      data-testid="button-request-access"
                    >
                      {requestAccessMutation.isPending ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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

        {/* Patient List Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Patients</CardTitle>
            <CardDescription>
              A list of patients you have active or pending access to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patientsLoading ? (
              // Skeletons
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : patientsError ? (
              // Error Display
              <div className="text-center py-12 text-destructive">
                 <AlertCircle className="w-10 h-10 mx-auto mb-2"/>
                 <p>Error loading patients:</p>
                 <p className='text-sm text-muted-foreground'>{patientsError.message}</p>
               </div>
            ) : !patients || patients.length === 0 ? (
              // Empty State
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
              // Patient List
              <div className="space-y-3">
                {patients?.map((patient) => (
                  <div key={patient.accessId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-md border gap-3" data-testid={`patient-row-${patient.id}`}>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{patient.fullName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{patient.fullName}</p>
                        <p className="text-xs text-muted-foreground">@{patient.username}</p>
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
                        onClick={() => setLocation(`/patient/${patient.id}/records`)}
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

