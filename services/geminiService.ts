
import { GoogleGenAI, Type } from "@google/genai";
import { BrandBrain, ActionPlan, BuildPlan, RoleKey, ApprovalPack } from "../types";
import { MOCK_APPROVAL_PACK } from "../constants";

// Helper to ensure we get the latest API key and handle selection
const getAI = async () => {
  // 1. Prefer Process Env (Dev/Preview Environment)
  if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
    return new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  // 2. Handle AI Studio Injection (User Key Selection)
  if (window.aistudio) {
    try {
      // Race check to prevent hanging if the extension/injector is slow
      const hasKey = await Promise.race([
        window.aistudio.hasSelectedApiKey(),
        new Promise<boolean>(r => setTimeout(() => r(false), 500))
      ]);
      
      if (!hasKey) {
        await window.aistudio.openSelectKey();
        // Brief pause to allow key propagation
        await new Promise(r => setTimeout(r, 1000));
      }
    } catch (e) {
      console.warn("AI Studio key check failed", e);
    }
  }

  // 3. Fallback (This will likely throw an error on generateContent if empty, triggering the mock fallback)
  const envKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : '';
  return new GoogleGenAI({ apiKey: envKey || '' });
};

const OPERATOR_SYSTEM_PROMPT = `
You are the LIV8 GHL Operator, an AI agent running inside GoHighLevel.
Your job is to translate user requests into executable JSON plans.
You have access to GHL MCP tools.

RULES:
1. Return JSON ONLY.
2. If the user wants to perform an action, return type "action_plan".
3. If the action involves deleting, bulk sending, or modifying >1 contact, set riskLevel="high" and requiresConfirmation=true.
4. Tools: ghl.createContact, ghl.updateContact, ghl.sendSMS, ghl.sendEmail, ghl.createTask, ghl.searchContacts, ghl.triggerWorkflow.
`;

const BUILDER_SYSTEM_PROMPT = `
You are the LIV8 Setup OS. Your goal is to generate a comprehensive "Build Plan" to launch a business on GoHighLevel based on the brand identity and selected AI staff roles.

Input: Brand Identity (JSON), Selected Roles (Array).
Output: JSON matching the BuildPlan schema.

Requirements:
- Create pipelines that match the business niche.
- Create workflows for each selected Role (e.g., if 'AI_RECEPTIONIST' is selected, include 'Inbound Call Handling').
- Generate specific email/SMS sequence names relevant to the tone.
`;

// Simple timeout helper
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
    return Promise.race([
        promise,
        new Promise<T>((resolve) => setTimeout(() => {
            console.warn(`Operation timed out after ${ms}ms, using fallback`);
            resolve(fallback);
        }, ms))
    ]);
};

export const scanBrandIdentity = async (domain: string, description: string, socials: string = ""): Promise<BrandBrain> => {
  const mockBrain: BrandBrain = {
      brand_name: "Detected Brand",
      domain: domain || "example.com",
      socials: socials ? socials.split(',') : ["instagram.com/demo"],
      tone_profile: { professional: 0.7, friendly: 0.3, direct: 0.5 },
      key_services: ["Consulting", "Automation"],
      do_say: ["Absolutely"],
      dont_say: ["I don't know"],
      faqs: [{ q: "Cost?", a: "Varies by project" }],
      knowledge_base: [] // Initial empty KB
  };

  try {
    const ai = await getAI();
    const prompt = `Analyze brand: ${domain}. Description: ${description}. Social Media Links: ${socials}`;
    
    // Add timeout to prevent hanging
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: { 
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              brand_name: { type: Type.STRING },
              domain: { type: Type.STRING },
              socials: { type: Type.ARRAY, items: { type: Type.STRING } },
              tone_profile: {
                type: Type.OBJECT,
                properties: {
                  professional: { type: Type.NUMBER },
                  friendly: { type: Type.NUMBER },
                  direct: { type: Type.NUMBER }
                }
              },
              key_services: { type: Type.ARRAY, items: { type: Type.STRING } },
              do_say: { type: Type.ARRAY, items: { type: Type.STRING } },
              dont_say: { type: Type.ARRAY, items: { type: Type.STRING } },
              faqs: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: { q: { type: Type.STRING }, a: { type: Type.STRING } } 
                } 
              }
            }
          }
        }
      }),
      10000, // 10s timeout
      null as any
    );

    if (!response || !response.text) throw new Error("No response or timeout");

    const parsed = JSON.parse(response.text!);
    return { ...parsed, knowledge_base: [] } as BrandBrain;
  } catch (e) {
    console.warn("Scan failed or timed out, using mock", e);
    return mockBrain;
  }
};

