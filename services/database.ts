
import { BrandBrain, BuildPlan, ApprovalPack } from "./types";
import { apiCall } from './api';

// LocalStorage tables with backend sync
// Uses localStorage as cache, syncs with backend when available

interface UserTable {
  id: string;
  email: string;
  location_id: string;
  created_at: number;
}

interface BrandTable {
  id: string;
  location_id: string;
  domain: string;
  brain_data: BrandBrain;
  updated_at: number;
}

interface DeploymentTable {
  id: string;
  location_id: string;
  status: 'draft' | 'deployed';
  approval_pack: ApprovalPack;
  build_plan: BuildPlan;
  deployed_at?: number;
}

class DatabaseService {
  private delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  // --- Users ---
  async upsertUser(locationId: string): Promise<UserTable> {
    await this.delay(300);
    const users = this.getTable<UserTable>('users');
    const existing = users.find(u => u.location_id === locationId);

    if (existing) return existing;

    const newUser: UserTable = {
      id: crypto.randomUUID(),
      email: `admin@${locationId}.com`,
      location_id: locationId,
      created_at: Date.now()
    };

    this.saveTable('users', [...users, newUser]);
    return newUser;
  }

  // --- Brand Brain ---
  async saveBrandBrain(locationId: string, brain: BrandBrain): Promise<void> {
    await this.delay(500);
    const brands = this.getTable<BrandTable>('brand_brains');
    const existingIdx = brands.findIndex(b => b.location_id === locationId);

    const record: BrandTable = {
      id: existingIdx > -1 ? brands[existingIdx].id : crypto.randomUUID(),
      location_id: locationId,
      domain: brain.domain,
      brain_data: brain,
      updated_at: Date.now()
    };

    if (existingIdx > -1) {
      brands[existingIdx] = record;
    } else {
      brands.push(record);
    }

    this.saveTable('brand_brains', brands);

    // Sync to backend (fire and forget)
    this.syncBrandBrainToBackend(locationId, brain).catch(e => {
      console.warn('[DB] Backend sync failed, data saved locally:', e);
    });
  }

  private async syncBrandBrainToBackend(locationId: string, brain: BrandBrain): Promise<void> {
    try {
      await apiCall('/api/setup/save-brand-brain', {
        method: 'POST',
        body: JSON.stringify({ locationId, brandBrain: brain })
      });
      console.log('[DB] Brand brain synced to backend');
    } catch (e) {
      // Silently fail - local storage is the fallback
    }
  }

  async getBrandBrain(locationId: string): Promise<BrandBrain | null> {
    // Try backend first
    try {
      const result = await apiCall(`/api/setup/brand-brain/${locationId}`);
      if (result.brandBrain) {
        // Update local cache
        const brands = this.getTable<BrandTable>('brand_brains');
        const existingIdx = brands.findIndex(b => b.location_id === locationId);
        const record: BrandTable = {
          id: existingIdx > -1 ? brands[existingIdx].id : crypto.randomUUID(),
          location_id: locationId,
          domain: result.brandBrain.domain,
          brain_data: result.brandBrain,
          updated_at: Date.now()
        };
        if (existingIdx > -1) {
          brands[existingIdx] = record;
        } else {
          brands.push(record);
        }
        this.saveTable('brand_brains', brands);
        return result.brandBrain;
      }
    } catch (e) {
      console.warn('[DB] Backend fetch failed, using local cache');
    }

    // Fallback to local storage
    await this.delay(200);
    const brands = this.getTable<BrandTable>('brand_brains');
    const record = brands.find(b => b.location_id === locationId);
    return record ? record.brain_data : null;
  }

  // --- Deployments ---
  async saveDeployment(locationId: string, approval: ApprovalPack, plan: BuildPlan): Promise<void> {
    await this.delay(600);
    const deployments = this.getTable<DeploymentTable>('deployments');
    const newDeployment: DeploymentTable = {
      id: crypto.randomUUID(),
      location_id: locationId,
      status: 'deployed',
      approval_pack: approval,
      build_plan: plan,
      deployed_at: Date.now()
    };
    this.saveTable('deployments', [...deployments, newDeployment]);
  }

  async getLatestDeployment(locationId: string): Promise<DeploymentTable | null> {
    const deployments = this.getTable<DeploymentTable>('deployments');
    const locDeployments = deployments
      .filter(d => d.location_id === locationId)
      .sort((a, b) => (b.deployed_at || 0) - (a.deployed_at || 0));

    return locDeployments[0] || null;
  }

  // --- Asset Logs (Phase 10 Deep Sync) ---
  async saveAssetLog(locationId: string, log: any[]): Promise<void> {
    await this.delay(300);
    const logs = this.getTable<any>('asset_logs');
    const others = logs.filter((l: any) => l.location_id !== locationId);
    this.saveTable('asset_logs', [...others, { location_id: locationId, assets: log, updated_at: Date.now() }]);
  }

  async getAssetLog(locationId: string): Promise<any[] | null> {
    const logs = this.getTable<any>('asset_logs');
    const record = logs.find((l: any) => l.location_id === locationId);
    return record ? record.assets : null;
  }

  // --- Helpers ---
  private getTable<T>(tableName: string): T[] {
    try {
      return JSON.parse(localStorage.getItem(`liv8_db_${tableName}`) || '[]');
    } catch {
      return [];
    }
  }

  private saveTable<T>(tableName: string, data: T[]) {
    localStorage.setItem(`liv8_db_${tableName}`, JSON.stringify(data));
  }
}

export const db = new DatabaseService();
