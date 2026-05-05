'use strict';

const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');
const { TextEncoder } = require('util');
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

const ajv = new Ajv({ allErrors: true, coerceTypes: true, useDefaults: true });
addFormats(ajv);  // enable "date-time", "email", etc.

// JSON schema for tourist record (ledger representation)
const TOURIST_SCHEMA = {
    type: 'object',
    properties: {
        touristId: { type: 'string', pattern: '^[a-zA-Z0-9_-]{1,64}$' },
        kycHash: { type: 'string', pattern: '^[a-f0-9]{64}$' }, // SHA256 hash
        itinerary: { 
            type: 'object',
            properties: {
                destinations: { 
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            location: { type: 'string' },
                            startDate: { type: 'string', format: 'date-time' },
                            endDate: { type: 'string', format: 'date-time' },
                            accommodation: { type: 'string' }
                        },
                        required: ['location', 'startDate', 'endDate']
                    }
                },
                transportation: { type: 'array' }
            }
        },
        emergencyContacts: { 
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    relationship: { type: 'string' },
                    // Fixed regex: escaped parentheses for Node 16
                    phone: { type: 'string', pattern: '^\\+?[\\d\\s\\-\\(\\)]{10,}$' },
                    email: { type: 'string', format: 'email' }
                },
                required: ['name', 'phone']
            }
        },
        issuer: { type: 'string' },              
        issuerId: { type: 'string' },            
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
        expiryAt: { type: 'string', format: 'date-time' },
        status: { type: 'string', enum: ['active', 'revoked', 'expired', 'suspended'] },
        metadata: { 
            type: 'object',
            properties: {
                revocationReason: { type: 'string' },
                revokedAt: { type: 'string', format: 'date-time' },
                suspensionReason: { type: 'string' },
                suspendedAt: { type: 'string', format: 'date-time' },
                lastVerified: { type: 'string', format: 'date-time' },
                version: { type: 'number' },
                securityScore: { type: 'number' },
                lastKnownLocation: { type: 'object' },
                devices: { type: 'array' }
            },
            additionalProperties: false
        }
    },
    required: ['touristId', 'kycHash', 'issuer', 'issuerId', 'createdAt', 'updatedAt', 'expiryAt', 'status'],
    additionalProperties: false
};

// Schema for events (location, SOS, feedback, eFIR, anomaly)
const EVENT_SCHEMA = {
    type: 'object',
    properties: {
        eventId: { type: 'string' },
        touristId: { type: 'string' },
        type: { type: 'string', enum: ['location', 'sos', 'feedback', 'efir', 'anomaly'] },
        timestamp: { type: 'string', format: 'date-time' },
        data: { type: 'object' }
    },
    required: ['eventId', 'touristId', 'type', 'timestamp']
};

const validateTourist = ajv.compile(TOURIST_SCHEMA);
const validateEvent = ajv.compile(EVENT_SCHEMA);

class TouristContract extends Contract {
    constructor() {
        super('org.tourism.TouristContract');
    }

    // Utility: construct composite key
    makeKey(ctx, touristId) {
        return ctx.stub.createCompositeKey('tourist', [touristId]);
    }

    // Utility: construct event key
    makeEventKey(ctx, eventId) {
        return ctx.stub.createCompositeKey('event', [eventId]);
    }

    // Utility: compute sha256
    sha256(data) {
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    // Utility: check if caller has required role
    _requireRole(ctx, allowedRoles = []) {
        const cid = ctx.clientIdentity;
        const role = cid.getAttributeValue('role') || '';
        const msp = cid.getMSPID();
        const id = cid.getID();

        // Allow issuer role or specific MSPs
        if (allowedRoles.includes(role) || allowedRoles.includes(msp)) return;
        
        throw new Error(`Access denied. Required role in [${allowedRoles.join(',')}]. Caller role="${role}", msp="${msp}", id="${id}"`);
    }

    // Utility: check if caller is the original issuer
    _isOriginalIssuer(ctx, tourist) {
        return ctx.clientIdentity.getID() === tourist.issuerId;
    }

    // Utility: check and update status based on expiry
    _computeStatus(tourist) {
        if (tourist.status === 'revoked') return 'revoked';
        if (tourist.status === 'suspended') return 'suspended';
        
        const now = new Date();
        const expiry = new Date(tourist.expiryAt);
        if (now > expiry) return 'expired';
        
        return 'active';
    }

    // Utility: validate timestamp format and logic
    _validateTimestamp(timestamp, fieldName) {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) {
            throw new Error(`Invalid ${fieldName}: not a valid ISO date string`);
        }
        return date.toISOString();
    }

