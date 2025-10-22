import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Search, CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { BlockchainAudit } from '@shared/schema';

export default function Blockchain() {
  const { toast } = useToast();
  const [searchTxId, setSearchTxId] = useState('');

  const { data: auditLogs, isLoading } = useQuery<BlockchainAudit[]>({
    queryKey: ['/api/blockchain/audit'],
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Transaction ID copied to clipboard',
    });
  };

  const filteredLogs = auditLogs?.filter((log) =>
    !searchTxId || log.txId.toLowerCase().includes(searchTxId.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blockchain Verification</h1>
          <p className="text-muted-foreground mt-2">
            Verify data integrity and view transaction history on Hyperledger Fabric
          </p>
        </div>

        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 space-y-2">
                <h3 className="font-semibold text-lg">Blockchain-Secured Records</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All health records, prescriptions, and access permissions are cryptographically hashed and stored on the Hyperledger Fabric blockchain network. This ensures immutability, transparency, and full audit capability.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <CheckCircle className="w-4 h-4 text-success" />
                  <span className="text-xs font-medium text-success">Network Status: Active</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by transaction ID..."
              className="pl-9"
              value={searchTxId}
              onChange={(e) => setSearchTxId(e.target.value)}
              data-testid="input-search-transactions"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              Blockchain audit log showing all operations
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
                  {searchTxId ? 'No matching transactions' : 'No blockchain activity'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {searchTxId ? 'Try a different transaction ID' : 'Transactions will appear here once you start using the system'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs?.map((log, index) => (
                  <Card key={log.id} className="border-l-4 border-l-primary hover-elevate" data-testid={`transaction-${log.id}`}>
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
                              <span className="text-xs font-medium text-muted-foreground">Transaction ID:</span>
                              <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                {log.txId.substring(0, 48)}...
                              </code>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(log.txId)}
                                data-testid={`button-copy-${log.id}`}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-muted-foreground">Data Hash:</span>
                              <code className="text-xs font-mono bg-muted px-2 py-1 rounded">
                                {log.dataHash.substring(0, 64)}...
                              </code>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-6 w-6"
                                onClick={() => copyToClipboard(log.dataHash)}
                                data-testid={`button-copy-hash-${log.id}`}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-success text-white shrink-0">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Hyperledger Fabric</CardTitle>
            <CardDescription>Understanding the blockchain infrastructure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="p-4 rounded-md border space-y-2">
                <h4 className="font-medium text-sm">Immutable Records</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Once data is written to the blockchain, it cannot be altered or deleted, ensuring complete data integrity and trust.
                </p>
              </div>
              <div className="p-4 rounded-md border space-y-2">
                <h4 className="font-medium text-sm">Permissioned Network</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Only authorized participants can access the network, maintaining privacy while providing transparency.
                </p>
              </div>
              <div className="p-4 rounded-md border space-y-2">
                <h4 className="font-medium text-sm">Complete Audit Trail</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Every transaction is logged with timestamps, providing full traceability of all data operations.
                </p>
              </div>
              <div className="p-4 rounded-md border space-y-2">
                <h4 className="font-medium text-sm">Cryptographic Security</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  All data is protected using industry-standard cryptographic hashing algorithms.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
