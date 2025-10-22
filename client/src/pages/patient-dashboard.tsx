import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileText, Shield, Users, Activity, Plus } from 'lucide-react';
import { useLocation } from 'wouter';
import type { Record, AccessControl } from '@shared/schema';

export default function PatientDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: records, isLoading: recordsLoading } = useQuery<Record[]>({
    queryKey: ['/api/records/my-records'],
  });

  const { data: accessControls, isLoading: accessLoading } = useQuery<AccessControl[]>({
    queryKey: ['/api/access-control/granted'],
  });

  const stats = [
    {
      title: 'Total Records',
      value: records?.length || 0,
      icon: FileText,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Active Consents',
      value: accessControls?.filter((a) => a.status === 'active').length || 0,
      icon: Shield,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      title: 'Shared With',
      value: new Set(accessControls?.filter((a) => a.status === 'active').map((a) => a.entityId)).size || 0,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
    },
  ];

  const recentRecords = records?.slice(0, 5) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome, {user?.fullName}</h1>
          <p className="text-muted-foreground mt-2">Manage your health records securely on the blockchain</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
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
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-4">
              <div>
                <CardTitle>Recent Health Records</CardTitle>
                <CardDescription>Your latest medical records</CardDescription>
              </div>
              <Button size="sm" onClick={() => setLocation('/records')} data-testid="button-view-all-records">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : recentRecords.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No records yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your health records will appear here
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => setLocation('/records')}
                      data-testid={`record-${record.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{record.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(record.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {record.recordType}
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
              <CardDescription>Manage your health data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/records')}
                data-testid="button-view-records"
              >
                <FileText className="w-4 h-4" />
                View All Records
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/consent')}
                data-testid="button-manage-consent"
              >
                <Shield className="w-4 h-4" />
                Manage Consent
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
            <CardTitle>Data Access Permissions</CardTitle>
            <CardDescription>Who can access your health records</CardDescription>
          </CardHeader>
          <CardContent>
            {accessLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : accessControls?.filter((a) => a.status === 'active').length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No active consents</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Grant access to doctors or insurance companies
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => setLocation('/consent')}
                  data-testid="button-grant-access"
                >
                  Grant Access
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {accessControls
                  ?.filter((a) => a.status === 'active')
                  .map((access) => (
                    <div
                      key={access.id}
                      className="flex items-center justify-between p-3 rounded-md border"
                      data-testid={`access-${access.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary">{access.entityType}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Granted {new Date(access.grantedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge className="bg-success text-white">Active</Badge>
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
