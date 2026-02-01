import axios from 'axios';
import { VBOUT_API_KEY, VBOUT_APP_KEY, VBOUT_OAUTH_TOKEN, VBOUT_CLIENT_SECRET } from '../utils/env';

const VBOUT_BASE_URL = 'https://api.vbout.com/1'; // All endpoints use /1

class VboutService {
    private apiKey: string; // The user key for direct API calls
    private clientId: string; // The App Key from API Apps (acts as Client ID)
    private clientSecret: string; // The Client Secret from API Apps
    private oauthToken: string; // The OAuth Token from API Apps (long-lived access token)
    private internalAccessToken: string | null = null; // To store a potentially refreshed token
    private internalAccessTokenExpiry: number = 0; // Expiry for internalAccessToken

    constructor() {
        if (!VBOUT_API_KEY) {
            console.warn("Vbout API key (User Key) is not configured. Some direct VboutService functions might be limited.");
        }
        // VBOUT_APP_KEY is the Client ID here
        if (!VBOUT_APP_KEY || !VBOUT_CLIENT_SECRET) {
            console.warn("Vbout App Key (Client ID) or Client Secret are not fully configured. Application-level authentication might be limited.");
        }
        if (!VBOUT_OAUTH_TOKEN) {
            console.warn("Vbout OAuth Token is not configured. Application-level authentication might be limited.");
        }
        this.apiKey = VBOUT_API_KEY;
        this.clientId = VBOUT_APP_KEY; // Map App Key to clientId
        this.clientSecret = VBOUT_CLIENT_SECRET;
        this.oauthToken = VBOUT_OAUTH_TOKEN;
    }

    // This method will prioritize the directly provided VBOUT_OAUTH_TOKEN.
    // It also includes logic for refreshing a token via client_credentials if Vbout requires it (and provides an endpoint).
    private async getAppAccessToken(): Promise<string> {
        // 1. Prioritize the directly provided OAuth Token from .env
        if (this.oauthToken) {
            // In a real scenario, we might check its validity with a /me endpoint or similar
            // and only refresh if it fails.
            return this.oauthToken;
        }

        // 2. Fallback: If no direct OAuth Token, attempt to generate/refresh using client credentials (Client ID and Secret).
        // This assumes Vbout has an OAuth /token endpoint for client_credentials grant.
        // THIS PART NEEDS TO BE VERIFIED WITH VBOUT API DOCUMENTATION FOR OAUTH FLOWS.
        if (!this.clientId || !this.clientSecret) {
            console.warn("Vbout App Key (Client ID) or Client Secret missing. Cannot obtain an application access token.");
            return ''; // Cannot proceed with application-level auth without these
        }

        // If we have an internally refreshed token and it's still valid
        if (this.internalAccessToken && this.internalAccessTokenExpiry > Date.now()) {
            return this.internalAccessToken;
        }

        console.log("Attempting to get Vbout Application Access Token via client_credentials...");
        try {
            // Placeholder: Assuming an endpoint like /oauth/token or /token for client_credentials grant
            const response = await axios.post(`${VBOUT_BASE_URL}/oauth/token`, {
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret
            });

            this.internalAccessToken = response.data.access_token;
            this.internalAccessTokenExpiry = Date.now() + (response.data.expires_in * 1000) - (60 * 1000); // 1 minute buffer
            return this.internalAccessToken || '';

        } catch (error: any) {
            console.error('Failed to get Vbout application access token via client_credentials:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Vbout application.');
        }
    }

    private async request(method: string, endpoint: string, data?: any, params?: any, useAppToken: boolean = false): Promise<any> {
        const url = `${VBOUT_BASE_URL}${endpoint}.json`; // All endpoints end with .json
        const headers: { [key: string]: string } = { 'Content-Type': 'application/json' };
        
        let finalAuthParam: string;
        if (useAppToken) {
            const appToken = await this.getAppAccessToken();
            if (appToken) {
                headers['Authorization'] = `Bearer ${appToken}`;
                finalAuthParam = appToken; // Still pass in payload/params for robustness, as Vbout API uses 'key' there.
            } else {
                finalAuthParam = this.apiKey; // Fallback to User API Key if app token fails
            }
        } else {
            finalAuthParam = this.apiKey; // Default to User API Key
        }
        
        let requestConfig: any = {
            method,
            url,
            headers
        };

        if (method === 'GET' || method === 'DELETE') {
            requestConfig.params = {
                ...params,
                key: finalAuthParam // Send 'key' in params
            };
            if (data) {
                requestConfig.data = data;
            }
        } else { // POST and PUT
            requestConfig.data = {
                ...data,
                key: finalAuthParam // Send 'key' in body
            };
            requestConfig.params = params;
        }

        try {
            const response = await axios(requestConfig);
            return response.data;
        } catch (error: any) {
            console.error(`Vbout API request failed (${method} ${endpoint}):`, error.response?.data || error.message);
            throw new Error(`Vbout API error: ${error.response?.data?.message || error.message}`);
        }
    }

    async getContacts(listId: number | string, options?: { limit?: number, page?: number }, useAppToken: boolean = false): Promise<any[]> {
        console.log(`Fetching contacts from Vbout for listId: ${listId}`);
        const response = await this.request('GET', '/emailmarketing/getcontacts', null, {
            listid: listId,
            limit: options?.limit,
            page: options?.page
        }, useAppToken);
        return response?.contacts?.items || [];
    }

