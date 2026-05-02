import { NextRequest } from 'next/server';
import { ensureDefaultOrg, getKnowledgeDocs, saveKnowledgeDoc, deleteKnowledgeDoc } from '@/lib/store';
import { processDocumentContent } from '@/lib/knowledge';

function getOrgId() {
  ensureDefaultOrg();
  return process.env.DEFAULT_ORG_ID || 'demo-org';
}

export async function GET() {
  const orgId = getOrgId();
  const docs = getKnowledgeDocs(orgId).map((d) => ({
    id: d.id,
    title: d.title,
    source: d.source,
    type: d.type,
    chunkCount: d.chunks.length,
    createdAt: d.createdAt,
  }));
  return Response.json(docs);
}

export async function POST(req: NextRequest) {
  const orgId = getOrgId();
  const { title, content, source, type } = await req.json() as {
    title: string;
    content: string;
    source?: string;
    type?: 'text' | 'url' | 'faq';
  };

  if (!title?.trim() || !content?.trim()) {
    return Response.json({ error: 'title and content are required' }, { status: 400 });
  }

  const doc = processDocumentContent(orgId, title.trim(), content.trim(), source || '', type || 'text');
  saveKnowledgeDoc(doc);

  return Response.json({
    id: doc.id,
    title: doc.title,
    chunkCount: doc.chunks.length,
    createdAt: doc.createdAt,
  });
}

export async function DELETE(req: NextRequest) {
  const orgId = getOrgId();
  const id = new URL(req.url).searchParams.get('id');
  if (!id) return Response.json({ error: 'id required' }, { status: 400 });
  deleteKnowledgeDoc(orgId, id);
  return Response.json({ ok: true });
}
