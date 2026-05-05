// root/shared/schema.ts
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
// Import the table definitions from your new server file
import {
  users,
  records,
  labReports,
  insuranceClaims,
  accessControl,
  blockchainAudit,
  UserRole, // Also import the UserRole enum
} from "../server/db/schema"; // <-- Adjust path if needed

// === EXPORT THE ENUM ===
export { UserRole };
export type { UserRoleType } from "../server/db/schema"; // <-- Adjust path

// === INSERT SCHEMAS (for Zod) ===
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertRecordSchema = createInsertSchema(records, {
    // Define specific Zod types for JSON columns if desired for stricter validation
    medications: z.array(z.object({
        name: z.string().min(1),
        dosage: z.string().min(1),
        frequency: z.string().min(1),
        duration: z.string().min(1),
    })).optional().nullable(), // Make optional and nullable
    diagnosis: z.string().optional().nullable(), // Make optional and nullable
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});


export const insertLabReportSchema = createInsertSchema(labReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInsuranceClaimSchema = createInsertSchema(insuranceClaims).omit({
  id: true,
  createdAt: true,
});

export const insertAccessControlSchema = createInsertSchema(accessControl).omit({
  id: true,
  grantedAt: true,
});

export const insertBlockchainAuditSchema = createInsertSchema(blockchainAudit).omit({
  id: true,
  timestamp: true,
});

// === TYPES (Inferred from tables) ===
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertRecord = z.infer<typeof insertRecordSchema>;
export type Record = typeof records.$inferSelect;


export type InsertLabReport = z.infer<typeof insertLabReportSchema>;
export type LabReport = typeof labReports.$inferSelect;

export type InsertInsuranceClaim = z.infer<typeof insertInsuranceClaimSchema>;
export type InsuranceClaim = typeof insuranceClaims.$inferSelect;

export type InsertAccessControl = z.infer<typeof insertAccessControlSchema>;
export type AccessControl = typeof accessControl.$inferSelect;

export type InsertBlockchainAudit = z.infer<typeof insertBlockchainAuditSchema>;
export type BlockchainAudit = typeof blockchainAudit.$inferSelect;

// === API VALIDATION SCHEMAS ===
export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;