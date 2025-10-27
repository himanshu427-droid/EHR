import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
// Remove useAuth if not directly needed, DashboardLayout likely handles auth context
// import { useAuth } from '@/lib/auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Search, AlertCircle, Shield, Calendar, ClipboardList } from 'lucide-react'; // Added ClipboardList
import { Link, useLocation } from 'wouter'; // Import useLocation
import { api } from '@/lib/api';
import type { Record as PatientRecord } from '@shared/schema';
import { Select } from '@/components/ui/select';

// Helper to format record type
const formatRecordType = (type?: string | null) => {
    if (!type) return 'N/A';
    return type.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
};

export default function DoctorRecordsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [location] = useLocation(); // Get location to read query params

  // --- Read filter type from URL query parameter ---
  const queryParams = new URLSearchParams(window.location.search);
  const filterType = queryParams.get('type') || null; // Get 'prescription' or null

  // --- Fetch ALL records created by this doctor ---
  const { data: allRecords, isLoading, error: recordsError } = useQuery<PatientRecord[]>({
    queryKey: ['/api/records/created-by-me'], // Use the correct query key
    queryFn: async () => {
      const res = await api.get('/records/created-by-me'); // Fetch from doctor's endpoint
      return res.data;
    },
  });

  // --- Filter Records based on URL param and search query ---
  const filteredRecords = useMemo(() => {
    if (!allRecords) return [];

    let recordsByType = allRecords;
    // Apply type filter if present in URL
    if (filterType) {
        recordsByType = allRecords.filter(record => record.recordType === filterType);
    }

    // Apply search query filter
    const lowerSearch = searchQuery.toLowerCase();
    if (!lowerSearch) return recordsByType; // No search term, return type-filtered list

    return recordsByType.filter((record) => {
      const titleMatch = record.title?.toLowerCase().includes(lowerSearch);
      const typeMatch = record.recordType?.toLowerCase().includes(lowerSearch);
      const diagnosisMatch = record.recordType === 'prescription' && record.diagnosis?.toLowerCase().includes(lowerSearch);
      const patientIdMatch = record.patientId?.toLowerCase().includes(lowerSearch); // Allow searching by patient ID
      return titleMatch || typeMatch || diagnosisMatch || patientIdMatch;
    });
  }, [allRecords, filterType, searchQuery]); // Recalculate when data, filter, or search changes

  // Determine the title based on the filter
  const pageTitle = filterType ? `${formatRecordType(filterType)} Records Created` : "All Records Created";
  const pageDescription = filterType ? `A list of ${filterType.replace('_', ' ')} records you have created.` : "A list of all records you have created.";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{pageTitle}</h1>
            <p className="text-muted-foreground mt-2">{pageDescription}</p>
          </div>
           {/* Optional: Add a "Create Record" button here if needed */}
           {/* <Button onClick={() => setLocation('/records/create')}><Plus className="mr-2 h-4 w-4"/> Create Record</Button> */}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title, type, diagnosis, or patient ID..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-records"
            />
          </div>
           {/* Optional: Add dropdown to filter by type if filterType is not in URL */}
           {!filterType && (
              <Select /* ... control to select recordType filter ... */ />
           )}
        </div>

        {/* Records List/Table */}
        <Card>
          <CardHeader>
            {/* Can remove CardHeader if title/desc is already above */}
            {/* <CardTitle>{pageTitle}</CardTitle> */}
            {/* <CardDescription>{pageDescription}</CardDescription> */}
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2"> {/* Skeletons */}
                 <Skeleton className="h-10 w-full" />
                 <Skeleton className="h-12 w-full" />
                 <Skeleton className="h-12 w-full" />
              </div>
            ) : recordsError ? (
              <div className="text-center py-16 text-destructive"> {/* Error Display */}
                 <AlertCircle className="w-12 h-12 mx-auto mb-3"/>
                 <p>Could not load records.</p>
                 <p className='text-sm text-muted-foreground'>{recordsError.message}</p>
              </div>
            ) : filteredRecords.length === 0 ? (
              // Empty State
              <div className="text-center py-16">
                <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No records found</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {searchQuery
                    ? 'Try adjusting your search term.'
                    : filterType
                    ? `You haven't created any ${filterType.replace('_', ' ')} records yet.`
                    : 'You haven\'t created any records yet.'}
                </p>
                 {/* Optional: Button to clear filters or create record */}
                 {searchQuery && <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>Clear Search</Button>}
              </div>
            ) : (
              // Data Table
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title / Diagnosis</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Patient ID</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Verified</TableHead>
                    {/* <TableHead className="text-right">Actions</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id} data-testid={`record-row-${record.id}`}>
                      <TableCell className="font-medium max-w-[200px] truncate" title={record.recordType === 'prescription' ? (record.diagnosis || record.title) : record.title}>
                        {record.recordType === 'prescription' ? (record.diagnosis || record.title) : record.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                           {formatRecordType(record.recordType)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs truncate max-w-[150px]" title={record.patientId}>
                         <Link href={`/patient/${record.patientId}/records`} className="hover:underline">{record.patientId}</Link>
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
                          {record.blockchainTxId ? ( <Shield className="w-4 h-4 text-green-600" title="Verified"/> ) : ( <Shield className="w-4 h-4 text-muted-foreground/50" title="Not Verified"/> )}
                       </TableCell>
                      {/* <TableCell className="text-right">
                        <Button variant="ghost" size="sm">View</Button>
                      </TableCell> */}
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
