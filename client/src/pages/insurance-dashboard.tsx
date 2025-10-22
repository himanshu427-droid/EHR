import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, DollarSign, CheckCircle, XCircle, Clock, Activity } from 'lucide-react';
import { useLocation } from 'wouter';
import type { InsuranceClaim } from '@shared/schema';

export default function InsuranceDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: claims, isLoading } = useQuery<InsuranceClaim[]>({
    queryKey: ['/api/insurance/claims'],
  });

  const stats = [
    {
      title: 'Total Claims',
      value: claims?.length || 0,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Pending Review',
      value: claims?.filter((c) => c.status === 'pending').length || 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Approved',
      value: claims?.filter((c) => c.status === 'approved').length || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
  ];

  const pendingClaims = claims?.filter((c) => c.status === 'pending').slice(0, 5) || [];

  const totalClaimAmount = claims
    ?.filter((c) => c.status === 'approved')
    .reduce((sum, c) => sum + parseFloat(c.claimAmount), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Insurance Portal</h1>
          <p className="text-muted-foreground mt-2">
            {user?.username && (user as any).organization || 'Insurance Company'}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                  <div className={`${stat.bg} p-2 rounded-md`}>
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
              <div className="bg-green-50 dark:bg-green-950/30 p-2 rounded-md">
                <DollarSign className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalClaimAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
              <div>
                <CardTitle>Pending Claims</CardTitle>
                <CardDescription>Claims awaiting review</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setLocation('/claims')}
                data-testid="button-view-all-claims"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : pendingClaims.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No pending claims</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All claims have been reviewed
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingClaims.map((claim) => (
                    <div
                      key={claim.id}
                      className="flex items-center justify-between p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => setLocation('/claims')}
                      data-testid={`claim-${claim.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{claim.diagnosis}</p>
                        <p className="text-xs text-muted-foreground">
                          ${parseFloat(claim.claimAmount).toLocaleString()} • {new Date(claim.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="bg-warning text-white ml-2">
                        Pending
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Claims management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/claims')}
                data-testid="button-review-claims"
              >
                <FileText className="w-4 h-4" />
                Review Claims
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/claims')}
                data-testid="button-approved-claims"
              >
                <CheckCircle className="w-4 h-4" />
                View Approved Claims
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/blockchain')}
                data-testid="button-verify-blockchain"
              >
                <Activity className="w-4 h-4" />
                Verify on Blockchain
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Claim Decisions</CardTitle>
            <CardDescription>Your latest claim reviews</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : claims?.filter((c) => c.status !== 'pending').length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No reviewed claims</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Claim decisions will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {claims
                  ?.filter((c) => c.status !== 'pending')
                  .slice(0, 5)
                  .map((claim) => (
                    <div
                      key={claim.id}
                      className="flex items-center justify-between p-3 rounded-md border"
                      data-testid={`reviewed-claim-${claim.id}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{claim.diagnosis}</p>
                          <p className="text-xs text-muted-foreground">
                            ${parseFloat(claim.claimAmount).toLocaleString()} • {claim.reviewedAt && new Date(claim.reviewedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={
                          claim.status === 'approved'
                            ? 'bg-success text-white'
                            : 'bg-destructive text-white'
                        }
                      >
                        {claim.status}
                      </Badge>
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
