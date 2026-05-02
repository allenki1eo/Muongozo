import { ensureDefaultOrg } from '@/lib/store';
import { ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

const METHOD_LABELS: Record<string, { title: string; badge?: string; badgeColor?: string; desc: string }> = {
  extension: {
    title: 'Chrome / Edge Extension',
    badge: 'Recommended for orgs',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    desc: 'IT deploys once via Google Workspace Admin or Microsoft Intune. Works on every website your team uses — Jira, Salesforce, your own apps, everything. Zero user action needed.',
  },
  bookmarklet: {
    title: 'Bookmarklet',
    badge: 'Instant demo',
    badgeColor: 'bg-amber-100 text-amber-700',
    desc: 'Drag the link to your bookmarks bar. Click it on any website to activate the guide. Great for demos and pilots before an IT rollout.',
  },
  gtm: {
    title: 'Google Tag Manager',
    badge: 'No developer needed',
    badgeColor: 'bg-blue-100 text-blue-700',
    desc: 'If your site already has GTM, add a Custom HTML tag. Takes 5 minutes. No code deploys. IT or marketing can do it.',
  },
  script: {
    title: 'Script Tag',
    desc: 'Traditional embed — add one line before </body>. Best when you own the codebase.',
  },
};

export default function InstallPage() {
  const org = ensureDefaultOrg();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const bookmarklet =
    `javascript:(function(){var s=document.createElement('script');` +
    `s.src='${appUrl}/muongozo.js';` +
    `s.setAttribute('data-org-id','${org.id}');` +
    `s.setAttribute('data-api-key','${org.apiKey}');` +
    `document.head.appendChild(s);})();`;

  const scriptTag =
    `<script\n  src="${appUrl}/muongozo.js"\n  data-org-id="${org.id}"\n  data-api-key="${org.apiKey}"\n  async\n></script>`;

  const gtmSnippet =
    `<!-- Muongozo AI Guide -->\n<script\n  src="${appUrl}/muongozo.js"\n  data-org-id="${org.id}"\n  data-api-key="${org.apiKey}"\n  async\n></script>`;

  const itPolicy = JSON.stringify(
    {
      ExtensionSettings: {
        '<EXTENSION_ID>': {
          installation_mode: 'force_installed',
          update_url: 'https://clients2.google.com/service/update2/crx',
          managed_configuration: {
            orgId: org.id,
            apiKey: org.apiKey,
            serverUrl: appUrl,
            position: org.widgetPosition,
          },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Install Guide</h1>
      <p className="text-sm text-gray-500 mb-8">
        Four ways to get {org.assistantName} into your users&apos; hands — without waiting for a developer.
      </p>

      {/* Extension */}
      <Method title={METHOD_LABELS.extension.title} badge={METHOD_LABELS.extension.badge} badgeColor={METHOD_LABELS.extension.badgeColor} desc={METHOD_LABELS.extension.desc}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            <strong>Step 1.</strong> Load the extension from{' '}
            <code className="bg-gray-100 px-1 rounded text-xs">extension/</code> folder in Chrome
            Developer Mode (for testing), or submit to the Chrome Web Store for production.
          </p>
          <p className="text-sm text-gray-600">
            <strong>Step 2.</strong> In Google Workspace Admin →{' '}
            <em>Devices &gt; Chrome &gt; Apps &amp; Extensions</em>, paste this policy JSON to
            force-install and pre-configure for all managed users:
          </p>
          <CodeBlock code={itPolicy} />
          <p className="text-xs text-gray-400">
            Replace <code>&lt;EXTENSION_ID&gt;</code> with your published extension&apos;s ID. Microsoft
            Intune and Jamf support the same managed_configuration pattern for Edge/Safari.
          </p>
        </div>
      </Method>

      {/* Bookmarklet */}
      <Method title={METHOD_LABELS.bookmarklet.title} badge={METHOD_LABELS.bookmarklet.badge} badgeColor={METHOD_LABELS.bookmarklet.badgeColor} desc={METHOD_LABELS.bookmarklet.desc}>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Drag this link to your bookmarks bar:</p>
          <a
            href={bookmarklet}
            className="inline-flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
            onClick={(e) => e.preventDefault()}
            draggable
          >
            ✦ Open {org.assistantName}
          </a>
          <p className="text-xs text-gray-400">Right-click → Copy Link, or drag to bookmarks bar.</p>
          <CodeBlock code={bookmarklet} />
        </div>
      </Method>

      {/* GTM */}
      <Method title={METHOD_LABELS.gtm.title} badge={METHOD_LABELS.gtm.badge} badgeColor={METHOD_LABELS.gtm.badgeColor} desc={METHOD_LABELS.gtm.desc}>
        <div className="space-y-3">
          <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
            <li>In GTM, click <strong>Add Tag → Custom HTML</strong></li>
            <li>Paste the snippet below</li>
            <li>Set trigger to <em>All Pages</em> (or specific pages)</li>
            <li>Submit &amp; Publish — done</li>
          </ol>
          <CodeBlock code={gtmSnippet} />
        </div>
      </Method>

      {/* Script tag */}
      <Method title={METHOD_LABELS.script.title} desc={METHOD_LABELS.script.desc}>
        <CodeBlock code={scriptTag} />
      </Method>
    </div>
  );
}

function Method({
  title,
  badge,
  badgeColor,
  desc,
  children,
}: {
  title: string;
  badge?: string;
  badgeColor?: string;
  desc: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6 mb-5">
      <div className="flex items-start justify-between gap-4 mb-2">
        <h2 className="font-semibold text-gray-900">{title}</h2>
        {badge && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${badgeColor}`}>
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4 leading-relaxed">{desc}</p>
      {children}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-gray-900 text-green-400 text-xs font-mono p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-all leading-relaxed">
      {code}
    </pre>
  );
}
