import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Download, Shield, Search, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Record } from '@shared/schema';

export default function Records() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    recordType: '',
  });

  const { data: records, isLoading } = useQuery<Record[]>({
    queryKey: ['/api/records/my-records'],
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest('POST', '/api/records/upload', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/records/my-records'] });
      toast({
        title: 'Record uploaded',
        description: 'Your health record has been securely stored on the blockchain.',
      });
      setIsDialogOpen(false);
      setFormData({ title: '', description: '', recordType: '' });
      setSelectedFile(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Upload failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleUpload = () => {
    if (!formData.title || !formData.recordType) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const data = new FormData();
    data.append('title', formData.title);
    data.append('description', formData.description);
    data.append('recordType', formData.recordType);
    data.append('patientId', user?.userId || '');
    if (selectedFile) {
      data.append('file', selectedFile);
    }

    uploadMutation.mutate(data);
  };

  const filteredRecords = records?.filter((record) =>
    record.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    record.recordType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Health Records</h1>
            <p className="text-muted-foreground mt-2">Manage your medical records on the blockchain</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-add-record">
                <Plus className="w-4 h-4" />
                Add Record
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Health Record</DialogTitle>
                <DialogDescription>
                  Add a new medical record to the blockchain
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Annual Checkup 2024"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    data-testid="input-record-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="recordType">Type *</Label>
                  <Select
                    value={formData.recordType}
                    onValueChange={(value) => setFormData({ ...formData, recordType: value })}
                  >
                    <SelectTrigger data-testid="select-record-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="diagnosis">Diagnosis</SelectItem>
                      <SelectItem value="prescription">Prescription</SelectItem>
                      <SelectItem value="lab_report">Lab Report</SelectItem>
                      <SelectItem value="vaccination">Vaccination</SelectItem>
                      <SelectItem value="imaging">Imaging</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Additional details..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    data-testid="input-record-description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="file">File (optional)</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    data-testid="input-record-file"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleUpload}
                  disabled={uploadMutation.isPending}
                  data-testid="button-upload-record"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload to Blockchain'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search records..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-records"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : filteredRecords?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-16">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No records found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery ? 'Try a different search term' : 'Upload your first health record'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-record">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Record
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredRecords?.map((record) => (
              <Card key={record.id} className="hover-elevate" data-testid={`record-card-${record.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{record.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {record.description}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="shrink-0">
                      {record.recordType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                    </div>
                    {record.blockchainTxId && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Shield className="w-4 h-4 text-success" />
                        <span className="text-success">Blockchain Verified</span>
                      </div>
                    )}
                  </div>
                  {record.blockchainTxId && (
                    <div className="p-3 rounded-md bg-muted/50 font-mono text-xs break-all">
                      <span className="text-muted-foreground">TX:</span> {record.blockchainTxId.substring(0, 64)}...
                    </div>
                  )}
                  <div className="flex gap-2">
                    {record.filePath && (
                      <Button size="sm" variant="outline" className="gap-2" data-testid={`button-download-${record.id}`}>
                        <Download className="w-4 h-4" />
                        Download
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="gap-2" data-testid={`button-view-blockchain-${record.id}`}>
                      <Shield className="w-4 h-4" />
                      View on Blockchain
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
