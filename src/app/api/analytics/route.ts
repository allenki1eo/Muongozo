import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { ensureDefaultOrg, getAnalytics, logEvent } from '@/lib/store';
import type { AnalyticsEventType } from '@/lib/types';

export async function GET(req: NextRequest) {
  ensureDefaultOrg();
  const orgId = process.env.DEFAULT_ORG_ID || 'demo-org';
  const days = parseInt(new URL(req.url).searchParams.get('days') || '7');
  const events = getAnalytics(orgId, days);

  const stats = {
    totalMessages: 0,
    widgetOpens: 0,
    triggersFired: 0,
    dailyMessages: {} as Record<string, number>,
    triggerBreakdown: {} as Record<string, number>,
    recentEvents: events.slice(-50).reverse(),
  };

  for (const e of events) {
    const date = e.timestamp.split('T')[0];
    if (e.type === 'message_sent') {
      stats.totalMessages++;
      stats.dailyMessages[date] = (stats.dailyMessages[date] || 0) + 1;
    }
    if (e.type === 'widget_open') stats.widgetOpens++;
    if (e.type === 'trigger_fired') {
      stats.triggersFired++;
      const trigger = (e.data.trigger as string) || 'unknown';
      stats.triggerBreakdown[trigger] = (stats.triggerBreakdown[trigger] || 0) + 1;
    }
  }

  return Response.json(stats);
}

export async function POST(req: NextRequest) {
  const orgId = process.env.DEFAULT_ORG_ID || 'demo-org';
  const { sessionId, type, data } = await req.json() as {
    sessionId?: string;
    type: AnalyticsEventType;
    data?: Record<string, unknown>;
  };

  logEvent({
    id: uuidv4(),
    orgId,
    sessionId: sessionId || uuidv4(),
    type,
    data: data || {},
    timestamp: new Date().toISOString(),
  });

  return Response.json({ ok: true });
}
