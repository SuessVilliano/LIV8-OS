import axios from 'axios';
import { VBOUT_API_KEY, VBOUT_CLIENT_ID, VBOUT_CLIENT_SECRET } from '../utils/env';

const VBOUT_BASE_URL = 'https://api.vbout.com/1'; // Verify Vbout API base URL

class VboutService {
    private apiKey: string; // The user key for direct API calls
    private oauthToken: string; // The OAuth Token from API Apps
    private clientSecret: string; // The Client Secret from API Apps
    private accessTokenExpiry: number = 0; // Placeholder, as OAuth Token might be long-lived

    constructor() {
        if (!VBOUT_API_KEY) {
            console.warn("Vbout API key (User Key) is not configured. Some direct VboutService functions might be limited.");
        }
        if (!VBOUT_OAUTH_TOKEN || !VBOUT_CLIENT_SECRET) {
            console.warn("Vbout OAuth Token or Client Secret (from API Apps) are not fully configured. Application-level authentication might be limited.");
        }
        this.apiKey = VBOUT_API_KEY;
        this.oauthToken = VBOUT_OAUTH_TOKEN;
        this.clientSecret = VBOUT_CLIENT_SECRET;
    }

    private async getAccessToken(): Promise<string> {
        if (!this.clientId || !this.clientSecret) {
            console.warn("Vbout Client ID or Client Secret missing. Cannot obtain an application access token. Falling back to API Key if available.");
            return this.apiKey; // Fallback to user API key if app credentials are not set
        }

        if (this.accessToken && this.accessTokenExpiry > Date.now()) {
            return this.accessToken;
        }

        console.log("Attempting to get Vbout Application Access Token...");
        try {
            // This is an assumed OAuth2 client_credentials flow. Vbout docs will confirm the exact endpoint.
            // Placeholder: Assuming an endpoint like /oauth/token or /token for client_credentials grant
            const response = await axios.post(`${VBOUT_BASE_URL}/oauth/token`, {
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret
            });

            this.accessToken = response.data.access_token;
            this.accessTokenExpiry = Date.now() + (response.data.expires_in * 1000) - (60 * 1000); // 1 minute buffer
            return this.accessToken;

        } catch (error: any) {
            console.error('Failed to get Vbout application access token:', error.response?.data || error.message);
            // If fetching app token fails, we might still proceed with direct API key for some endpoints
            return this.apiKey;
        }
    }

