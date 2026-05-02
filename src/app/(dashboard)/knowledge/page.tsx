'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, BookOpen, FileText, HelpCircle, Loader2 } from 'lucide-react';

interface DocSummary {
  id: string;
  title: string;
  source: string;
  type: string;
  chunkCount: number;
  createdAt: string;
}

const typeIcons: Record<string, React.ReactNode> = {
  text: <FileText className="w-4 h-4" />,
  url: <BookOpen className="w-4 h-4" />,
  faq: <HelpCircle className="w-4 h-4" />,
};

const typeColors: Record<string, string> = {
  text: 'bg-blue-50 text-blue-600',
  url: 'bg-purple-50 text-purple-600',
  faq: 'bg-amber-50 text-amber-600',
};

export default function KnowledgePage() {
  const [docs, setDocs] = useState<DocSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', type: 'text' as const });

  async function loadDocs() {
    const res = await fetch('/api/knowledge');
    setDocs(await res.json());
    setLoading(false);
  }

  useEffect(() => { loadDocs(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch('/api/knowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setForm({ title: '', content: '', type: 'text' });
    setShowForm(false);
    await loadDocs();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this document?')) return;
    await fetch(`/api/knowledge?id=${id}`, { method: 'DELETE' });
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">
            Add your docs, FAQs, and guides. The AI uses these to answer user questions accurately.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Document
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <form
          onSubmit={handleAdd}
          className="bg-white rounded-xl border border-brand-100 p-6 mb-6 shadow-sm"
        >
          <h2 className="font-semibold text-gray-900 mb-4">New Document</h2>
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. How to reset your password"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as 'text' | 'faq' }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                >
                  <option value="text">Documentation</option>
                  <option value="faq">FAQ</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                required
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
                placeholder="Paste your documentation content here..."
                rows={8}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono resize-y"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-600 disabled:opacity-50"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {saving ? 'Saving…' : 'Save Document'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Doc list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading…
        </div>
      ) : docs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No documents yet</p>
          <p className="text-sm mt-1">Add your first document to power the AI guide.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center gap-4"
            >
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${typeColors[doc.type] || 'bg-gray-100 text-gray-500'}`}
              >
                {typeIcons[doc.type] || <FileText className="w-4 h-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{doc.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {doc.chunkCount} chunk{doc.chunkCount !== 1 ? 's' : ''} ·{' '}
                  {new Date(doc.createdAt).toLocaleDateString()}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[doc.type] || 'bg-gray-100 text-gray-500'}`}>
                {doc.type}
              </span>
              <button
                onClick={() => handleDelete(doc.id)}
                className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