    // Utility: validate expiry date is in the future
    _validateExpiry(expiryAt) {
        const expiryDate = new Date(expiryAt);
        const now = new Date();
        
        if (expiryDate <= now) {
            throw new Error('Expiry date must be in the future');
        }
        
        // Limit to maximum 1 year for security
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(now.getFullYear() + 1);
        
        if (expiryDate > oneYearFromNow) {
            throw new Error('Expiry date cannot be more than 1 year in the future');
        }
        
        return expiryDate.toISOString();
    }

    // === Lifecycle / Admin Methods ===

    async InitLedger(ctx) {
        console.info('Tourist Ledger initialized successfully');
        return { status: 'success', message: 'Tourist ledger initialized' };
    }

    /**
     * Register a tourist on ledger.
     * Only 'issuer' role should be allowed to call this.
     */
    async RegisterTourist(ctx, touristId, kycHash, itineraryJSON, emergencyContactsJSON, expiryAt, metadataJSON = '{}') {
        // Access control: only issuer
        this._requireRole(ctx, ['issuer', 'Org1MSP']);

        // Validate inputs
        if (!touristId || touristId.length === 0) {
            throw new Error('touristId is required');
        }
        
        if (!kycHash || kycHash.length !== 64) {
            throw new Error('kycHash must be a valid SHA256 hex string (64 characters)');
        }

        const key = this.makeKey(ctx, touristId);
        const existing = await ctx.stub.getState(key);
        if (existing && existing.length > 0) {
            throw new Error(`Tourist with id ${touristId} already exists`);
        }

        let itinerary = {};
        let emergencyContacts = [];
        let metadata = {};

        try {
            itinerary = itineraryJSON ? JSON.parse(itineraryJSON) : {};
            emergencyContacts = emergencyContactsJSON ? JSON.parse(emergencyContactsJSON) : [];
            metadata = metadataJSON ? JSON.parse(metadataJSON) : {};
        } catch (err) {
            throw new Error('Invalid JSON for itinerary/emergencyContacts/metadata: ' + err.message);
        }

        const issuer = ctx.clientIdentity.getMSPID();
        const issuerId = ctx.clientIdentity.getID();

        const now = new Date(ctx.stub.getTxTimestamp().seconds * 1000);
        const timestamp = now.toISOString();
        
        // Validate and format expiry date
        const validatedExpiry = this._validateExpiry(expiryAt);

        const tourist = {
            touristId,
            kycHash,
            itinerary,
            emergencyContacts,
            issuer,
            issuerId,
            createdAt: timestamp,
            updatedAt: timestamp,
            expiryAt: validatedExpiry,
            status: 'active',
            metadata: {
                ...metadata,
                version: 1
            }
        };

        // Validate against schema
        const valid = validateTourist(tourist);
        if (!valid) {
            throw new Error('Tourist payload validation failed: ' + JSON.stringify(validateTourist.errors));
        }

        // Save to ledger
        await ctx.stub.putState(key, Buffer.from(JSON.stringify(tourist)));
        
        // Emit event so backend/dashboard can react
        ctx.stub.setEvent('TouristRegistered', Buffer.from(JSON.stringify({ 
            touristId, 
            issuer, 
            createdAt: timestamp,
            txId: ctx.stub.getTxID()
        })));

        return tourist;
    }