    private async request(method: string, endpoint: string, data?: any, params?: any, useAppToken: boolean = false): Promise<any> {
        const url = `${VBOUT_BASE_URL}${endpoint}.json`; // All endpoints end with .json
        const headers: { [key: string]: string } = { 'Content-Type': 'application/json' };
        
        let finalKey: string;
        if (useAppToken && this.clientId && this.clientSecret) {
            finalKey = await this.getAccessToken(); // This attempts to get the app access token
            if (finalKey && finalKey !== this.apiKey) { // If it's a real app token, use Bearer
                headers['Authorization'] = `Bearer ${finalKey}`;
            } else { // Fallback to user API key if app token failed or wasn't unique
                finalKey = this.apiKey;
            }
        } else {
            finalKey = this.apiKey; // Default to user API key
        }
        
        let requestConfig: any = {
            method,
            url,
            headers
        };

        if (method === 'GET' || method === 'DELETE') {
            requestConfig.params = {
                ...params,
                key: finalKey // Always send 'key' in params for GET/DELETE
            };
            if (data) {
                requestConfig.data = data;
            }
        } else { // POST and PUT
            requestConfig.data = {
                ...data,
                key: finalKey // Always send 'key' in body for POST/PUT
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

    async getContacts(listId: number | string, options?: { limit?: number, page?: number }, useAppToken?: boolean): Promise<any[]> {
        console.log(`Fetching contacts from Vbout for listId: ${listId}`);
        const response = await this.request('GET', '/emailmarketing/getcontacts', null, {
            listid: listId,
            limit: options?.limit,
            page: options?.page
        }, useAppToken);
        return response?.contacts?.items || [];
    }

    async getContactByEmail(email: string, listId?: number | string, useAppToken?: boolean): Promise<any | null> {
        console.log(`Fetching contact by email: ${email} from list: ${listId || 'any'}`);
        const response = await this.request('GET', '/emailmarketing/getcontactbyemail', null, {
            email,
            listid: listId // Optional
        }, useAppToken);
        return response?.contact || null;
    }

    async getContactById(id: number | string, useAppToken?: boolean): Promise<any | null> {
        console.log(`Fetching contact by ID: ${id}`);
        const response = await this.request('GET', '/emailmarketing/getcontact', null, {
            id
        }, useAppToken);
        return response?.contact || null;
    }

    async createContact(contactData: { email: string; status: 'active' | 'disactive'; listid: number | string; ipaddress?: string; fields?: { [key: string]: string | number } }, useAppToken?: boolean): Promise<any> {
        console.log('Creating contact in Vbout:', contactData.email);
        const response = await this.request('POST', '/emailmarketing/addcontact', contactData, null, useAppToken);
        return response;
    }

    async updateContact(contactId: number | string, contactData: { email?: string; status?: 'active' | 'disactive'; listid?: number | string; ipaddress?: string; fields?: { [key: string]: string | number } }): Promise<any> {
        console.log(`Updating contact ${contactId} in Vbout:`, contactData);
        const response = await this.request('POST', '/emailmarketing/editcontact', {
            id: contactId,
            ...contactData
        }, null, useAppToken);
        return response;
    }

    async syncContact(contactData: { email: string; listid?: number | string; status?: 'active' | 'disactive'; ipaddress?: string; fields?: { [key: string]: string | number } }, useAppToken?: boolean): Promise<any> {
        console.log('Syncing contact in Vbout:', contactData.email);
        const response = await this.request('POST', '/emailmarketing/synccontact', contactData, null, useAppToken);
        return response;
    }

    async addTag(contactIdentifier: { id?: number | string; email?: string }, tagName: string | string[], useAppToken?: boolean): Promise<any> {
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

    async removeTag(contactIdentifier: { id?: number | string; email?: string }, tagName: string | string[], useAppToken?: boolean): Promise<any> {
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
    async getLists(useAppToken?: boolean): Promise<any[]> {
        console.log('Fetching lists from Vbout');
        const response = await this.request('GET', '/emailmarketing/getlists', null, null, useAppToken);
        return response?.lists?.items || [];
    }

    async getList(listId: number | string, useAppToken?: boolean): Promise<any | null> {
        console.log(`Fetching list by ID: ${listId}`);
        const response = await this.request('GET', '/emailmarketing/getlist', null, { id: listId }, useAppToken);
        return response?.list || null;
    }

    async addList(listData: { name: string; email_subject?: string; reply_to?: string; fromemail?: string; from_name?: string; doubleOptin?: 0 | 1; notify?: string; notify_email?: string; success_email?: string; success_message?: string; error_message?: string; confirmation_email?: string; confirmation_message?: string; communications?: 0 | 1 }, useAppToken?: boolean): Promise<any> {
        console.log('Adding list in Vbout:', listData.name);
        const response = await this.request('POST', '/emailmarketing/addlist', listData, null, useAppToken);
        return response;
    }

    async editList(listId: number | string, listData: { name?: string; email_subject?: string; reply_to?: string; fromemail?: string; from_name?: string; doubleOptin?: 0 | 1; notify?: string; notify_email?: string; success_email?: string; success_message?: string; error_message?: string; confirmation_email?: string; confirmation_message?: string; communications?: 0 | 1 }, useAppToken?: boolean): Promise<any> {
        console.log(`Editing list ${listId} in Vbout:`, listData.name);
        const response = await this.request('POST', '/emailmarketing/editlist', { id: listId, ...listData }, null, useAppToken);
        return response;
    }

    async deleteList(listId: number | string, useAppToken?: boolean): Promise<any> {
        console.log(`Deleting list by ID: ${listId}`);
        const response = await this.request('POST', '/emailmarketing/deletelist', { id: listId }, null, useAppToken); // Vbout uses POST for DeleteList
        return response;
    }
}

export const vboutService = new VboutService();
