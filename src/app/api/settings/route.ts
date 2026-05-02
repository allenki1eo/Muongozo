import { NextRequest } from 'next/server';
import { ensureDefaultOrg, getOrg, saveOrg } from '@/lib/store';
import type { Organization } from '@/lib/types';

function getOrgId() {
  ensureDefaultOrg();
  return process.env.DEFAULT_ORG_ID || 'demo-org';
}

export async function GET() {
  const org = getOrg(getOrgId());
  if (!org) return Response.json({ error: 'Not found' }, { status: 404 });
  const { apiKey: _, ...safe } = org;
  return Response.json({ ...safe, apiKey: org.apiKey });
}

export async function PUT(req: NextRequest) {
  const orgId = getOrgId();
  const existing = getOrg(orgId);
  if (!existing) return Response.json({ error: 'Not found' }, { status: 404 });

  const updates = await req.json() as Partial<Organization>;

  const updated: Organization = {
    ...existing,
    ...updates,
    id: existing.id,
    apiKey: existing.apiKey,
    updatedAt: new Date().toISOString(),
  };
  saveOrg(updated);
  return Response.json(updated);
}