export const generateBuildPlan = async (brand: BrandBrain, roles: RoleKey[] = []): Promise<BuildPlan> => {
  const mockPlan: BuildPlan = {
      type: "build_plan",
      summary: `LIV8 will deploy a "Speed-to-Lead" system for ${brand.brand_name}. Includes ${roles.length} active agents.`,
      requiresApproval: true,
      businessProfile: {
        niche: "General Business",
        offer: "Core Services",
        geo: "US",
        brandVoice: "Professional",
        goals: ["Increase Leads", "Automate Booking"]
      },
      assets: {
        pipelines: ["New Leads", "Hot Prospects", "Booked", "Sold"],
        workflows: ["Fast 5 (Speed to Lead)", ...roles.map(r => `Agent Flow: ${r}`)],
        emailSequences: ["Nurture Sequence (3 emails)", "Appointment Reminders"],
        smsSequences: ["Instant Lead Response"],
        pages: ["Booking Funnel", "Thank You Page"]
      },
      deployment: {
        locationId: "current_location",
        mappingNeeded: ["Calendar ID", "Twilio Number"],
        preflightChecks: ["Verify Domain DNS", "Connect Stripe"]
      }
  };

  try {
    const ai = await getAI();
    const prompt = `Create a GHL Build Plan for: ${JSON.stringify(brand)}. \nSelected Roles: ${JSON.stringify(roles)}`;
    
    // Add timeout
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
        systemInstruction: BUILDER_SYSTEM_PROMPT,
        responseMimeType: "application/json"
        }
      }),
      12000, // 12s timeout
      null as any
    );

    if (!response || !response.text) throw new Error("No response or timeout");
    
    const parsed = JSON.parse(response.text!) as BuildPlan;
    
    // Validate Structure from AI
    if (!parsed.assets || !parsed.assets.pipelines) {
       console.warn("AI returned incomplete plan, merging with mock defaults.");
       return { ...mockPlan, ...parsed, assets: { ...mockPlan.assets, ...parsed.assets } };
    }
    
    return parsed;
  } catch (e) {
      console.warn("Build Plan generation failed, using mock", e);
      return mockPlan;
  }
};

export const generateApprovalPack = async (brand: BrandBrain, roles: RoleKey[]): Promise<ApprovalPack> => {
  const mockPack: ApprovalPack = {
      ...MOCK_APPROVAL_PACK,
      brand_confirmed: {
        name: brand.brand_name || "Detected Brand",
        domain: brand.domain || "example.com"
      },
      ai_staff_actions: roles.map(r => ({ role: r, action: "Configured to answer with 'Professional' tone." })),
      deploy_steps: [
        "Inject Brand Brain into Knowledge Base",
        "Configure GHL Workflows for Speed-to-Lead",
        "Activate Voice Agent on Main Line"
      ],
      aeo_score_impact: "High (+45 points)"
  } as ApprovalPack;

  try {
    const ai = await getAI();
    const prompt = `Generate an Approval Pack for brand: ${brand.brand_name} (${brand.domain}).
    Roles selected: ${roles.join(", ")}.
    Context: ${JSON.stringify(brand)}`;

    // Race the API call against a 8s timeout to prevent hanging
    const response = await withTimeout(
        ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: prompt,
            config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                summary: { type: Type.STRING },
                brand_confirmed: {
                    type: Type.OBJECT,
                    properties: {
                    name: { type: Type.STRING },
                    domain: { type: Type.STRING }
                    }
                },
                ai_staff_actions: {
                    type: Type.ARRAY,
                    items: {
                    type: Type.OBJECT,
                    properties: {
                        role: { type: Type.STRING },
                        action: { type: Type.STRING }
                    }
                    }
                },
                deploy_steps: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                },
                aeo_score_impact: { type: Type.STRING }
                }
            }
            }
        }),
        8000, 
        null as any // Fallback managed below
    );
    
    if (!response || !response.text) throw new Error("Timeout");

    return JSON.parse(response.text!) as ApprovalPack;
  } catch (e) {
      console.warn("Approval Pack generation failed or timed out, using mock data.", e);
      return mockPack;
  }
};

export const generateActionPlan = async (userQuery: string, context: any): Promise<ActionPlan> => {
  const mockActionPlan: ActionPlan = {
      type: "action_plan",
      summary: "I will search for contacts matching 'John' and tag them. (Mock Mode)",
      requiresConfirmation: true,
      riskLevel: "medium",
      steps: [
        { id: "s1", tool: "ghl.searchContacts", input: { query: "John" }, onError: "continue" },
        { id: "s2", tool: "ghl.updateContact", input: { tags: ["Potential"] }, onError: "halt_and_ask" }
      ]
  };

  try {
    const ai = await getAI();
    const prompt = `Request: "${userQuery}". Context: ${JSON.stringify(context)}`;
    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: OPERATOR_SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["action_plan"] },
              summary: { type: Type.STRING },
              requiresConfirmation: { type: Type.BOOLEAN },
              riskLevel: { type: Type.STRING, enum: ["low", "medium", "high"] },
              context: { type: Type.OBJECT, properties: { locationId: { type: Type.STRING }, contactId: { type: Type.STRING } } },
              steps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    tool: { type: Type.STRING },
                    input: { type: Type.OBJECT, properties: {} },
                    onError: { type: Type.STRING }
                  }
                }
              }
            }
          }
        }
      }),
      10000,
      null as any
    );
    
    if (!response || !response.text) throw new Error("Timeout");
    return JSON.parse(response.text!) as ActionPlan;
  } catch (e) {
    console.warn("Action plan generation failed, using mock", e);
    return mockActionPlan;
  }
};
