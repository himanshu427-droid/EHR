import { createHash, randomBytes } from 'crypto';

// Blockchain simulation for Replit environment
// In production with Fabric, this would use fabric-network SDK

export interface BlockchainTransaction {
  txId: string;
  timestamp: Date;
  operation: string;
  data: any;
  dataHash: string;
}

export class BlockchainService {
  private transactions: Map<string, BlockchainTransaction> = new Map();

  /**
   * Submit a transaction to the blockchain
   * In production: calls Fabric chaincode
   */
  async submitTransaction(operation: string, data: any): Promise<string> {
    const txId = this.generateTransactionId();
    const dataHash = this.hashData(data);
    
    const transaction: BlockchainTransaction = {
      txId,
      timestamp: new Date(),
      operation,
      data,
      dataHash,
    };

    this.transactions.set(txId, transaction);
    
    // Simulate blockchain delay
    await this.delay(100);
    
    return txId;
  }

  /**
   * Add a health record to the blockchain
   */
  async addRecord(patientId: string, recordHash: string, doctorId?: string): Promise<string> {
    return await this.submitTransaction('addRecord', {
      patientId,
      recordHash,
      doctorId,
    });
  }

  /**
   * Get record history from blockchain
   */
  async getRecordHistory(patientId: string): Promise<BlockchainTransaction[]> {
    return Array.from(this.transactions.values())
      .filter((tx) => tx.data.patientId === patientId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Grant access permission on blockchain
   */
  async grantAccess(patientId: string, entityId: string, permissions: string[]): Promise<string> {
    return await this.submitTransaction('grantAccess', {
      patientId,
      entityId,
      permissions,
    });
  }

  /**
   * Revoke access permission on blockchain
   */
  async revokeAccess(patientId: string, entityId: string): Promise<string> {
    return await this.submitTransaction('revokeAccess', {
      patientId,
      entityId,
    });
  }

  /**
   * Verify data integrity
   */
  async verifyDataHash(txId: string, data: any): Promise<boolean> {
    const transaction = this.transactions.get(txId);
    if (!transaction) return false;
    
    const currentHash = this.hashData(data);
    return currentHash === transaction.dataHash;
  }

  /**
   * Hash data using SHA-256
   */
  hashData(data: any): string {
    const jsonString = JSON.stringify(data);
    return createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Generate a unique transaction ID
   */
  private generateTransactionId(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = randomBytes(16).toString('hex');
    return `${timestamp}-${randomPart}`;
  }

  /**
   * Simulate async delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get all transactions (for audit log)
   */
  getAllTransactions(): BlockchainTransaction[] {
    return Array.from(this.transactions.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get transaction by ID
   */
  getTransaction(txId: string): BlockchainTransaction | undefined {
    return this.transactions.get(txId);
  }
}

export const blockchainService = new BlockchainService();
