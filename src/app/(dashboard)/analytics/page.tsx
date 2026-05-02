import { ensureDefaultOrg, getAnalytics } from '@/lib/store';
import { MessageSquare, MousePointer2, Zap, TrendingUp } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function AnalyticsPage() {
  const org = ensureDefaultOrg();
  const events = getAnalytics(org.id, 14);

  const totalMessages = events.filter((e) => e.type === 'message_sent').length;
  const widgetOpens = events.filter((e) => e.type === 'widget_open').length;
  const triggers = events.filter((e) => e.type === 'trigger_fired');

  const triggerBreakdown: Record<string, number> = {};
  for (const t of triggers) {
    const key = (t.data.trigger as string) || 'unknown';
    triggerBreakdown[key] = (triggerBreakdown[key] || 0) + 1;
  }

  // 14-day daily breakdown
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() - (13 - i) * 86_400_000);
    return d.toISOString().split('T')[0];
  });

  const dailyMap: Record<string, number> = {};
  for (const e of events) {
    if (e.type === 'message_sent') {
      const d = e.timestamp.split('T')[0];
      dailyMap[d] = (dailyMap[d] || 0) + 1;
    }
  }
  const maxCount = Math.max(...days.map((d) => dailyMap[d] || 0), 1);

  // Page distribution
  const pageCounts: Record<string, number> = {};
  for (const e of events) {
    if (e.type === 'message_sent' && e.data.url) {
      const url = e.data.url as string;
      try {
        const path = new URL(url).pathname;
        pageCounts[path] = (pageCounts[path] || 0) + 1;
      } catch {
        pageCounts[url] = (pageCounts[url] || 0) + 1;
      }
    }
  }
  const topPages = Object.entries(pageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const triggerLabels: Record<string, string> = {
    inactivity: 'Idle / Stuck',
    rage_click: 'Rage Click',
    error: 'JS Error',
    user: 'User-initiated',
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Analytics</h1>
      <p className="text-sm text-gray-500 mb-8">Last 14 days · {org.name}</p>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Messages', value: totalMessages, icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
          { label: 'Widget Opens', value: widgetOpens, icon: MousePointer2, color: 'text-purple-600 bg-purple-50' },
          { label: 'Smart Triggers Fired', value: triggers.length, icon: Zap, color: 'text-amber-600 bg-amber-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 border border-gray-100">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-[18px] h-[18px]" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-brand-500" />
            <h2 className="font-semibold text-gray-900">Daily Messages — 14 days</h2>
          </div>
          {totalMessages === 0 ? (
            <div className="h-28 flex items-center justify-center text-gray-400 text-sm">
              No data yet — embed the widget to start seeing activity
            </div>
          ) : (
            <div className="flex items-end gap-1 h-28">
              {days.map((d) => {
                const count = dailyMap[d] || 0;
                const pct = (count / maxCount) * 100;
                return (
                  <div key={d} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t bg-brand-500 opacity-75"
                      style={{ height: `${Math.max(pct, 3)}%`, minHeight: '3px' }}
                      title={`${count}`}
                    />
                    <span className="text-[9px] text-gray-300">
                      {new Date(d + 'T00:00:00').getDate()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Smart trigger breakdown */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="font-semibold text-gray-900">Smart Trigger Breakdown</h2>
          </div>
          {Object.keys(triggerBreakdown).length === 0 ? (
            <div className="py-8 text-center text-gray-400 text-sm">
              No triggers fired yet
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(triggerBreakdown)
                .sort((a, b) => b[1] - a[1])
                .map(([key, count]) => {
                  const pct = Math.round((count / triggers.length) * 100);
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{triggerLabels[key] || key}</span>
                        <span className="text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Top pages */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 mb-4">Top Pages Where Users Ask for Help</h2>
          {topPages.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              No page data yet
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {topPages.map(([path, count]) => {
                const maxP = topPages[0][1];
                return (
                  <div key={path} className="py-3 flex items-center gap-4">
                    <span className="text-sm font-mono text-gray-600 min-w-0 flex-1 truncate">
                      {path}
                    </span>
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-400 rounded-full"
                        style={{ width: `${(count / maxP) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
