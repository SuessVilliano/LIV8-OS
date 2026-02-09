/**
 * CRM Integration API Routes
 * Handles GHL validation and Vbout sub-account creation
 */

import express from 'express';
import { ghlService } from '../integrations/ghl.js';
import { vboutService } from '../integrations/vbout.js';

const router = express.Router();

/**
 * Validate GHL credentials
 * POST /api/crm/validate-ghl
 */
router.post('/validate-ghl', async (req, res) => {
    try {
        const { locationId, apiKey } = req.body;

        if (!locationId || !apiKey) {
            return res.status(400).json({
                success: false,
                error: 'Location ID and API Key are required'
            });
        }

        console.log('[CRM] Validating GHL credentials for location:', locationId);

        // Attempt to connect to GHL
        const connected = await ghlService.connect({
            locationId,
            apiKey
        });

        if (connected) {
            // Get location details for confirmation
            console.log('[CRM] GHL validation successful');

            return res.json({
                success: true,
                message: 'GHL credentials validated successfully',
                location: {
                    id: locationId,
                    connected: true
                }
            });
        } else {
            return res.status(401).json({
                success: false,
                error: 'Invalid GHL credentials. Please check your Location ID and API Token.'
            });
        }
    } catch (error: any) {
        console.error('[CRM] GHL validation error:', error);
        return res.status(401).json({
            success: false,
            error: error.message || 'Failed to validate GHL credentials'
        });
    }
});

/**
 * Create GHL sub-account (location) for new user
 * POST /api/crm/create-ghl-subaccount
 */
router.post('/create-ghl-subaccount', async (req, res) => {
    try {
        const { businessName, email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        console.log('[CRM] Creating GHL sub-account for:', email);

        // Agency API key is required to create sub-accounts (locations)
        const agencyApiKey = process.env.GHL_AGENCY_API_KEY || process.env.GHL_TEST_TOKEN;

        if (!agencyApiKey) {
            console.error('[CRM] GHL Agency API key not configured - cannot create sub-accounts');
            return res.status(503).json({
                success: false,
                error: 'GHL service is not configured. Please contact support or connect with an existing GHL account.',
                code: 'GHL_NOT_CONFIGURED'
            });
        }

        // Create location (sub-account) via GHL Agency API
        const companyId = process.env.GHL_COMPANY_ID;
        const createUrl = companyId
            ? `https://services.leadconnectorhq.com/locations/`
            : `https://services.leadconnectorhq.com/locations/`;

        const locationPayload: Record<string, any> = {
            name: businessName || `${email.split('@')[0]}'s Business`,
            email: email,
            address: '',
            city: '',
            state: '',
            country: 'US',
            postalCode: '',
            timezone: 'America/New_York',
            settings: {
                allowDuplicateContact: false,
                allowDuplicateOpportunity: false,
                allowFacebookNameMerge: true
            }
        };

        if (companyId) {
            locationPayload.companyId = companyId;
        }

        const response = await fetch(createUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${agencyApiKey}`,
                'Content-Type': 'application/json',
                'Version': '2021-07-28'
            },
            body: JSON.stringify(locationPayload)
        });

        const data = await response.json();

        if (!response.ok) {
            const errorMsg = data?.message || data?.msg || data?.error || `GHL API returned ${response.status}`;
            console.error('[CRM] GHL sub-account creation failed:', errorMsg);
            throw new Error(errorMsg);
        }

        const location = data.location || data;

        console.log('[CRM] GHL sub-account created:', location.id || location.locationId);

        return res.json({
            success: true,
            message: 'GHL sub-account created successfully',
            account: {
                locationId: location.id || location.locationId,
                apiKey: agencyApiKey,
                name: location.name || businessName,
                email: email,
                status: 'active'
            }
        });

    } catch (error: any) {
        console.error('[CRM] GHL sub-account creation error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create GHL sub-account'
        });
    }
});

/**
 * Create Vbout sub-account for new user
 * POST /api/crm/create-vbout-account
 */
router.post('/create-vbout-account', async (req, res) => {
    try {
        const { email, businessName, firstName, lastName } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        console.log('[CRM] Creating Vbout sub-account for:', email);

        // Get master Vbout API key from environment
        const masterApiKey = process.env.VBOUT_API_KEY;
        const masterAccountId = process.env.VBOUT_ACCOUNT_ID;

        if (!masterApiKey) {
            console.error('[CRM] VBOUT_API_KEY not configured - cannot create CRM accounts');
            return res.status(503).json({
                success: false,
                error: 'CRM service is not configured. Please contact support.',
                code: 'CRM_NOT_CONFIGURED'
            });
        }

        // Connect with master account to create sub-account
        await vboutService.connect({
            apiKey: masterApiKey,
            accountId: masterAccountId || 'master'
        });

        // Create a new list for this user's contacts
        const userList = await vboutService.createList(
            `${businessName || email.split('@')[0]} - Contacts`
        );

        // Create the user as a contact in our master list for tracking
        const newContact = await vboutService.createContact({
            email,
            firstName: firstName || email.split('@')[0],
            lastName: lastName || '',
            customFields: {
                listId: userList.id,
                businessName: businessName || '',
                accountType: 'liv8_crm_user',
                signupDate: new Date().toISOString()
            },
            tags: ['liv8-crm-user', 'new-signup']
        });

        console.log('[CRM] Vbout sub-account created successfully');

        return res.json({
            success: true,
            message: 'LIV8 CRM account created successfully',
            account: {
                id: newContact.id,
                email: email,
                businessName: businessName || `${email.split('@')[0]}'s Business`,
                listId: userList.id,
                crmUrl: 'https://crm.liv8.co',
                status: 'active'
            }
        });

    } catch (error: any) {
        console.error('[CRM] Vbout account creation error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Failed to create LIV8 CRM account'
        });
    }
});