    /**
     * Record location event for a tourist
     */
    async RecordLocation(ctx, eventId, touristId, locationJSON) {
        this._requireRole(ctx, ['issuer', 'police', 'admin', 'Org1MSP']);
        
        if (!eventId || !touristId || !locationJSON) {
            throw new Error('eventId, touristId, and locationJSON are required');
        }

        // Check if tourist exists
        const touristKey = this.makeKey(ctx, touristId);
        const touristData = await ctx.stub.getState(touristKey);
        if (!touristData || touristData.length === 0) {
            throw new Error(`Tourist ${touristId} not found`);
        }

        let locationData;
        try {
            locationData = JSON.parse(locationJSON);
        } catch (err) {
            throw new Error('Invalid location JSON: ' + err.message);
        }

        const now = new Date(ctx.stub.getTxTimestamp().seconds * 1000);
        const timestamp = now.toISOString();

        const event = {
            eventId,
            touristId,
            type: 'location',
            timestamp,
            data: locationData
        };

        // Validate event
        const valid = validateEvent(event);
        if (!valid) {
            throw new Error('Event validation failed: ' + JSON.stringify(validateEvent.errors));
        }

        // Save event
        const eventKey = this.makeEventKey(ctx, eventId);
        await ctx.stub.putState(eventKey, Buffer.from(JSON.stringify(event)));

        // Update tourist's last known location in metadata
        const tourist = JSON.parse(touristData.toString());
        tourist.metadata = tourist.metadata || {};
        tourist.metadata.lastKnownLocation = locationData;
        tourist.updatedAt = timestamp;

        await ctx.stub.putState(touristKey, Buffer.from(JSON.stringify(tourist)));

        ctx.stub.setEvent('LocationRecorded', Buffer.from(JSON.stringify({
            eventId,
            touristId,
            timestamp,
            txId: ctx.stub.getTxID()
        })));

        return event;
    }

    /**
     * Record SOS alert for a tourist
     */
    async RecordSOS(ctx, eventId, touristId, sosJSON) {
        this._requireRole(ctx, ['issuer', 'police', 'admin', 'Org1MSP']);
        
        if (!eventId || !touristId || !sosJSON) {
            throw new Error('eventId, touristId, and sosJSON are required');
        }

        // Check if tourist exists
        const touristKey = this.makeKey(ctx, touristId);
        const touristData = await ctx.stub.getState(touristKey);
        if (!touristData || touristData.length === 0) {
            throw new Error(`Tourist ${touristId} not found`);
        }

        let sosData;
        try {
            sosData = JSON.parse(sosJSON);
        } catch (err) {
            throw new Error('Invalid SOS JSON: ' + err.message);
        }

        const now = new Date(ctx.stub.getTxTimestamp().seconds * 1000);
        const timestamp = now.toISOString();

        const event = {
            eventId,
            touristId,
            type: 'sos',
            timestamp,
            data: sosData
        };

        // Validate event
        const valid = validateEvent(event);
        if (!valid) {
            throw new Error('Event validation failed: ' + JSON.stringify(validateEvent.errors));
        }

        // Save event
        const eventKey = this.makeEventKey(ctx, eventId);
        await ctx.stub.putState(eventKey, Buffer.from(JSON.stringify(event)));

        ctx.stub.setEvent('SOSRecorded', Buffer.from(JSON.stringify({
            eventId,
            touristId,
            timestamp,
            txId: ctx.stub.getTxID()
        })));

        return event;
    }

    /**
     * Record feedback for a tourist
     */
    async RecordFeedback(ctx, eventId, touristId, feedbackJSON) {
        this._requireRole(ctx, ['issuer', 'police', 'admin', 'Org1MSP']);
        
        if (!eventId || !touristId || !feedbackJSON) {
            throw new Error('eventId, touristId, and feedbackJSON are required');
        }

        // Check if tourist exists
        const touristKey = this.makeKey(ctx, touristId);
        const touristData = await ctx.stub.getState(touristKey);
        if (!touristData || touristData.length === 0) {
            throw new Error(`Tourist ${touristId} not found`);
        }

        let feedbackData;
        try {
            feedbackData = JSON.parse(feedbackJSON);
        } catch (err) {
            throw new Error('Invalid feedback JSON: ' + err.message);
        }

        const now = new Date(ctx.stub.getTxTimestamp().seconds * 1000);
        const timestamp = now.toISOString();

        const event = {
            eventId,
            touristId,
            type: 'feedback',
            timestamp,
            data: feedbackData
        };

        // Validate event
        const valid = validateEvent(event);
        if (!valid) {
            throw new Error('Event validation failed: ' + JSON.stringify(validateEvent.errors));
        }

        // Save event
        const eventKey = this.makeEventKey(ctx, eventId);
        await ctx.stub.putState(eventKey, Buffer.from(JSON.stringify(event)));

        ctx.stub.setEvent('FeedbackRecorded', Buffer.from(JSON.stringify({
            eventId,
            touristId,
            timestamp,
            txId: ctx.stub.getTxID()
        })));

        return event;
    }

