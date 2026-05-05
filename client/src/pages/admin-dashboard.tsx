import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Activity, FileText, Shield, UserPlus } from 'lucide-react';
import { useLocation } from 'wouter';
import type { User as UserType, BlockchainAudit } from '@shared/schema';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: users, isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ['/api/admin/users'],
  });

  const { data: auditLogs, isLoading: auditLoading } = useQuery<BlockchainAudit[]>({
    queryKey: ['/api/blockchain/audit'],
  });

  const roleGroups = users?.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    {
      title: 'Total Users',
      value: users?.length || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Patients',
      value: roleGroups?.patient || 0,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      title: 'Healthcare Providers',
      value: (roleGroups?.doctor || 0) + (roleGroups?.lab || 0),
      icon: Activity,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
  ];

  const recentAuditLogs = auditLogs?.slice(0, 10) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Hospital Administration</h1>
          <p className="text-muted-foreground mt-2">
            {user?.username && (user as any).organization || 'Healthcare Network'}
          </p>
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
                <CardTitle>User Distribution</CardTitle>
                <CardDescription>Users by role</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setLocation('/manage-users')}
                data-testid="button-manage-users"
              >
                Manage
              </Button>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(roleGroups || {}).map(([role, count]) => (
                    <div
                      key={role}
                      className="flex items-center justify-between p-3 rounded-md border"
                      data-testid={`role-${role}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="capitalize">
                          {role.replace('_', ' ')}
                        </Badge>
                      </div>
                      <span className="text-lg font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/manage-users')}
                data-testid="button-view-users"
              >
                <Users className="w-4 h-4" />
                Manage Users
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/blockchain-audit')}
                data-testid="button-view-audit"
              >
                <Activity className="w-4 h-4" />
                Blockchain Audit Log
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/blockchain')}
                data-testid="button-verify-integrity"
              >
                <Shield className="w-4 h-4" />
                Verify Data Integrity
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Blockchain Activity</CardTitle>
            <CardDescription>Latest transactions on the blockchain</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recentAuditLogs.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No blockchain activity</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Transaction logs will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-md border text-sm"
                    data-testid={`audit-${log.id}`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Badge variant="secondary" className="shrink-0">
                        {log.operation}
                      </Badge>
                      <code className="text-xs font-mono text-muted-foreground truncate">
                        {log.txId.substring(0, 16)}...
                      </code>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
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
