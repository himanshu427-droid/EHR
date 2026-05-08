import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Search, CheckCircle, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AuditLog } from '@shared/schema';

export default function Activity() {
  const { toast } = useToast();
  const [searchValue, setSearchValue] = useState('');

  const { data: auditLogs, isLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/audit/logs'],
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const filteredLogs = auditLogs?.filter((log) =>
    !searchValue ||
    log.txId.toLowerCase().includes(searchValue.toLowerCase()) ||
    log.operation.toLowerCase().includes(searchValue.toLowerCase()) ||
    log.entityType.toLowerCase().includes(searchValue.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Activity</h1>
          <p className="text-muted-foreground mt-2">
            Review recent application events and integrity hashes.
          </p>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">Application Audit Trail</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Records, claims, access changes, and registrations are tracked with event IDs
                  and content hashes so administrators can review operational history.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-xs font-medium text-success">
                    Integrity logging is active
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by event ID, action, or entity..."
              className="pl-9"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              data-testid="input-search-audit-logs"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Audit History</CardTitle>
            <CardDescription>
              Application event log for administrative review
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : filteredLogs?.length === 0 ? (
              <div className="text-center py-16">
                <Shield className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchValue ? 'No matching audit events' : 'No audit activity yet'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchValue
                    ? 'Try a different search term.'
                    : 'Activity will appear here once users start using the system.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(filteredLogs ?? []).map((log) => (
                  <Card key={log.id} className="border-l-4 border-l-primary hover-elevate" data-testid={`audit-log-${log.id}`}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Badge variant="secondary" className="capitalize">
                              {log.operation.replace(/_/g, ' ')}
                            </Badge>
                            <Badge variant="outline" className="capitalize">
                              {log.entityType}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Event ID:</span>
                              <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                {log.txId.substring(0, 48)}...
                              </code>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(log.txId, 'Event ID')}
                                data-testid={`button-copy-event-${log.id}`}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Data hash:</span>
                              <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                {log.dataHash.substring(0, 64)}...
                              </code>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(log.dataHash, 'Data hash')}
                                data-testid={`button-copy-hash-${log.id}`}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-success text-white shrink-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Logged
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