    /**
     * Record e-FIR for a tourist
     */
    async RecordEFIR(ctx, eventId, touristId, efirJSON) {
        this._requireRole(ctx, ['issuer', 'police', 'admin', 'Org1MSP']);
        
        if (!eventId || !touristId || !efirJSON) {
            throw new Error('eventId, touristId, and efirJSON are required');
        }

        // Check if tourist exists
        const touristKey = this.makeKey(ctx, touristId);
        const touristData = await ctx.stub.getState(touristKey);
        if (!touristData || touristData.length === 0) {
            throw new Error(`Tourist ${touristId} not found`);
        }

        let efirData;
        try {
            efirData = JSON.parse(efirJSON);
        } catch (err) {
            throw new Error('Invalid eFIR JSON: ' + err.message);
        }

        const now = new Date(ctx.stub.getTxTimestamp().seconds * 1000);
        const timestamp = now.toISOString();

        const event = {
            eventId,
            touristId,
            type: 'efir',
            timestamp,
            data: efirData
        };

        // Validate event
        const valid = validateEvent(event);
        if (!valid) {
            throw new Error('Event validation failed: ' + JSON.stringify(validateEvent.errors));
        }

        // Save event
        const eventKey = this.makeEventKey(ctx, eventId);
        await ctx.stub.putState(eventKey, Buffer.from(JSON.stringify(event)));

        ctx.stub.setEvent('EFIRRecorded', Buffer.from(JSON.stringify({
            eventId,
            touristId,
            timestamp,
            txId: ctx.stub.getTxID()
        })));

        return event;
    }

    /**
     * Record anomaly detection for a tourist
     */
    async RecordAnomaly(ctx, eventId, touristId, anomalyJSON) {
        this._requireRole(ctx, ['issuer', 'police', 'admin', 'Org1MSP']);
        
        if (!eventId || !touristId || !anomalyJSON) {
            throw new Error('eventId, touristId, and anomalyJSON are required');
        }

        // Check if tourist exists
        const touristKey = this.makeKey(ctx, touristId);
        const touristData = await ctx.stub.getState(touristKey);
        if (!touristData || touristData.length === 0) {
            throw new Error(`Tourist ${touristId} not found`);
        }

        let anomalyData;
        try {
            anomalyData = JSON.parse(anomalyJSON);
        } catch (err) {
            throw new Error('Invalid anomaly JSON: ' + err.message);
        }

        const now = new Date(ctx.stub.getTxTimestamp().seconds * 1000);
        const timestamp = now.toISOString();

        const event = {
            eventId,
            touristId,
            type: 'anomaly',
            timestamp,
            data: anomalyData
        };

        // Validate event
        const valid = validateEvent(event);
        if (!valid) {
            throw new Error('Event validation failed: ' + JSON.stringify(validateEvent.errors));
        }

        // Save event
        const eventKey = this.makeEventKey(ctx, eventId);
        await ctx.stub.putState(eventKey, Buffer.from(JSON.stringify(event)));

        ctx.stub.setEvent('AnomalyRecorded', Buffer.from(JSON.stringify({
            eventId,
            touristId,
            timestamp,
            txId: ctx.stub.getTxID()
        })));

        return event;
    }

    /**
     * Get tourist by ID
     */
    async GetTourist(ctx, touristId) {
        if (!touristId) throw new Error('touristId required');
        const key = this.makeKey(ctx, touristId);
        const data = await ctx.stub.getState(key);
        if (!data || data.length === 0) {
            throw new Error(`Tourist ${touristId} not found`);
        }
        const tourist = JSON.parse(data.toString());
        tourist.status = this._computeStatus(tourist);
        return tourist;
    }

