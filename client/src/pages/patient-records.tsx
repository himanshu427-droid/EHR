import { useState, useEffect } from 'react'; // Import useState, useEffect
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // Import useMutation, useQueryClient
import { useForm, useFieldArray } from 'react-hook-form'; // Import form hooks
import { zodResolver } from '@hookform/resolvers/zod'; // Import resolver
import { z } from 'zod'; // Import z
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
import { AlertCircle, FileText, ArrowLeft, Shield, Plus, X, Loader2 } from 'lucide-react'; // Import Plus, X, Loader2
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import type { User, Record as PatientRecord } from '@shared/schema';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
  } from '@/components/ui/dialog'; // Import Dialog components
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
  } from '@/components/ui/form'; // Import Form components
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast'; // Import useToast

// --- Zod Schema for the Prescription creation within Record ---
const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
});

// Schema for the form inside the modal
const createPrescriptionRecordSchema = z.object({
  // patientId will be pre-filled
  diagnosis: z.string().min(1, 'Diagnosis is required'),
  medications: z
    .array(medicationSchema)
    .min(1, 'At least one medication is required'),
  notes: z.string().optional(),
  // Title is optional for prescriptions, might be derived from diagnosis
  title: z.string().optional(),
});

type CreatePrescriptionRecordForm = z.infer<typeof createPrescriptionRecordSchema>;

