import Link from 'next/link';

const features = [
  {
    icon: '🧠',
    title: 'Knows Your Product',
    desc: 'Feed it your docs, FAQs, and SOPs. It answers questions with your exact knowledge — not generic guesses.',
  },
  {
    icon: '⚡',
    title: 'Smart Triggers',
    desc: 'Detects rage-clicks, idle time, and JS errors. Proactively offers help before users give up.',
  },
  {
    icon: '🗺️',
    title: 'Step-by-Step Guides',
    desc: 'Claude returns structured walkthroughs that highlight UI elements directly on the page.',
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    desc: 'See what users ask most, where they get stuck, and which triggers fire most often.',
  },
  {
    icon: '🌐',
    title: 'Works Everywhere',
    desc: 'One <script> tag embeds in any web app. No installs, no downloads — works across all OS and browsers.',
  },
  {
    icon: '🔒',
    title: 'Your Brand, Your Rules',
    desc: 'Custom assistant name, personality, colours, and welcome message per organisation.',
  },
];

export default function LandingPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const orgId = process.env.DEFAULT_ORG_ID || 'demo-org';
  const apiKey = process.env.DEFAULT_ORG_API_KEY || 'demo-key-change-this';

  const embedSnippet = `<script
  src="${appUrl}/muongozo.js"
  data-org-id="${orgId}"
  data-api-key="${apiKey}"
  data-position="bottom-right"
  async
></script>`;

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-white font-bold text-sm">
            M
          </div>
          <span className="font-semibold text-gray-900">Muongozo</span>
        </div>
        <Link
          href="/dashboard"
          className="bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          Open Dashboard →
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 px-3 py-1 rounded-full text-sm font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
          Powered by Claude · Built for Teams
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          An AI guide your users<br />
          <span className="text-brand-500">actually want to use</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Muongozo embeds into any web app and gives users instant, context-aware
          help — powered by your own documentation. Smarter than a chatbot.
          Cheaper than a support team.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="bg-brand-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/25"
          >
            Open Dashboard
          </Link>
          <Link
            href="/embed?orgId=demo-org&apiKey=demo-key-change-this"
            target="_blank"
            className="border border-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
          >
            Try the Widget →
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-gray-100 hover:border-brand-100 hover:bg-brand-50/30 transition-colors"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Embed snippet */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <div className="bg-gray-900 rounded-2xl p-8">
          <p className="text-gray-400 text-sm mb-4 font-mono uppercase tracking-wider">
            Add to your app in 30 seconds
          </p>
          <pre className="text-green-400 text-sm font-mono leading-relaxed whitespace-pre-wrap break-all">
            {embedSnippet}
          </pre>
          <p className="text-gray-500 text-xs mt-4">
            That&apos;s it. Your users now have an AI guide that knows your product.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400">
        Muongozo — &quot;guide&quot; in Swahili · Built with Claude claude-sonnet-4-6
      </footer>
    </div>
  );
}
