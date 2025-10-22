import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Shield, Plus, UserCheck, UserX, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { AccessControl } from '@shared/schema';

export default function Consent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState<AccessControl | null>(null);
  const [formData, setFormData] = useState({
    entityId: '',
    entityType: '',
    permissions: [] as string[],
  });

  const { data: accessControls, isLoading } = useQuery<AccessControl[]>({
    queryKey: ['/api/access-control/granted'],
  });

  const grantMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiRequest('POST', '/api/access-control/grant', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/access-control/granted'] });
      toast({
        title: 'Access granted',
        description: 'Permission has been recorded on the blockchain.',
      });
      setIsDialogOpen(false);
      setFormData({ entityId: '', entityType: '', permissions: [] });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to grant access',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', '/api/access-control/revoke', { id });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/access-control/granted'] });
      toast({
        title: 'Access revoked',
        description: 'Permission has been revoked on the blockchain.',
      });
      setRevokeDialogOpen(false);
      setSelectedAccess(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to revoke access',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleGrant = () => {
    if (!formData.entityId || !formData.entityType || formData.permissions.length === 0) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    grantMutation.mutate({
      ...formData,
      patientId: user?.userId || '',
    });
  };

  const handleRevoke = () => {
    if (selectedAccess) {
      revokeMutation.mutate(selectedAccess.id);
    }
  };

  const togglePermission = (permission: string) => {
    setFormData((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter((p) => p !== permission)
        : [...prev.permissions, permission],
    }));
  };

  const activeAccess = accessControls?.filter((a) => a.status === 'active') || [];
  const revokedAccess = accessControls?.filter((a) => a.status === 'revoked') || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Consent Management</h1>
            <p className="text-muted-foreground mt-2">Control who can access your health records</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-grant-access">
                <Plus className="w-4 h-4" />
                Grant Access
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Grant Data Access</DialogTitle>
                <DialogDescription>
                  Allow a healthcare provider or organization to access your records
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="entityType">Entity Type *</Label>
                  <Select
                    value={formData.entityType}
                    onValueChange={(value) => setFormData({ ...formData, entityType: value })}
                  >
                    <SelectTrigger data-testid="select-entity-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="doctor">Doctor</SelectItem>
                      <SelectItem value="lab">Laboratory</SelectItem>
                      <SelectItem value="insurance">Insurance Company</SelectItem>
                      <SelectItem value="researcher">Researcher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entityId">Entity ID/Username *</Label>
                  <Input
                    id="entityId"
                    placeholder="Enter username or ID"
                    value={formData.entityId}
                    onChange={(e) => setFormData({ ...formData, entityId: e.target.value })}
                    data-testid="input-entity-id"
                  />
                </div>
                <div className="space-y-3">
                  <Label>Permissions *</Label>
                  <div className="space-y-2">
                    {['view_records', 'view_prescriptions', 'view_lab_reports'].map((permission) => (
                      <div key={permission} className="flex items-center justify-between p-3 rounded-md border">
                        <Label htmlFor={permission} className="cursor-pointer capitalize">
                          {permission.replace(/_/g, ' ')}
                        </Label>
                        <Switch
                          id={permission}
                          checked={formData.permissions.includes(permission)}
                          onCheckedChange={() => togglePermission(permission)}
                          data-testid={`switch-${permission}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  className="w-full"
                  onClick={handleGrant}
                  disabled={grantMutation.isPending}
                  data-testid="button-confirm-grant"
                >
                  {grantMutation.isPending ? 'Granting...' : 'Grant Access'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Permissions</CardTitle>
            <CardDescription>Entities with current access to your data</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : activeAccess.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">No active consents</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  You haven't granted access to anyone yet
                </p>
                <Button onClick={() => setIsDialogOpen(true)} data-testid="button-grant-first-access">
                  <Plus className="w-4 h-4 mr-2" />
                  Grant Your First Access
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeAccess.map((access) => (
                  <Card key={access.id} data-testid={`access-card-${access.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-3">
                          <div className="flex items-center gap-3">
                            <UserCheck className="w-5 h-5 text-success" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium">Entity ID: {access.entityId}</p>
                              <p className="text-sm text-muted-foreground capitalize">
                                {access.entityType}
                              </p>
                            </div>
                            <Badge className="bg-success text-white shrink-0">Active</Badge>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(access.permissions as string[]).map((permission) => (
                              <Badge key={permission} variant="secondary" className="text-xs">
                                {permission.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-xs text-muted-foreground">
                              Granted {new Date(access.grantedAt).toLocaleDateString()}
                            </span>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedAccess(access);
                                setRevokeDialogOpen(true);
                              }}
                              data-testid={`button-revoke-${access.id}`}
                            >
                              Revoke Access
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {revokedAccess.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Revoked Permissions</CardTitle>
              <CardDescription>Previously granted access that has been revoked</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {revokedAccess.map((access) => (
                  <div
                    key={access.id}
                    className="flex items-center justify-between p-3 rounded-md border opacity-60"
                    data-testid={`revoked-access-${access.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <UserX className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Entity ID: {access.entityId}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {access.entityType} • Revoked {access.revokedAt && new Date(access.revokedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Revoked</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Revoke Access</DialogTitle>
              <DialogDescription>
                Are you sure you want to revoke this access permission?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="flex items-start gap-3 p-4 rounded-md bg-destructive/10 border border-destructive/20">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">This action will be recorded on the blockchain</p>
                  <p className="text-xs text-muted-foreground">
                    The entity will immediately lose access to your health records
                  </p>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRevokeDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleRevoke}
                disabled={revokeMutation.isPending}
                data-testid="button-confirm-revoke"
              >
                {revokeMutation.isPending ? 'Revoking...' : 'Revoke Access'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