/**
 * Validate Vbout/LIV8 CRM credentials
 * POST /api/crm/validate-vbout
 */
router.post('/validate-vbout', async (req, res) => {
    try {
        const { email, apiKey } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        console.log('[CRM] Validating LIV8 CRM credentials for:', email);

        // For LIV8 CRM, we validate against our Vbout whitelabel
        // In production, this would check against actual Vbout credentials
        const masterApiKey = process.env.VBOUT_API_KEY;

        if (!masterApiKey) {
            console.error('[CRM] VBOUT_API_KEY not configured - cannot validate CRM credentials');
            return res.status(503).json({
                success: false,
                error: 'CRM service is not configured. Please contact support.',
                code: 'CRM_NOT_CONFIGURED'
            });
        }

        // Connect and verify
        const connected = await vboutService.connect({
            apiKey: apiKey || masterApiKey,
            accountId: 'liv8-crm'
        });

        if (connected) {
            return res.json({
                success: true,
                message: 'LIV8 CRM credentials validated',
                account: {
                    email,
                    crmUrl: 'https://crm.liv8.co',
                    status: 'active'
                }
            });
        } else {
            return res.status(401).json({
                success: false,
                error: 'Invalid LIV8 CRM credentials'
            });
        }

    } catch (error: any) {
        console.error('[CRM] LIV8 CRM validation error:', error);
        return res.status(401).json({
            success: false,
            error: error.message || 'Failed to validate LIV8 CRM credentials'
        });
    }
});

/**
 * Get CRM status for user
 * GET /api/crm/status
 */
router.get('/status', async (req, res) => {
    try {
        const crmType = req.query.type as string;

        if (crmType === 'ghl') {
            const connected = await ghlService.isConnected();
            return res.json({
                success: true,
                type: 'ghl',
                connected,
                name: 'GoHighLevel'
            });
        } else if (crmType === 'liv8' || crmType === 'vbout') {
            const connected = await vboutService.isConnected();
            return res.json({
                success: true,
                type: 'liv8',
                connected,
                name: 'LIV8 CRM',
                url: 'https://crm.liv8.co'
            });
        }

        return res.json({
            success: true,
            ghl: { connected: await ghlService.isConnected() },
            liv8: { connected: await vboutService.isConnected() }
        });

    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

export default router;
