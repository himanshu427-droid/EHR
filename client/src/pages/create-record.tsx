import { useState, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form'; // Removed Controller
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { getMultipartAuthHeaders } from '@/lib/api';
import { ArrowLeft, Plus, X, Loader2, Search, UserCheck, CheckCircle2 } from 'lucide-react';
import type { Record as PatientRecord, User } from '@shared/schema';
import { debounce } from 'lodash-es';

// --- Zod Schema for Medication ---
const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
});

// --- Zod Schema for the Form ---
const createRecordFormSchema = z.object({
    recordType: z.string().min(1, 'Record type is required'),
    title: z.string().optional(),
    description: z.string().optional(),
    diagnosis: z.string().optional(),
    medications: z.array(medicationSchema).optional(),
}).refine(data => {
    // Require title if NOT a prescription AND type is selected
    if (data.recordType && data.recordType !== 'prescription' && (!data.title || data.title.trim() === '')) {
        return false;
    }
    // Require diagnosis and medications IF it IS a prescription
    if (data.recordType === 'prescription' && (!data.diagnosis || data.diagnosis.trim() === '' || !data.medications || data.medications.length === 0)) {
        return false;
    }
    return true;
}, {
    message: "Title is required (unless type is Prescription). Diagnosis and Medications are required for Prescriptions.",
    // path: ["title"], // Path might be misleading
});

type CreateRecordForm = z.infer<typeof createRecordFormSchema>;

// Type for patient search results
type PatientSearchResult = Pick<User, 'id' | 'fullName' | 'username'>;

