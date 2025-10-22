import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { FileStack, Database, TrendingUp, Activity, Download } from 'lucide-react';
import { useLocation } from 'wouter';
import type { Record } from '@shared/schema';

export default function ResearcherDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: datasets, isLoading } = useQuery<Record[]>({
    queryKey: ['/api/researcher/datasets'],
  });

  const recordsByType = datasets?.reduce((acc, record) => {
    acc[record.recordType] = (acc[record.recordType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const stats = [
    {
      title: 'Total Records',
      value: datasets?.length || 0,
      icon: Database,
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      title: 'Data Types',
      value: Object.keys(recordsByType || {}).length,
      icon: FileStack,
      color: 'text-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      title: 'Anonymized',
      value: datasets?.length || 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bg: 'bg-green-50 dark:bg-green-950/30',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Research Portal</h1>
          <p className="text-muted-foreground mt-2">
            {user?.username && (user as any).organization || 'Research Institution'}
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
                <CardTitle>Available Datasets</CardTitle>
                <CardDescription>Anonymized medical data for research</CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setLocation('/datasets')}
                data-testid="button-view-datasets"
              >
                View All
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : Object.keys(recordsByType || {}).length === 0 ? (
                <div className="text-center py-12">
                  <Database className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No datasets available</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Request access to research datasets
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(recordsByType || {}).map(([type, count]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between p-3 rounded-md border hover-elevate active-elevate-2 cursor-pointer"
                      onClick={() => setLocation('/datasets')}
                      data-testid={`dataset-${type}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="capitalize">
                          {type}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {count} records
                        </span>
                      </div>
                      <Button size="sm" variant="ghost">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Research tools and analytics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/datasets')}
                data-testid="button-browse-data"
              >
                <Database className="w-4 h-4" />
                Browse Datasets
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/datasets')}
                data-testid="button-analytics"
              >
                <TrendingUp className="w-4 h-4" />
                View Analytics
              </Button>
              <Button
                className="w-full justify-start gap-2"
                variant="outline"
                onClick={() => setLocation('/blockchain')}
                data-testid="button-verify-provenance"
              >
                <Activity className="w-4 h-4" />
                Verify Data Provenance
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Research Compliance</CardTitle>
            <CardDescription>Data usage guidelines and ethics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-md bg-muted/50 space-y-2">
              <h4 className="font-medium text-sm">Data Privacy Notice</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                All datasets are fully anonymized and de-identified in accordance with healthcare data protection regulations. Patient identities are protected through cryptographic hashing on the blockchain.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-2 p-3 rounded-md border">
                <div className="w-2 h-2 rounded-full bg-success mt-1.5" />
                <div>
                  <p className="text-sm font-medium">HIPAA Compliant</p>
                  <p className="text-xs text-muted-foreground">
                    All data handling follows HIPAA guidelines
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 rounded-md border">
                <div className="w-2 h-2 rounded-full bg-success mt-1.5" />
                <div>
                  <p className="text-sm font-medium">IRB Approved</p>
                  <p className="text-xs text-muted-foreground">
                    Institutional Review Board certified
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
