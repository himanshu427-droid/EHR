import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileStack, Upload, CheckCircle, Clock, Activity } from 'lucide-react';
import { useLocation } from 'wouter';
import type { LabReport } from '@shared/schema';

export default function LabDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: labReports, isLoading } = useQuery<LabReport[]>({
    queryKey: ['/api/lab/my-reports'],
  });

  const stats = [
    {
      title: 'Total Reports',
      value: labReports?.length || 0,
      icon: FileStack,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Pending',
      value: labReports?.filter((r) => r.status === 'pending').length || 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
    },
    {
      title: 'Completed',
      value: labReports?.filter((r) => r.status === 'completed').length || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
  ];

  const pendingReports = labReports?.filter((r) => r.status === 'pending').slice(0, 5) || [];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lab Dashboard</h1>
          <p className="text-muted-foreground mt-2">{user?.username && (user as any).organization || 'Diagnostic Center'}</p>
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
                <CardTitle>Pending Reports</CardTitle>
                <CardDescription>Reports awaiting upload or completion</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setLocation('/lab-reports')}
                data-testid="button-view-all-reports"
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
              ) : pendingReports.length === 0 ? (
                <div className="text-center py-12">
                  <FileStack className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No pending reports</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    All reports are up to date
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => setLocation('/lab-reports')}
                      data-testid={`report-${report.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{report.testType}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.createdAt).toLocaleDateString()}
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
              <CardDescription>Manage lab reports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/lab-reports')}
                data-testid="button-upload-report"
              >
                <Upload className="w-4 h-4" />
                Upload Lab Report
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/lab-reports')}
                data-testid="button-view-reports"
              >
                <FileStack className="w-4 h-4" />
                View All Reports
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
            <CardTitle>Recent Completed Reports</CardTitle>
            <CardDescription>Your recently completed and verified reports</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : labReports?.filter((r) => r.status === 'completed').length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">No completed reports</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Completed reports will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {labReports
                  ?.filter((r) => r.status === 'completed')
                  .slice(0, 5)
                  .map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between p-3 rounded-md border"
                      data-testid={`completed-report-${report.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">{report.testType}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(report.updatedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-success text-white">Completed</Badge>
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
