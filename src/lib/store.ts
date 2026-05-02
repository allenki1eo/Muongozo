import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Organization, KnowledgeDocument, AnalyticsEvent } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(filePath: string, data: unknown) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Organizations ──────────────────────────────────────────────────────────────

export function getOrg(id: string): Organization | null {
  return readJSON<Organization | null>(
    path.join(DATA_DIR, 'orgs', `${id}.json`),
    null
  );
}

export function saveOrg(org: Organization) {
  writeJSON(path.join(DATA_DIR, 'orgs', `${org.id}.json`), org);
}

export function listOrgs(): Organization[] {
  const dir = path.join(DATA_DIR, 'orgs');
  ensureDir(dir);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) =>
      readJSON<Organization>(path.join(dir, f), null as unknown as Organization)
    )
    .filter(Boolean);
}

/** Creates the demo org + seeds sample knowledge on first run. */
export function ensureDefaultOrg(): Organization {
  const id = process.env.DEFAULT_ORG_ID || 'demo-org';
  const existing = getOrg(id);
  if (existing) return existing;

  const org: Organization = {
    id,
    name: 'Acme Corp',
    apiKey: process.env.DEFAULT_ORG_API_KEY || 'demo-key-change-this',
    assistantName: 'Aria',
    assistantPersonality:
      'friendly, concise, and solution-focused. Always guide users to their goal in the fewest steps possible.',
    primaryColor: '#6366f1',
    widgetPosition: 'bottom-right',
    welcomeMessage:
      "Hi! I'm Aria, your AI guide. Ask me anything or I'll help you get started.",
    smartTriggers: {
      inactivity: true,
      inactivityDelay: 40,
      rageClick: true,
      errorDetection: true,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  saveOrg(org);
  seedDemoKnowledge(id);
  return org;
}

function seedDemoKnowledge(orgId: string) {
  const { processDocumentContent } = require('./knowledge') as typeof import('./knowledge');

  const docs = [
    {
      title: 'Getting Started Guide',
      content: `Welcome to Acme Corp!\n\nTo get started:\n1. Complete your profile by clicking your avatar in the top-right corner.\n2. Explore the Dashboard to see your projects.\n3. Invite team members via Settings > Team.\n4. Create your first project using the + New Project button.\n\nIf you get stuck, our support team is available Monday–Friday 9am–6pm EST.`,
      source: 'internal',
      type: 'text' as const,
    },
    {
      title: 'How to Reset Your Password',
      content: `Forgot your password? Here's how to reset it:\n\n1. Go to the login page at app.acmecorp.com.\n2. Click "Forgot password?" below the login form.\n3. Enter your email address and click Send Reset Link.\n4. Check your inbox (and spam folder) for an email from noreply@acmecorp.com.\n5. Click the link in the email — it expires in 24 hours.\n6. Enter your new password twice and click Save.\n\nIf you don't receive the email within 5 minutes, contact support@acmecorp.com.`,
      source: 'internal',
      type: 'faq' as const,
    },
    {
      title: 'Account Settings Overview',
      content: `Account Settings lets you manage your profile, notifications, and security.\n\nProfile tab: Update your name, profile photo, job title, and timezone.\n\nNotifications tab: Choose which emails and in-app alerts you receive. You can disable non-essential notifications to reduce noise.\n\nSecurity tab: Change your password, enable two-factor authentication (2FA), and view active sessions. We strongly recommend enabling 2FA.\n\nBilling tab: View your current plan, update payment method, download invoices, and upgrade or downgrade your subscription.`,
      source: 'internal',
      type: 'text' as const,
    },
    {
      title: 'Billing & Subscriptions FAQ',
      content: `Q: How do I upgrade my plan?\nA: Go to Settings > Billing and click Upgrade. Changes take effect immediately and you'll be charged a prorated amount.\n\nQ: Can I cancel anytime?\nA: Yes. Go to Settings > Billing > Cancel Plan. Your access continues until the end of your current billing period.\n\nQ: How do I get a refund?\nA: We offer a 30-day money-back guarantee for new subscriptions. Contact billing@acmecorp.com.\n\nQ: Where can I download my invoices?\nA: Settings > Billing > Invoice History. Invoices are available as PDF.`,
      source: 'internal',
      type: 'faq' as const,
    },
  ];

  for (const d of docs) {
    const doc = processDocumentContent(orgId, d.title, d.content, d.source, d.type);
    saveKnowledgeDoc(doc);
  }
}

// ── Knowledge ──────────────────────────────────────────────────────────────────

export function getKnowledgeDocs(orgId: string): KnowledgeDocument[] {
  const dir = path.join(DATA_DIR, 'knowledge', orgId);
  ensureDir(dir);
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .map((f) =>
      readJSON<KnowledgeDocument>(
        path.join(dir, f),
        null as unknown as KnowledgeDocument
      )
    )
    .filter(Boolean);
}

export function saveKnowledgeDoc(doc: KnowledgeDocument) {
  writeJSON(
    path.join(DATA_DIR, 'knowledge', doc.orgId, `${doc.id}.json`),
    doc
  );
}

export function deleteKnowledgeDoc(orgId: string, docId: string) {
  const p = path.join(DATA_DIR, 'knowledge', orgId, `${docId}.json`);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// ── Analytics ──────────────────────────────────────────────────────────────────

export function logEvent(event: AnalyticsEvent) {
  const dir = path.join(DATA_DIR, 'analytics', event.orgId);
  ensureDir(dir);
  const date = new Date().toISOString().split('T')[0];
  fs.appendFileSync(
    path.join(dir, `${date}.jsonl`),
    JSON.stringify(event) + '\n'
  );
}

export function getAnalytics(orgId: string, days = 7): AnalyticsEvent[] {
  const dir = path.join(DATA_DIR, 'analytics', orgId);
  ensureDir(dir);
  const events: AnalyticsEvent[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 86_400_000)
      .toISOString()
      .split('T')[0];
    const fp = path.join(dir, `${date}.jsonl`);
    if (!fs.existsSync(fp)) continue;
    const lines = fs
      .readFileSync(fp, 'utf-8')
      .trim()
      .split('\n')
      .filter(Boolean);
    events.push(...lines.map((l) => JSON.parse(l) as AnalyticsEvent));
  }
  return events;
}
