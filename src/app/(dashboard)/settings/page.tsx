'use client';

import { useEffect, useState } from 'react';
import { Loader2, Save, Copy, Check } from 'lucide-react';

interface OrgSettings {
  name: string;
  assistantName: string;
  assistantPersonality: string;
  primaryColor: string;
  widgetPosition: 'bottom-right' | 'bottom-left';
  welcomeMessage: string;
  apiKey: string;
  smartTriggers: {
    inactivity: boolean;
    inactivityDelay: number;
    rageClick: boolean;
    errorDetection: boolean;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/settings').then((r) => r.json()).then(setSettings);
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function copyKey() {
    if (settings?.apiKey) {
      navigator.clipboard.writeText(settings.apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Configure your AI guide&apos;s identity and behaviour.</p>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organisation */}
        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Organisation</h2>
          <div className="space-y-4">
            <Field label="Organisation Name">
              <input
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        {/* Assistant */}
        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">AI Assistant</h2>
          <div className="space-y-4">
            <Field label="Assistant Name" hint="This is what users see in the widget header.">
              <input
                value={settings.assistantName}
                onChange={(e) => setSettings({ ...settings, assistantName: e.target.value })}
                className={inputCls}
              />
            </Field>
            <Field label="Personality" hint="Describe the tone and style in a few words.">
              <input
                value={settings.assistantPersonality}
                onChange={(e) => setSettings({ ...settings, assistantPersonality: e.target.value })}
                placeholder="e.g. friendly, concise, solution-focused"
                className={inputCls}
              />
            </Field>
            <Field label="Welcome Message">
              <input
                value={settings.welcomeMessage}
                onChange={(e) => setSettings({ ...settings, welcomeMessage: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>
        </section>

        {/* Appearance */}
        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Appearance</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Brand Colour">
              <div className="flex gap-2 items-center">
                <input
                  type="color"
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="w-10 h-9 rounded cursor-pointer border border-gray-200"
                />
                <input
                  value={settings.primaryColor}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </Field>
            <Field label="Widget Position">
              <select
                value={settings.widgetPosition}
                onChange={(e) =>
                  setSettings({ ...settings, widgetPosition: e.target.value as OrgSettings['widgetPosition'] })
                }
                className={`${inputCls} bg-white`}
              >
                <option value="bottom-right">Bottom Right</option>
                <option value="bottom-left">Bottom Left</option>
              </select>
            </Field>
          </div>
        </section>

        {/* Smart Triggers */}
        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Smart Triggers</h2>
          <p className="text-xs text-gray-500 mb-4">
            Proactively offer help when the widget detects user friction.
          </p>
          <div className="space-y-3">
            <Toggle
              label="Idle detection"
              hint={`Offer help after ${settings.smartTriggers.inactivityDelay}s of inactivity`}
              checked={settings.smartTriggers.inactivity}
              onChange={(v) =>
                setSettings({ ...settings, smartTriggers: { ...settings.smartTriggers, inactivity: v } })
              }
            />
            <Toggle
              label="Rage-click detection"
              hint="Detect rapid repeated clicks on the same element"
              checked={settings.smartTriggers.rageClick}
              onChange={(v) =>
                setSettings({ ...settings, smartTriggers: { ...settings.smartTriggers, rageClick: v } })
              }
            />
            <Toggle
              label="JavaScript error detection"
              hint="Offer help when an unhandled error occurs on the page"
              checked={settings.smartTriggers.errorDetection}
              onChange={(v) =>
                setSettings({ ...settings, smartTriggers: { ...settings.smartTriggers, errorDetection: v } })
              }
            />
            {settings.smartTriggers.inactivity && (
              <div className="pl-6 pt-1">
                <label className="block text-xs text-gray-500 mb-1">
                  Inactivity delay (seconds)
                </label>
                <input
                  type="number"
                  min={10}
                  max={300}
                  value={settings.smartTriggers.inactivityDelay}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      smartTriggers: {
                        ...settings.smartTriggers,
                        inactivityDelay: parseInt(e.target.value),
                      },
                    })
                  }
                  className={`${inputCls} w-24`}
                />
              </div>
            )}
          </div>
        </section>

        {/* API Key */}
        <section className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-1">Widget API Key</h2>
          <p className="text-xs text-gray-500 mb-3">
            Use this in your embed snippet. Keep it out of public git repos.
          </p>
          <div className="flex gap-2">
            <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 truncate">
              {settings.apiKey}
            </code>
            <button
              type="button"
              onClick={copyKey}
              className="flex items-center gap-1.5 border border-gray-200 px-3 py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        </section>

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 bg-brand-500 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-brand-600 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Settings'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <div className="relative mt-0.5">
        <input type="checkbox" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <div
          className={`w-9 h-5 rounded-full transition-colors ${checked ? 'bg-brand-500' : 'bg-gray-200'}`}
        />
        <div
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`}
        />
      </div>
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        <div className="text-xs text-gray-400">{hint}</div>
      </div>
    </label>
  );
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500';