    async getContactByEmail(email: string, listId?: number | string, useAppToken: boolean = false): Promise<any | null> {
        console.log(`Fetching contact by email: ${email} from list: ${listId || 'any'}`);
        const response = await this.request('GET', '/emailmarketing/getcontactbyemail', null, {
            email,
            listid: listId // Optional
        }, useAppToken);
        return response?.contact || null;
    }

    async getContactById(id: number | string, useAppToken: boolean = false): Promise<any | null> {
        console.log(`Fetching contact by ID: ${id}`);
        const response = await this.request('GET', '/emailmarketing/getcontact', null, {
            id
        }, useAppToken);
        return response?.contact || null;
    }

    async createContact(contactData: { email: string; status: 'active' | 'disactive'; listid: number | string; ipaddress?: string; fields?: { [key: string]: string | number } }, useAppToken: boolean = false): Promise<any> {
        console.log('Creating contact in Vbout:', contactData.email);
        const response = await this.request('POST', '/emailmarketing/addcontact', contactData, null, useAppToken);
        return response;
    }

    async updateContact(contactId: number | string, contactData: { email?: string; status?: 'active' | 'disactive'; listid?: number | string; ipaddress?: string; fields?: { [key: string]: string | number } }, useAppToken: boolean = false): Promise<any> {
        console.log(`Updating contact ${contactId} in Vbout:`, contactData);
        const response = await this.request('POST', '/emailmarketing/editcontact', {
            id: contactId,
            ...contactData
        }, null, useAppToken);
        return response;
    }

    async syncContact(contactData: { email: string; listid?: number | string; status?: 'active' | 'disactive'; ipaddress?: string; fields?: { [key: string]: string | number } }, useAppToken: boolean = false): Promise<any> {
        console.log('Syncing contact in Vbout:', contactData.email);
        const response = await this.request('POST', '/emailmarketing/synccontact', contactData, null, useAppToken);
        return response;
    }

    async addTag(contactIdentifier: { id?: number | string; email?: string }, tagName: string | string[], useAppToken: boolean = false): Promise<any> {
        console.log(`Adding tag(s) "${tagName}" to Vbout contact:`, contactIdentifier);
        const tags = Array.isArray(tagName) ? tagName.join(',') : tagName;
        const payload = {
            tagname: tags,
            ...(contactIdentifier.id && { id: contactIdentifier.id }),
            ...(contactIdentifier.email && { email: contactIdentifier.email })
        };
        const response = await this.request('POST', '/emailmarketing/addtag', payload, null, useAppToken);
        return response;
    }

    async removeTag(contactIdentifier: { id?: number | string; email?: string }, tagName: string | string[], useAppToken: boolean = false): Promise<any> {
        console.log(`Removing tag(s) "${tagName}" from Vbout contact:`, contactIdentifier);
        const tags = Array.isArray(tagName) ? tagName.join(',') : tagName;
        const payload = {
            tagname: tags,
            ...(contactIdentifier.id && { id: contactIdentifier.id }),
            ...(contactIdentifier.email && { email: contactIdentifier.email })
        };
        const response = await this.request('POST', '/emailmarketing/removetag', payload, null, useAppToken); // Docs show POST for removeTag
        return response;
    }

    // --- Lists ---
    async getLists(useAppToken: boolean = false): Promise<any[]> {
        console.log('Fetching lists from Vbout');
        const response = await this.request('GET', '/emailmarketing/getlists', null, null, useAppToken);
        return response?.lists?.items || [];
    }

    async getList(listId: number | string, useAppToken: boolean = false): Promise<any | null> {
        console.log(`Fetching list by ID: ${listId}`);
        const response = await this.request('GET', '/emailmarketing/getlist', null, { id: listId }, useAppToken);
        return response?.list || null;
    }

    async addList(listData: { name: string; email_subject?: string; reply_to?: string; fromemail?: string; from_name?: string; doubleOptin?: 0 | 1; notify?: string; notify_email?: string; success_email?: string; success_message?: string; error_message?: string; confirmation_email?: string; confirmation_message?: string; communications?: 0 | 1 }, useAppToken: boolean = false): Promise<any> {
        console.log('Adding list in Vbout:', listData.name);
        const response = await this.request('POST', '/emailmarketing/addlist', listData, null, useAppToken);
        return response;
    }

    async editList(listId: number | string, listData: { name?: string; email_subject?: string; reply_to?: string; fromemail?: string; from_name?: string; doubleOptin?: 0 | 1; notify?: string; notify_email?: string; success_email?: string; success_message?: string; error_message?: string; confirmation_email?: string; confirmation_message?: string; communications?: 0 | 1 }, useAppToken: boolean = false): Promise<any> {
        console.log(`Editing list ${listId} in Vbout:`, listData.name);
        const response = await this.request('POST', '/emailmarketing/editlist', { id: listId, ...listData }, null, useAppToken);
        return response;
    }

    async deleteList(listId: number | string, useAppToken: boolean = false): Promise<any> {
        console.log(`Deleting list by ID: ${listId}`);
        const response = await this.request('POST', '/emailmarketing/deletelist', { id: listId }, null, useAppToken); // Vbout uses POST for DeleteList
        return response;
    }
}

export const vboutService = new VboutService();