// Helper to format record type
const formatRecordType = (type?: string | null) => {
    if (!type) return 'N/A';
    // Replace underscores with spaces and capitalize each word
    return type.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

export default function PatientRecordsPage() {
  const params = useParams<{ patientId?: string }>();
  const patientId = params.patientId;
  const queryClient = useQueryClient(); // For invalidation
  const { toast } = useToast(); // For notifications
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false); // State for modal

  // Redirect if patientId is missing
  if (!patientId) {
    return <Redirect to="/patients" />;
  }

  // Fetch Patient Details
  const { data: patient, isLoading: patientLoading, error: patientError } = useQuery<User>({
      queryKey: [`/api/auth/users/${patientId}`],
      queryFn: async () => {
          const res = await api.get(`/auth/users/${patientId}`);
          return res.data;
      },
      enabled: !!patientId,
      retry: 1,
  });

  // Fetch Patient Records
  const { data: records, isLoading: recordsLoading, error: recordsError, refetch: refetchRecords } = useQuery<
    PatientRecord[]
  >({
    queryKey: ['/api/access/patient', patientId, 'records'],
    queryFn: async () => {
      const res = await api.get(`/access/patient/${patientId}/records`);
      return res.data;
    },
    enabled: !!patientId,
  });

  // --- Form Hook for creating prescription record ---
  const form = useForm<CreatePrescriptionRecordForm>({
    resolver: zodResolver(createPrescriptionRecordSchema),
    defaultValues: {
      diagnosis: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
      notes: '',
      title: '',
    },
  });

  // Field array for medications
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'medications',
  });

  // --- Mutation to create the prescription record ---
  const createRecordMutation = useMutation<
    PatientRecord, // Expect a Record back
    Error,
    CreatePrescriptionRecordForm // Input type is the form data
  >({
    mutationFn: async (formData) => {
        // Construct the full payload for the unified endpoint
        const payload = {
            ...formData,
            patientId: patientId, // Add the patientId from context
            recordType: 'prescription', // Set the record type explicitly
            // Auto-generate title from diagnosis if title is empty
            title: formData.title || `Prescription: ${formData.diagnosis}`
        };
        console.log("Sending payload to /api/records/upload:", payload);
        const res = await api.post('/records/upload', payload); // Use the unified endpoint
        return res.data;
    },
    onSuccess: () => {
        toast({
            title: 'Prescription Saved',
            description: 'The prescription record has been created.',
        });
        refetchRecords(); // Refetch the records list on this page
        setIsCreateModalOpen(false); // Close modal
        form.reset(); // Reset form
    },
    onError: (error: Error) => {
        toast({
            title: 'Failed to Save Prescription',
            description: error.message || 'An unexpected error occurred.',
            variant: 'destructive',
        });
    },
  });

  // Form submit handler
  function onSavePrescription(data: CreatePrescriptionRecordForm) {
    createRecordMutation.mutate(data);
  }

  // Combined loading/error states
  const isLoading = patientLoading || recordsLoading;
  // Prioritize records error for display if both fail
  const queryError = recordsError || patientError;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Button and Header */}
        <div>
          <div className="flex items-center justify-between mb-4">
             <Button variant="outline" size="sm" asChild>
                  <Link href="/patients">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Patients
                  </Link>
             </Button>

            {/* --- Add Record/Prescription Button --- */}
            <Dialog open={isCreateModalOpen} onOpenChange={
                (open) => {
                    setIsCreateModalOpen(open);
                    if (!open) {
                        form.reset(); // Reset form if closed manually
                    }
                }
            }>
                <DialogTrigger asChild>
                    <Button
                        size="sm"
                        disabled={!patient} // Disable if patient data hasn't loaded
                        data-testid="button-add-record-for-patient"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Record / Prescription
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[625px]">
                    <DialogHeader>
                        <DialogTitle>Add Record for {patient?.fullName}</DialogTitle>
                        <DialogDescription>
                            Currently supports adding prescriptions. Fill medication details.
                        </DialogDescription>
                    </DialogHeader>

                    {/* --- Prescription Form Inside Modal --- */}
                    <Form {...form}>
                        <form
                         onSubmit={form.handleSubmit(onSavePrescription)}
                         className="space-y-4 max-h-[70vh] overflow-y-auto pr-2" // Scrollable form
                        >
                            {/* Patient ID is handled contextually, not shown in form */}
                            <FormField
                                control={form.control}
                                name="diagnosis"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Diagnosis (Required for Prescription)</FormLabel>
                                    <FormControl>
                                    <Input placeholder="e.g., Hypertension" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />

                            {/* Medications Field Array */}
                            <div>
                                <FormLabel>Medications (Required for Prescription)</FormLabel>
                                <div className="space-y-3 mt-2">
                                {fields.map((item, index) => (
                                    <Card key={item.id} className="p-4 relative group">
                                         {fields.length > 1 && (
                                           <Button
                                             type="button"
                                             variant="ghost"
                                             size="icon"
                                             className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100"
                                             onClick={() => remove(index)}
                                             aria-label="Remove Medication"
                                           >
                                             <X className="h-4 w-4" />
                                           </Button>
                                         )}
                                         <div className="grid grid-cols-2 gap-4">
                                            {/* Medication Fields: Name, Dosage, Frequency, Duration */}
                                            <FormField control={form.control} name={`medications.${index}.name`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Name</FormLabel><FormControl><Input placeholder="e.g., Metformin" {...field} /></FormControl><FormMessage className="text-xs"/></FormItem>)} />
                                            <FormField control={form.control} name={`medications.${index}.dosage`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Dosage</FormLabel><FormControl><Input placeholder="e.g., 500mg" {...field} /></FormControl><FormMessage className="text-xs"/></FormItem>)} />
                                            <FormField control={form.control} name={`medications.${index}.frequency`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Frequency</FormLabel><FormControl><Input placeholder="e.g., Twice daily" {...field} /></FormControl><FormMessage className="text-xs"/></FormItem>)} />
                                            <FormField control={form.control} name={`medications.${index}.duration`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Duration</FormLabel><FormControl><Input placeholder="e.g., 30 days, Ongoing" {...field} /></FormControl><FormMessage className="text-xs"/></FormItem>)} />
                                         </div>
                                    </Card>
                                ))}
                                <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ name: '', dosage: '', frequency: '', duration: '' })} >
                                    <Plus className="mr-2 h-4 w-4" /> Add Medication
                                </Button>
                                {/* Error display for medications array */}
                                {form.formState.errors.medications?.root && <p className="text-sm font-medium text-destructive">{form.formState.errors.medications.root.message}</p>}
                                {form.formState.errors.medications && !form.formState.errors.medications?.root && <p className="text-sm font-medium text-destructive">Please fill out all medication fields.</p>}
                                </div>
                            </div>

                            {/* Optional Notes */}
                            <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Additional instructions..." className="resize-none" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            {/* Optional Title */}
                             <FormField control={form.control} name="title" render={({ field }) => ( <FormItem><FormLabel>Title (Optional)</FormLabel><FormControl><Input placeholder="Defaults to Diagnosis" {...field} /></FormControl><FormMessage /></FormItem> )} />


                            <DialogFooter>
                                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                                <Button type="submit" disabled={createRecordMutation.isPending} data-testid="button-save-prescription-record">
                                {createRecordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Prescription Record
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                    {/* --- End Prescription Form --- */}
                </DialogContent>
            </Dialog>
             {/* --- End Add Record Button --- */}
          </div>

          {/* Patient Header Display */}
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
           ) : patientError ? ( // Handle case where patient fetch fails but records might load
                <h1 className="text-3xl font-bold tracking-tight text-destructive">
                   Could not load patient details
                 </h1>
           ): null }
        </div>

        {/* Records Card (Table Display) */}
        <Card>
          <CardHeader>
            <CardTitle>Medical Records</CardTitle>
            <CardDescription>
              List of records accessible for this patient.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recordsLoading ? ( // Use specific loading state for records table
              <div className="space-y-2">
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-12 w-full" />
                 <Skeleton className="h-12 w-full" />
                 <Skeleton className="h-12 w-full" />
              </div>
            ) : recordsError ? ( // Use specific error state for records table
              <div className="text-center py-12 text-destructive">
                <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                <p className="font-medium">Could not load records</p>
                <p className="text-sm mt-1">{recordsError.message}</p>
                 {(recordsError as any).response?.status === 403 && (
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
                 {/* Prompt to add first record if patient data is available */}
                {patient && (
                    <Button size="sm" className="mt-4" onClick={() => setIsCreateModalOpen(true)}>
                       <Plus className="mr-2 h-4 w-4" /> Add First Record
                    </Button>
                )}
              </div>
            ) : (
              // Data Table
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title / Diagnosis</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => (
                    <TableRow key={record.id} data-testid={`record-row-${record.id}`}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={record.recordType === 'prescription' ? (record.diagnosis || record.title) : record.title}>
                         {record.recordType === 'prescription' ? (record.diagnosis || record.title) : record.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                           {formatRecordType(record.recordType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(record.createdAt).toLocaleDateString()}
                      </TableCell>
                       <TableCell>
                         <Badge variant={record.status === 'active' ? 'success' : 'outline'}>
                             {record.status}
                         </Badge>
                       </TableCell>
                       <TableCell>
                          {record.blockchainTxId ? (
                              <Shield className="w-4 h-4 text-green-600" title="Verified on Blockchain"/>
                          ) : (
                              <Shield className="w-4 h-4 text-muted-foreground/50" title="Not Verified"/>
                          )}
                       </TableCell>
                      <TableCell className="text-right">
                        {/* Actions: View Details (opens modal/drawer) */}
                        <Button variant="ghost" size="sm" onClick={() => {/* TODO: Open details modal/drawer for record.id */} }>
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

