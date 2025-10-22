/*
 * SPDX-License-Identifier: Apache-2.0
 * 
 * EHR (Electronic Health Record) Smart Contract
 * 
 * This chaincode manages health records, access control, and audit logs
 * on Hyperledger Fabric blockchain
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class EHRContract extends Contract {

    /**
     * Initialize the ledger
     */
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    /**
     * Add a health record to the blockchain
     * @param {String} recordId - Unique record identifier
     * @param {String} patientId - Patient identifier
     * @param {String} recordHash - Hash of the record data
     * @param {String} doctorId - Doctor identifier (optional)
     * @param {String} metadata - Additional metadata as JSON string
     */
    async addRecord(ctx, recordId, patientId, recordHash, doctorId, metadata) {
        console.info('============= START : Add Record ===========');

        const record = {
            recordId,
            patientId,
            recordHash,
            doctorId: doctorId || null,
            metadata: metadata || '{}',
            timestamp: new Date().toISOString(),
            docType: 'record'
        };

        await ctx.stub.putState(recordId, Buffer.from(JSON.stringify(record)));
        console.info('============= END : Add Record ===========');
        
        return JSON.stringify(record);
    }

    /**
     * Get record history for a patient
     * @param {String} patientId - Patient identifier
     */
    async getRecordHistory(ctx, patientId) {
        console.info('============= START : Get Record History ===========');

        const queryString = {
            selector: {
                docType: 'record',
                patientId: patientId
            },
            sort: [{ timestamp: 'desc' }]
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const records = await this._getAllResults(iterator);

        console.info('============= END : Get Record History ===========');
        return JSON.stringify(records);
    }

    /**
     * Grant access permission
     * @param {String} accessId - Unique access control identifier
     * @param {String} patientId - Patient identifier
     * @param {String} entityId - Entity being granted access
     * @param {String} permissions - Permissions as JSON array string
     */
    async grantAccess(ctx, accessId, patientId, entityId, permissions) {
        console.info('============= START : Grant Access ===========');

        const accessControl = {
            accessId,
            patientId,
            entityId,
            permissions: permissions || '[]',
            status: 'active',
            grantedAt: new Date().toISOString(),
            docType: 'accessControl'
        };

        await ctx.stub.putState(accessId, Buffer.from(JSON.stringify(accessControl)));
        console.info('============= END : Grant Access ===========');
        
        return JSON.stringify(accessControl);
    }

    /**
     * Revoke access permission
     * @param {String} accessId - Access control identifier to revoke
     */
    async revokeAccess(ctx, accessId) {
        console.info('============= START : Revoke Access ===========');

        const accessBytes = await ctx.stub.getState(accessId);
        if (!accessBytes || accessBytes.length === 0) {
            throw new Error(`Access control ${accessId} does not exist`);
        }

        const access = JSON.parse(accessBytes.toString());
        access.status = 'revoked';
        access.revokedAt = new Date().toISOString();

        await ctx.stub.putState(accessId, Buffer.from(JSON.stringify(access)));
        console.info('============= END : Revoke Access ===========');
        
        return JSON.stringify(access);
    }

    /**
     * Query a record by ID
     * @param {String} recordId - Record identifier
     */
    async queryRecord(ctx, recordId) {
        const recordBytes = await ctx.stub.getState(recordId);
        if (!recordBytes || recordBytes.length === 0) {
            throw new Error(`Record ${recordId} does not exist`);
        }
        return recordBytes.toString();
    }

    /**
     * Get access controls for a patient
     * @param {String} patientId - Patient identifier
     */
    async getAccessControls(ctx, patientId) {
        console.info('============= START : Get Access Controls ===========');

        const queryString = {
            selector: {
                docType: 'accessControl',
                patientId: patientId
            }
        };

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(queryString));
        const accessControls = await this._getAllResults(iterator);

        console.info('============= END : Get Access Controls ===========');
        return JSON.stringify(accessControls);
    }

    /**
     * Verify data integrity
     * @param {String} recordId - Record identifier
     * @param {String} providedHash - Hash to verify against
     */
    async verifyDataIntegrity(ctx, recordId, providedHash) {
        const recordBytes = await ctx.stub.getState(recordId);
        if (!recordBytes || recordBytes.length === 0) {
            return JSON.stringify({ valid: false, message: 'Record not found' });
        }

        const record = JSON.parse(recordBytes.toString());
        const isValid = record.recordHash === providedHash;

        return JSON.stringify({
            valid: isValid,
            storedHash: record.recordHash,
            providedHash: providedHash
        });
    }

    /**
     * Helper method to get all results from an iterator
     */
    async _getAllResults(iterator) {
        const allResults = [];
        let result = await iterator.next();

        while (!result.done) {
            const jsonRes = {};
            if (result.value && result.value.value.toString()) {
                try {
                    jsonRes.Key = result.value.key;
                    jsonRes.Record = JSON.parse(result.value.value.toString('utf8'));
                    allResults.push(jsonRes);
                } catch (err) {
                    console.log(err);
                }
            }
            result = await iterator.next();
        }

        await iterator.close();
        return allResults;
    }
}

module.exports = EHRContract;