    /**
     * Update tourist metadata (non-sensitive fields)
     */
    async UpdateTourist(ctx, touristId, updatesJSON) {
        this._requireRole(ctx, ['issuer', 'police', 'admin', 'Org1MSP']);
        if (!touristId) throw new Error('touristId required');
        
        let updates;
        try {
            updates = JSON.parse(updatesJSON);
        } catch (e) {
            throw new Error('Invalid updates JSON: ' + e.message);
        }

        const key = this.makeKey(ctx, touristId);
        const data = await ctx.stub.getState(key);
        if (!data || data.length === 0) {
            throw new Error(`Tourist ${touristId} not found`);
        }

        const tourist = JSON.parse(data.toString());
        
        // Check if caller is authorized to update this record
        if (!this._isOriginalIssuer(ctx, tourist) && 
            !ctx.clientIdentity.getAttributeValue('role').includes('admin') &&
            !ctx.clientIdentity.getAttributeValue('role').includes('police')) {
            throw new Error('Only the original issuer or admin/police can update this record');
        }

        // Only allow updating allowed fields
        if (updates.itinerary) tourist.itinerary = updates.itinerary;
        if (Array.isArray(updates.emergencyContacts)) tourist.emergencyContacts = updates.emergencyContacts;
        if (updates.metadata) {
            tourist.metadata = { 
                ...tourist.metadata, 
                ...updates.metadata,
                version: (tourist.metadata.version || 0) + 1
            };
        }
        if (updates.expiryAt) {
            tourist.expiryAt = this._validateExpiry(updates.expiryAt);
        }

        // Update timestamp
        const now = new Date(ctx.stub.getTxTimestamp().seconds * 1000);
        tourist.updatedAt = now.toISOString();
        
        // Recompute status
        tourist.status = this._computeStatus(tourist);

        const valid = validateTourist(tourist);
        if (!valid) {
            throw new Error('Tourist payload validation failed: ' + JSON.stringify(validateTourist.errors));
        }

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(tourist)));
        ctx.stub.setEvent('TouristUpdated', Buffer.from(JSON.stringify({ 
            touristId, 
            updatedAt: tourist.updatedAt,
            txId: ctx.stub.getTxID()
        })));
        return tourist;
    }

    /**
     * Revoke a tourist ID (e.g., lost card, fraud)
     */
    async RevokeTourist(ctx, touristId, reason = '') {
        this._requireRole(ctx, ['issuer', 'admin', 'Org1MSP']);
        if (!touristId) throw new Error('touristId required');

        const key = this.makeKey(ctx, touristId);
        const data = await ctx.stub.getState(key);
        if (!data || data.length === 0) {
            throw new Error(`Tourist ${touristId} not found`);
        }

        const tourist = JSON.parse(data.toString());
        
        // Check if caller is authorized to revoke this record
        if (!this._isOriginalIssuer(ctx, tourist) && 
            !ctx.clientIdentity.getAttributeValue('role').includes('admin')) {
            throw new Error('Only the original issuer or admin can revoke this record');
        }

        tourist.status = 'revoked';
        tourist.metadata = tourist.metadata || {};
        tourist.metadata.revocationReason = reason;
        tourist.metadata.revokedAt = new Date().toISOString();
        tourist.metadata.version = (tourist.metadata.version || 0) + 1;

        // Update timestamp
        const now = new Date(ctx.stub.getTxTimestamp().seconds * 1000);
        tourist.updatedAt = now.toISOString();

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(tourist)));
        ctx.stub.setEvent('TouristRevoked', Buffer.from(JSON.stringify({ 
            touristId, 
            reason,
            txId: ctx.stub.getTxID()
        })));
        return tourist;
    }

    /**
     * Suspend a tourist ID temporarily
     */
    async SuspendTourist(ctx, touristId, reason = '') {
        this._requireRole(ctx, ['police', 'admin', 'Org1MSP']);
        if (!touristId) throw new Error('touristId required');

        const key = this.makeKey(ctx, touristId);
        const data = await ctx.stub.getState(key);
        if (!data || data.length === 0) {
            throw new Error(`Tourist ${touristId} not found`);
        }

        const tourist = JSON.parse(data.toString());
        tourist.status = 'suspended';
        tourist.metadata = tourist.metadata || {};
        tourist.metadata.suspensionReason = reason;
        tourist.metadata.suspendedAt = new Date().toISOString();
        tourist.metadata.version = (tourist.metadata.version || 0) + 1;

        // Update timestamp
        const now = new Date(ctx.stub.getTxTimestamp().seconds * 1000);
        tourist.updatedAt = now.toISOString();

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(tourist)));
        ctx.stub.setEvent('TouristSuspended', Buffer.from(JSON.stringify({ 
            touristId, 
            reason,
            txId: ctx.stub.getTxID()
        })));
        return tourist;
    }

    /**
     * Reinstate a suspended tourist
     */
    async ReinstateTourist(ctx, touristId) {
        this._requireRole(ctx, ['issuer', 'police', 'admin', 'Org1MSP']);
        if (!touristId) throw new Error('touristId required');

        const key = this.makeKey(ctx, touristId);
        const data = await ctx.stub.getState(key);
        if (!data || data.length === 0) {
            throw new Error(`Tourist ${touristId} not found`);
        }

        const tourist = JSON.parse(data.toString());
        
        if (tourist.status !== 'suspended') {
            throw new Error(`Tourist ${touristId} is not suspended. Current status: ${tourist.status}`);
        }

        // Check if caller is authorized to reinstate this record
        if (!this._isOriginalIssuer(ctx, tourist) && 
            !ctx.clientIdentity.getAttributeValue('role').includes('admin') &&
            !ctx.clientIdentity.getAttributeValue('role').includes('police')) {
            throw new Error('Only the original issuer, police or admin can reinstate this record');
        }

        tourist.status = this._computeStatus(tourist);
        tourist.metadata = tourist.metadata || {};
        delete tourist.metadata.suspensionReason;
        delete tourist.metadata.suspendedAt;
        tourist.metadata.reinstatedAt = new Date().toISOString();
        tourist.metadata.version = (tourist.metadata.version || 0) + 1;

        // Update timestamp
        const now = new Date(ctx.stub.getTxTimestamp().seconds * 1000);
        tourist.updatedAt = now.toISOString();

        await ctx.stub.putState(key, Buffer.from(JSON.stringify(tourist)));
        ctx.stub.setEvent('TouristReinstated', Buffer.from(JSON.stringify({ 
            touristId,
            txId: ctx.stub.getTxID()
        })));
        return tourist;
    }

    /**
     * Verify tourist validity (checks status and expiry)
     */
    async VerifyTourist(ctx, touristId) {
        if (!touristId) throw new Error('touristId required');

        const tourist = await this.GetTourist(ctx, touristId);
        const status = this._computeStatus(tourist);

        let valid = false;
        if (status === 'active') valid = true;

        // Update last verified timestamp
        if (valid) {
            tourist.metadata = tourist.metadata || {};
            tourist.metadata.lastVerified = new Date().toISOString();
            tourist.metadata.version = (tourist.metadata.version || 0) + 1;
            
            const key = this.makeKey(ctx, touristId);
            await ctx.stub.putState(key, Buffer.from(JSON.stringify(tourist)));
        }

        return {
            touristId,
            valid,
            status,
            expiryAt: tourist.expiryAt,
            issuer: tourist.issuer,
            lastKnownItinerary: tourist.itinerary,
            verifiedAt: new Date().toISOString()
        };
    }

    /**
     * Query tourists with CouchDB rich query (pass JSON query)
     */
    async QueryTourists(ctx, queryJSON) {
        // Restrict access to authorized roles
        this._requireRole(ctx, ['police', 'issuer', 'admin', 'Org1MSP']);
        
        let query;
        try {
            query = JSON.parse(queryJSON);
        } catch (e) {
            throw new Error('Invalid query JSON: ' + e.message);
        }

        // Add security restrictions to prevent full data scanning
        if (!query.selector || Object.keys(query.selector).length === 0) {
            throw new Error('Query must include selector conditions for security');
        }

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const results = [];
        for await (const res of iterator) {
            const record = res.value.toString('utf8');
            try {
                const tourist = JSON.parse(record);
                tourist.status = this._computeStatus(tourist);
                results.push(tourist);
            } catch (err) {
                results.push(record);
            }
        }
        return results;
    }

    /**
     * Query events with CouchDB rich query
     */
    async QueryEvents(ctx, queryJSON) {
        this._requireRole(ctx, ['police', 'admin', 'Org1MSP']);
        
        let query;
        try {
            query = JSON.parse(queryJSON);
        } catch (e) {
            throw new Error('Invalid query JSON: ' + e.message);
        }

        if (!query.selector || Object.keys(query.selector).length === 0) {
            throw new Error('Query must include selector conditions for security');
        }

        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const results = [];
        for await (const res of iterator) {
            const record = res.value.toString('utf8');
            try {
                const event = JSON.parse(record);
                results.push(event);
            } catch (err) {
                results.push(record);
            }
        }
        return results;
    }

    /**
     * Get history of given tourist (returns array of txs)
     */
    async GetTouristHistory(ctx, touristId) {
        if (!touristId) throw new Error('touristId required');
        this._requireRole(ctx, ['police', 'admin', 'Org1MSP']);
        
        const key = this.makeKey(ctx, touristId);
        const iterator = await ctx.stub.getHistoryForKey(key);
        const history = [];
        for await (const record of iterator) {
            const tx = {
                txId: record.txId,
                timestamp: new Date(record.timestamp.seconds * 1000).toISOString(),
                isDelete: record.isDelete,
                value: null
            };
            if (record.value && record.value.length > 0) {
                try {
                    tx.value = JSON.parse(record.value.toString('utf8'));
                } catch (e) {
                    tx.value = record.value.toString('utf8');
                }
            }
            history.push(tx);
        }
        return history;
    }

    /**
     * Query by KYC hash (returns matching tourist records)
     */
    async QueryByKycHash(ctx, kycHash) {
        this._requireRole(ctx, ['police', 'issuer', 'admin', 'Org1MSP']);
        if (!kycHash || kycHash.length !== 64) {
            throw new Error('Valid kycHash (SHA256 hex string) required');
        }
        
        const query = {
            selector: {
                kycHash: kycHash
            }
        };
        return await this.QueryTourists(ctx, JSON.stringify(query));
    }

    /**
     * Get all tourists with pagination
     */
    async GetAllTourists(ctx, pageSize = 20, bookmark = '') {
        this._requireRole(ctx, ['admin', 'police', 'Org1MSP']);
        
        pageSize = parseInt(pageSize);
        if (pageSize <= 0 || pageSize > 100) {
            throw new Error('pageSize must be between 1 and 100');
        }

        const { iterator, metadata } = await ctx.stub.getStateByRangeWithPagination('', '', pageSize, bookmark);
        const results = [];
        
        for await (const res of iterator) {
            const record = res.value.toString('utf8');
            try {
                const tourist = JSON.parse(record);
                tourist.status = this._computeStatus(tourist);
                results.push(tourist);
            } catch (err) {
                results.push(record);
            }
        }
        
        return {
            records: results,
            fetchedRecordsCount: metadata.fetchedRecordsCount,
            bookmark: metadata.bookmark
        };
    }

    /**
     * Get all events for a tourist
     */
    async GetTouristEvents(ctx, touristId, eventType = '', limit = 50) {
        this._requireRole(ctx, ['police', 'admin', 'Org1MSP']);
        if (!touristId) throw new Error('touristId required');
        
        let query = {
            selector: {
                touristId: touristId
            },
            sort: [{ timestamp: 'desc' }],
            limit: parseInt(limit) || 50
        };
        
        if (eventType) {
            query.selector.type = eventType;
        }
        
        return await this.QueryEvents(ctx, JSON.stringify(query));
    }

    /**
     * Utility: compute kycHash from input string (for on-chain verification reference)
     */
    async ComputeKycHash(ctx, payloadJSON) {
        if (!payloadJSON) throw new Error('payloadJSON required');
        return this.sha256(payloadJSON);
    }

    /**
     * Check if tourist exists
     */
    async TouristExists(ctx, touristId) {
        if (!touristId) throw new Error('touristId required');
        const key = this.makeKey(ctx, touristId);
        const data = await ctx.stub.getState(key);
        return data && data.length > 0;
    }

    /**
     * Get event by ID
     */
    async GetEvent(ctx, eventId) {
        this._requireRole(ctx, ['police', 'admin', 'Org1MSP']);
        if (!eventId) throw new Error('eventId required');
        
        const key = this.makeEventKey(ctx, eventId);
        const data = await ctx.stub.getState(key);
        if (!data || data.length === 0) {
            throw new Error(`Event ${eventId} not found`);
        }
        return JSON.parse(data.toString());
    }
}

module.exports = TouristContract;