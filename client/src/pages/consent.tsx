import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MailCheck, Check, AlertCircle, X , Users} from 'lucide-react'; // Added X for revoke
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
// Import the type, not the value, from shared schema
import type { AccessControl, UserRoleType } from '@shared/schema';

// --- DEFINE THE INTERFACE FOR PENDING REQUESTS ---
interface PendingRequest {
  accessId: string;
  entity: {
    id: string;
    fullName: string;
    organization: string | null;
    specialty: string | null;
    role: UserRoleType; // <-- Use the UserRoleType here
  };
  permissions: string[]; // Assuming permissions is string[] based on schema
  status: 'pending'; // Explicitly pending
}

// Helper function to handle fetch errors (assuming api.ts doesn't handle all errors)
// If your api.ts response interceptor handles errors well, you might not need this
// async function handleFetchErrors(response: Response) {
//   if (!response.ok) {
//     const errorData = await response.json();
//     throw new Error(errorData.message || 'An error occurred');
//   }
//   return response.json();
// }


export default function ConsentPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // --- QUERY FOR PENDING REQUESTS ---
  // Use the correctly defined PendingRequest interface
  const { data: pending, isLoading: pendingLoading } = useQuery<
    PendingRequest[] // <-- Ensure this uses the interface
  >({
    queryKey: ['/api/access/pending-requests'],
    queryFn: async () => {
      const res = await api.get('/access/pending-requests');
      return res.data; // Assuming axios handles JSON parsing
    },
  });

  // --- QUERY FOR GRANTED ACCESS ---
  // Assuming a similar structure for granted access, define an interface
   interface GrantedAccess extends AccessControl { // Extend base AccessControl
       entity: {
           id: string;
           fullName: string;
           role: UserRoleType;
           specialty: string | null;
           organization: string | null;
       } | null; // Entity might be null if user deleted?
   }

   const { data: granted, isLoading: grantedLoading } = useQuery<GrantedAccess[]>({
       queryKey: ['/api/access/granted'],
       queryFn: async () => {
           const res = await api.get('/access/granted');
           return res.data;
       }
   });

  // --- MUTATION TO APPROVE ACCESS ---
  const approveMutation = useMutation<AccessControl, Error, string>({
    mutationFn: async (accessId) => {
      const res = await api.post('/access/approve', { accessId });
      return res.data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Access Approved',
        description: `Access granted successfully.`,
      });
      // Invalidate both queries to update lists
      queryClient.invalidateQueries({
        queryKey: ['/api/access/pending-requests'],
      });
      queryClient.invalidateQueries({
        queryKey: ['/api/access/granted'],
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Approval Failed',
        description: error.message || 'Could not approve access.',
        variant: 'destructive',
      });
    },
  });

   // --- MUTATION TO REVOKE ACCESS ---
   const revokeMutation = useMutation<AccessControl, Error, string>({
       mutationFn: async (accessId) => {
           const res = await api.post('/access/revoke', { id: accessId }); // API uses 'id' field
           return res.data;
       },
       onSuccess: () => {
           toast({
               title: 'Access Revoked',
               description: 'Access has been successfully revoked.',
           });
           // Invalidate both queries
           queryClient.invalidateQueries({ queryKey: ['/api/access/pending-requests'] });
           queryClient.invalidateQueries({ queryKey: ['/api/access/granted'] });
       },
       onError: (error: Error) => {
           toast({
               title: 'Revoke Failed',
               description: error.message || 'Could not revoke access.',
               variant: 'destructive',
           });
       },
   });

  // --- HANDLERS ---
  const handleApprove = (accessId: string) => {
    console.log('Approving access id for: ',accessId );
    approveMutation.mutate(accessId);
  };

  const handleRevoke = (accessId: string) => {
       revokeMutation.mutate(accessId);
   };


  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Consent</h1>
          <p className="text-muted-foreground mt-2">
            Approve pending requests and manage existing access grants.
          </p>
        </div>

        {/* Pending Requests Section */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Access Requests</CardTitle>
            <CardDescription>
              Review requests from doctors, labs, or researchers to access your
              records.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingLoading ? (
              <div className="space-y-3">
                {[...Array(2)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : !pending || pending.length === 0 ? ( // Check for falsy or empty
              <div className="text-center py-12">
                <MailCheck className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No pending access requests.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* --- ADDED Array.isArray CHECK --- */}
                {Array.isArray(pending) ? (
                  pending.map((req) => (
                    <div
                      key={req.accessId}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-md border gap-3"
                      data-testid={`request-${req.accessId}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar>
                          <AvatarFallback>
                            {req.entity.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm truncate">
                            {req.entity.fullName}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {req.entity.role.replace('_', ' ')}
                            {req.entity.specialty &&
                              ` - ${req.entity.specialty}`}
                            {req.entity.organization &&
                              ` (${req.entity.organization})`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Permissions Requested:{' '}
                            <Badge variant="outline" className="ml-1">
                              {req.permissions.join(', ')}
                            </Badge>
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        {/* You might add a Deny/Reject button here */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevoke(req.accessId)} // Deny = Revoke a pending request
                          disabled={revokeMutation.isPending && revokeMutation.variables === req.accessId}
                          data-testid={`deny-${req.accessId}`}
                        >
                           {revokeMutation.isPending && revokeMutation.variables === req.accessId ? (
                             <div className="animate-spin w-4 h-4 mr-2" />
                           ) : (
                             <X className="w-4 h-4 mr-2" />
                           )}
                           Deny
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(req.accessId)}
                          disabled={
                            approveMutation.isPending &&
                            approveMutation.variables === req.accessId
                          }
                          data-testid={`approve-${req.accessId}`}
                        >
                          {approveMutation.isPending &&
                          approveMutation.variables === req.accessId ? (
                            <div className="animate-spin w-4 h-4 mr-2" />
                          ) : (
                            <Check className="w-4 h-4 mr-2" />
                          )}
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  // Fallback if data is not an array (shouldn't happen with correct API/types)
                  <div className="text-center py-12 text-destructive">
                    <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                    <p>Error: Could not load pending requests properly.</p>
                  </div>
                )}
                {/* --- END OF Array.isArray CHECK --- */}
              </div>
            )}
          </CardContent>
        </Card>

         {/* Granted Access Section */}
         <Card>
           <CardHeader>
             <CardTitle>Active Access Grants</CardTitle>
             <CardDescription>
               Entities you have currently granted access to your records.
             </CardDescription>
           </CardHeader>
           <CardContent>
             {grantedLoading ? (
               <div className="space-y-3">
                 {[...Array(2)].map((_, i) => (
                   <Skeleton key={i} className="h-20 w-full" />
                 ))}
               </div>
             ) : !granted || granted.length === 0 ? (
               <div className="text-center py-12">
                 <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                 <p className="text-sm text-muted-foreground">
                   You haven't granted access to anyone yet.
                 </p>
               </div>
             ) : (
               <div className="space-y-3">
                 {Array.isArray(granted) ? (
                   granted.filter(g => g.status === 'active').map((grant) => ( // Show only active grants
                     <div
                       key={grant.id}
                       className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-md border gap-3"
                       data-testid={`grant-${grant.id}`}
                     >
                       <div className="flex items-center gap-3 flex-1 min-w-0">
                         <Avatar>
                           <AvatarFallback>
                             {grant.entity?.fullName.charAt(0).toUpperCase() ?? '?'}
                           </AvatarFallback>
                         </Avatar>
                         <div>
                           <p className="font-medium text-sm truncate">
                             {grant.entity?.fullName ?? 'Unknown Entity'}
                           </p>
                           <p className="text-xs text-muted-foreground capitalize">
                             {grant.entity?.role?.replace('_', ' ') ?? grant.entityType}
                             {grant.entity?.specialty &&
                               ` - ${grant.entity.specialty}`}
                             {grant.entity?.organization &&
                               ` (${grant.entity.organization})`}
                           </p>
                           <p className="text-xs text-muted-foreground mt-1">
                             Permissions Granted:{' '}
                             <Badge variant="outline" className="ml-1">
                               {grant.permissions.join(', ')}
                             </Badge>
                           </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Granted On: {new Date(grant.grantedAt).toLocaleDateString()}
                            </p>
                         </div>
                       </div>
                       <Button
                         size="sm"
                         variant="destructive"
                         onClick={() => handleRevoke(grant.id)}
                         disabled={revokeMutation.isPending && revokeMutation.variables === grant.id}
                         data-testid={`revoke-${grant.id}`}
                       >
                         {revokeMutation.isPending && revokeMutation.variables === grant.id ? (
                           <div className="animate-spin w-4 h-4 mr-2" />
                         ) : (
                           <X className="w-4 h-4 mr-2" />
                         )}
                         Revoke Access
                       </Button>
                     </div>
                   ))
                 ) : (
                   <div className="text-center py-12 text-destructive">
                     <AlertCircle className="w-12 h-12 mx-auto mb-3" />
                     <p>Error: Could not load granted access properly.</p>
                   </div>
                 )}
               </div>
             )}
           </CardContent>
         </Card>

      </div>
    </DashboardLayout>
  );
}

