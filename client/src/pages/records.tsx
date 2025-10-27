import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth'; // Assuming useAuth provides user info
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
// Removed Button import as Add Record is removed, kept for potential future actions
// import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
// Removed Dialog, Label, Textarea, Select, Plus, Download imports
import { FileText, Shield, Search, Calendar, AlertCircle } from 'lucide-react'; // Removed Plus, Download
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api'; // Use api instance
import type { Record as PatientRecord } from '@shared/schema'; // Renamed Record type alias

// Helper to capitalize first letter and replace underscores
const formatRecordType = (type: string) => {
    if (!type) return '';
    return type.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};


export default function RecordsPage() {
  // Removed user state as patient cannot add records now
  // const { user } = useAuth();
  const { toast } = useToast(); // Keep toast for potential future actions/errors
  // Removed Dialog state and form state
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch records for the currently logged-in patient
  const { data: records, isLoading, error: recordsError } = useQuery<PatientRecord[]>({
    queryKey: ['/api/records/my-records'],
    queryFn: async () => {
        const res = await api.get('/records/my-records');
        return res.data;
    },
    // Keep staleTime or other options if needed
  });

  // Removed uploadMutation and handleUpload function

  // Filter records based on search query (title, type, or diagnosis for prescriptions)
  const filteredRecords = records?.filter((record) => {
      const lowerSearch = searchQuery.toLowerCase();
      const titleMatch = record.title?.toLowerCase().includes(lowerSearch);
      const typeMatch = record.recordType?.toLowerCase().includes(lowerSearch);
      // Include diagnosis in search if it's a prescription
      const diagnosisMatch = record.recordType === 'prescription' && record.diagnosis?.toLowerCase().includes(lowerSearch);
      return titleMatch || typeMatch || diagnosisMatch;
    }
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Health Records</h1>
            <p className="text-muted-foreground mt-2">
              View your medical records added by healthcare providers.
            </p>
          </div>
          {/* Removed Add Record Button and Dialog */}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search records by title, type, or diagnosis..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-records"
            />
          </div>
        </div>

        {/* Records List/Cards */}
        {isLoading ? (
          // Loading Skeletons
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : recordsError ? (
           // Error Display
           <Card>
             <CardContent className="text-center py-16 text-destructive">
               <AlertCircle className="w-16 h-16 mx-auto mb-4" />
               <h3 className="text-lg font-semibold mb-2">Could Not Load Records</h3>
               <p className="text-sm text-muted-foreground mb-6">
                 {recordsError.message || 'An unexpected error occurred.'}
               </p>
             </CardContent>
           </Card>
        ) : filteredRecords?.length === 0 ? (
          // Empty State (Handles both no records overall and no search results)
          <Card>
            <CardContent className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No records found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery
                  ? 'Try adjusting your search term.'
                  : 'Your healthcare providers have not added any records yet.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          // Display Filtered Records
          <div className="grid gap-4">
            {filteredRecords?.map((record) => (
              <Card key={record.id} className="hover:bg-muted/50" data-testid={`record-card-${record.id}`}> {/* Simplified hover */}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">
                         {/* Show diagnosis if prescription, else title */}
                         {record.recordType === 'prescription' ? (record.diagnosis || record.title) : record.title}
                      </CardTitle>
                      {/* Show description only if it exists */}
                      {record.description && (
                         <CardDescription className="mt-1 line-clamp-2"> {/* Limit description lines */}
                           {record.description}
                         </CardDescription>
                      )}
                       {/* Optionally display medications preview for prescriptions */}
                       {record.recordType === 'prescription' && record.medications && (
                           <p className="text-xs text-muted-foreground mt-1 truncate">
                             Meds: {(record.medications as any[]).map(m => m.name).join(', ')}
                           </p>
                       )}
                    </div>
                    <Badge variant="secondary" className="shrink-0 capitalize">
                      {formatRecordType(record.recordType)} {/* Use helper for formatting */}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                    </div>
                     {/* Simplified "Verified" display */}
                    {record.blockchainTxId && (
                      <div className="flex items-center gap-2 text-green-600 dark:text-green-500">
                        <Shield className="w-4 h-4" />
                        <span>Blockchain Verified</span>
                      </div>
                    )}
                  </div>
                   {/* Removed blockchain TX ID display for patient view - less relevant */}
                   {/* Removed Download/View on Blockchain buttons for patient view */}
                   {/* Add a "View Details" button if needed */}
                   {/* <div className="flex justify-end">
                       <Button size="sm" variant="outline">View Details</Button>
                   </div> */}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
