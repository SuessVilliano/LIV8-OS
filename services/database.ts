
import { BrandBrain, BuildPlan, ApprovalPack } from "../types";

// Simulated SQL Tables in LocalStorage
// In a real app, these would be Supabase/Postgres tables.

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
    await this.delay(300); // Simulate network latency
    const users = this.getTable<UserTable>('users');
    const existing = users.find(u => u.location_id === locationId);
    
    if (existing) return existing;

    const newUser: UserTable = {
      id: crypto.randomUUID(),
      email: `admin@${locationId}.com`, // Mock email
      location_id: locationId,
      created_at: Date.now()
    };
    
    this.saveTable('users', [...users, newUser]);
    console.log("[SQL] INSERT INTO users", newUser);
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
    console.log("[SQL] UPSERT brand_brains", record);
  }

  async getBrandBrain(locationId: string): Promise<BrandBrain | null> {
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
    console.log("[SQL] INSERT INTO deployments", newDeployment);
  }

  async getLatestDeployment(locationId: string): Promise<DeploymentTable | null> {
    const deployments = this.getTable<DeploymentTable>('deployments');
    // Sort by date desc
    const locDeployments = deployments
      .filter(d => d.location_id === locationId)
      .sort((a, b) => (b.deployed_at || 0) - (a.deployed_at || 0));
      
    return locDeployments[0] || null;
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