export default function CreateRecordPage() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<PatientSearchResult[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // --- Form Hook ---
  const form = useForm<CreateRecordForm>({
    resolver: zodResolver(createRecordFormSchema),
    defaultValues: {
      recordType: '',
      title: '',
      description: '',
      diagnosis: '',
      medications: [{ name: '', dosage: '', frequency: '', duration: '' }],
    },
     mode: 'onChange', // Validate on change for refine
  });

  const watchedRecordType = form.watch('recordType');
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "medications" });

  // --- Patient Search Mutation ---
  const searchPatientMutation = useMutation<PatientSearchResult[], Error, string>({
      mutationFn: async (term) => {
          if (term.length < 2) return [];
          setIsSearching(true);
          const res = await api.get(`/access/find-patient?query=${encodeURIComponent(term)}`);
          return res.data;
      },
      onSuccess: (data) => { setSearchResults(data); setIsSearching(false); },
      onError: (error) => {
          toast({ title: 'Patient Search Failed', description: error.message, variant: 'destructive' });
          setSearchResults([]);
          setIsSearching(false);
      },
  });

  // Debounced search
  const debouncedSearch = useCallback( debounce((term: string) => { searchPatientMutation.mutate(term); }, 500), [searchPatientMutation] );
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value;
    setSearchTerm(term);
    setSelectedPatient(null); // Clear selection when typing
    setSearchResults([]);
    if (term.length >= 2) {
        setIsSearching(true);
        debouncedSearch(term);
    } else {
        setIsSearching(false);
        debouncedSearch.cancel();
    }
  };
  const handleSelectPatient = (patient: PatientSearchResult) => {
    setSelectedPatient(patient);
    setSearchTerm(''); // Clear search box
    setSearchResults([]); // Clear results list
    setIsSearching(false);
  };

   // --- Record Creation Mutation ---
   const createRecordMutation = useMutation<PatientRecord, Error, FormData>({
     mutationFn: async (formDataPayload) => {
       const response = await fetch('/api/records/upload', { // Use fetch for FormData
           method: 'POST',
           headers: getMultipartAuthHeaders(), // Use specific headers for multipart
           body: formDataPayload,
       });
       if (!response.ok) {
           const errorData = await response.json().catch(() => ({ message: 'Failed to create record: Invalid server response' }));
           throw new Error(errorData.message || 'Failed to create record');
       }
       return response.json();
     },
     onSuccess: () => {
       toast({ title: 'Record Created', description: 'The record has been successfully saved.' });
       setLocation('/dashboard'); // Navigate after success
     },
     onError: (error: Error) => {
       toast({ title: 'Failed to Create Record', description: error.message, variant: 'destructive' });
     },
   });

  // --- Form Submit Handler ---
  function onSubmit(data: CreateRecordForm) {
    if (!selectedPatient) {
        toast({ title: "Patient Not Selected", description: "Please search for and select a patient.", variant: "destructive" });
        return;
    }
    const formDataPayload = new FormData();
    formDataPayload.append('patientId', selectedPatient.id);
    formDataPayload.append('recordType', data.recordType);
    formDataPayload.append('title', data.title || (data.recordType === 'prescription' ? `Prescription: ${data.diagnosis}` : ''));
    formDataPayload.append('description', data.description || '');
    if (data.recordType === 'prescription') {
        formDataPayload.append('diagnosis', data.diagnosis || '');
        formDataPayload.append('medications', JSON.stringify(data.medications || []));
    }
    if (selectedFile) {
        formDataPayload.append('file', selectedFile);
    }
    console.log("Submitting FormData:", Object.fromEntries(formDataPayload.entries()));
    createRecordMutation.mutate(formDataPayload);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard </Link>
        </Button>

        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>Create New Record</CardTitle>
            <CardDescription>
              First, find and select the patient, then fill in the record details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* --- Form Provider Wraps Everything Including Patient Search --- */}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                {/* --- Patient Search and Selection (MOVED INSIDE) --- */}
                <FormItem className="mb-2">
                  <FormLabel>Patient *</FormLabel>
                  {selectedPatient ? (
                    // Display selected patient
                    <div className="flex items-center justify-between p-3 border rounded-md bg-muted/50">
                       <div className='flex items-center gap-2'>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="font-medium">{selectedPatient.fullName}</p>
                            <p className="text-sm text-muted-foreground">@{selectedPatient.username}</p>
                          </div>
                       </div>
                       <Button variant="ghost" size="sm" onClick={() => setSelectedPatient(null)}>Change</Button>
                    </div>
                  ) : (
                    // Show search input and results
                    <div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                        <Input
                          placeholder="Search patient by username or name..."
                          value={searchTerm}
                          onChange={handleSearchChange}
                          className="pl-9"
                        />
                        {isSearching && <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>
                      {searchResults.length > 0 && (
                        <div className="mt-2 border rounded-md max-h-40 overflow-y-auto">
                          {searchResults.map((patientResult) => (
                            <div
                              key={patientResult.id}
                              className="flex items-center justify-between p-3 hover:bg-muted cursor-pointer"
                              onClick={() => handleSelectPatient(patientResult)}
                              data-testid={`patient-result-${patientResult.id}`}
                            >
                              <div>
                                 <p className="font-medium">{patientResult.fullName}</p>
                                 <p className="text-sm text-muted-foreground">@{patientResult.username}</p>
                              </div>
                               <UserCheck className="w-4 h-4 text-muted-foreground" />
                            </div>
                          ))}
                        </div>
                      )}
                       {searchTerm.length >= 2 && !isSearching && searchResults.length === 0 && (
                           <p className="text-sm text-muted-foreground mt-2">No patients found matching "{searchTerm}".</p>
                       )}
                       <FormDescription>Search by username or part of their full name (min 2 chars).</FormDescription>
                    </div>
                  )}
                   {/* Add FormMessage here if you add validation for patient selection later */}
                </FormItem>
                {/* --- End Patient Search --- */}


                {/* Record Type Select */}
                 <FormField
                    control={form.control}
                    name="recordType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Record Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a record type" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                <SelectItem value="diagnosis">Diagnosis</SelectItem>
                                <SelectItem value="prescription">Prescription</SelectItem>
                                <SelectItem value="lab_report">Lab Report</SelectItem>
                                <SelectItem value="vaccination">Vaccination</SelectItem>
                                <SelectItem value="imaging">Imaging</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                 />

                {/* --- Conditional Fields --- */}

                {/* Title (Required unless prescription) */}
                {watchedRecordType && watchedRecordType !== 'prescription' && (
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Annual Checkup Results" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                 {/* Description (Optional always) */}
                 <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Textarea placeholder="Additional details..." className="resize-none" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                 />

                {/* Diagnosis (Required IF prescription) */}
                {watchedRecordType === 'prescription' && (
                  <FormField
                    control={form.control}
                    name="diagnosis"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Diagnosis *</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Hypertension" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Medications (Required IF prescription) */}
                {watchedRecordType === 'prescription' && (
                  <div>
                    <FormLabel>Medications *</FormLabel>
                    <div className="space-y-3 mt-2">
                      {fields.map((item, index) => (
                        <Card key={item.id} className="p-4 relative group">
                          {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove(index)} aria-label="Remove Medication" >
                              <X className="h-4 w-4" />
                            </Button>
                           )}
                          <div className="grid grid-cols-2 gap-4">
                              <FormField control={form.control} name={`medications.${index}.name`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Name</FormLabel><FormControl><Input placeholder="Name" {...field} /></FormControl><FormMessage className="text-xs"/></FormItem>)} />
                              <FormField control={form.control} name={`medications.${index}.dosage`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Dosage</FormLabel><FormControl><Input placeholder="Dosage" {...field} /></FormControl><FormMessage className="text-xs"/></FormItem>)} />
                              <FormField control={form.control} name={`medications.${index}.frequency`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Frequency</FormLabel><FormControl><Input placeholder="Frequency" {...field} /></FormControl><FormMessage className="text-xs"/></FormItem>)} />
                              <FormField control={form.control} name={`medications.${index}.duration`} render={({ field }) => (<FormItem><FormLabel className="text-xs">Duration</FormLabel><FormControl><Input placeholder="Duration" {...field} /></FormControl><FormMessage className="text-xs"/></FormItem>)} />
                          </div>
                        </Card>
                      ))}
                      <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ name: '', dosage: '', frequency: '', duration: '' })}>
                        <Plus className="mr-2 h-4 w-4" /> Add Medication
                      </Button>
                      {/* Error display */}
                      {form.formState.errors.medications?.root && <FormMessage>{form.formState.errors.medications.root.message}</FormMessage>}
                      {form.formState.errors.medications && !form.formState.errors.medications?.root && form.formState.errors.medications.length && <FormMessage>Please fill out all medication fields.</FormMessage>}
                    </div>
                  </div>
                )}

                 {/* File Upload (Optional always) */}
                 <FormItem>
                    <FormLabel>File (Optional)</FormLabel>
                    <FormControl>
                        <Input
                            type="file"
                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        />
                    </FormControl>
                    <FormMessage />
                 </FormItem>

                {/* General form error if refine fails */}
                {form.formState.errors.root && <FormMessage>{form.formState.errors.root.message}</FormMessage>}

                <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createRecordMutation.isPending || !selectedPatient}>
                        {createRecordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Record
                    </Button>
                </div>
              </form>
            </Form>
            {/* --- Form Provider ends HERE --- */}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

