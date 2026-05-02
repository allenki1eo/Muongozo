import { ensureDefaultOrg, getAnalytics, getKnowledgeDocs } from '@/lib/store';
import { MessageSquare, MousePointer2, BookOpen, Zap } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const org = ensureDefaultOrg();
  const events = getAnalytics(org.id, 7);
  const docs = getKnowledgeDocs(org.id);

  const totalMessages = events.filter((e) => e.type === 'message_sent').length;
  const widgetOpens = events.filter((e) => e.type === 'widget_open').length;
  const triggersFired = events.filter((e) => e.type === 'trigger_fired').length;

  // Build last-7-days daily message counts
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86_400_000);
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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const embedCode = `<script src="${appUrl}/muongozo.js" data-org-id="${org.id}" data-api-key="${org.apiKey}" async></script>`;

  const stats = [
    { label: 'Messages (7d)', value: totalMessages, icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
    { label: 'Widget Opens (7d)', value: widgetOpens, icon: MousePointer2, color: 'text-purple-600 bg-purple-50' },
    { label: 'Smart Triggers (7d)', value: triggersFired, icon: Zap, color: 'text-amber-600 bg-amber-50' },
    { label: 'Knowledge Docs', value: docs.length, icon: BookOpen, color: 'text-emerald-600 bg-emerald-50' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
        <p className="text-gray-500 text-sm mt-1">
          {org.assistantName} is active for <strong>{org.name}</strong>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl p-5 border border-gray-100">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              <Icon className="w-4.5 h-4.5 w-[18px] h-[18px]" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity chart */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">Messages — last 7 days</h2>
          <div className="flex items-end gap-2 h-24">
            {days.map((d) => {
              const count = dailyMap[d] || 0;
              const height = maxCount > 0 ? Math.max((count / maxCount) * 100, 4) : 4;
              return (
                <div key={d} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-brand-500 opacity-80 transition-all"
                    style={{ height: `${height}%`, minHeight: '4px' }}
                    title={`${count} messages`}
                  />
                  <span className="text-[10px] text-gray-400">
                    {new Date(d).toLocaleDateString('en', { weekday: 'short' }).slice(0, 1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Embed snippet */}
        <div className="bg-white rounded-xl p-6 border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">Your embed snippet</h2>
          <p className="text-xs text-gray-500 mb-3">
            Drop this in your app&apos;s HTML — just before the closing{' '}
            <code className="bg-gray-100 px-1 rounded">&lt;/body&gt;</code> tag.
          </p>
          <pre className="bg-gray-900 text-green-400 text-xs p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
            {embedCode}
          </pre>
        </div>
      </div>
    </div>
  );
}
