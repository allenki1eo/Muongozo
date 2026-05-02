import { v4 as uuidv4 } from 'uuid';
import type { KnowledgeChunk, KnowledgeDocument } from './types';
import { getKnowledgeDocs } from './store';

const CHUNK_SIZE = 600;
const CHUNK_OVERLAP = 80;
const TOP_K = 4;

const STOP_WORDS = new Set([
  'the','a','an','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','must','shall',
  'can','to','of','in','on','at','by','for','with','about','against','between',
  'into','through','during','before','after','above','below','from','up','down',
  'out','off','over','under','again','further','then','once','and','but','or',
  'nor','so','yet','both','either','neither','not','only','own','same','than',
  'too','very','just','it','its','this','that','these','those','i','you','he',
  'she','we','they','what','which','who','when','where','why','how','all','each',
  'every','any','few','more','most','other','some','such','no',
]);

export function extractKeywords(text: string): string[] {
  const freq: Record<string, number> = {};
  text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
    .forEach((w) => (freq[w] = (freq[w] || 0) + 1));

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25)
    .map(([w]) => w);
}

function chunkText(content: string): string[] {
  const paragraphs = content.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const para of paragraphs) {
    if (current.length + para.length > CHUNK_SIZE && current.length > 0) {
      chunks.push(current.trim());
      current = current.slice(-CHUNK_OVERLAP) + '\n\n' + para;
    } else {
      current += (current ? '\n\n' : '') + para;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function scoreChunk(chunk: KnowledgeChunk, queryKws: string[]): number {
  const kwSet = new Set(chunk.keywords);
  const contentLower = chunk.content.toLowerCase();
  let score = 0;
  for (const kw of queryKws) {
    if (kwSet.has(kw)) score += 2;
    else if (chunk.keywords.some((ck) => ck.includes(kw) || kw.includes(ck)))
      score += 0.5;
    if (contentLower.includes(kw)) score += 1;
  }
  return score;
}

export function retrieveKnowledge(orgId: string, query: string, topK = TOP_K): string {
  const docs = getKnowledgeDocs(orgId);
  if (!docs.length) return '';

  const queryKws = extractKeywords(query);
  const scored: { chunk: KnowledgeChunk; docTitle: string; score: number }[] = [];

  for (const doc of docs) {
    for (const chunk of doc.chunks) {
      const score = scoreChunk(chunk, queryKws);
      if (score > 0) scored.push({ chunk, docTitle: doc.title, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, topK);
  if (!top.length) return '';

  return top
    .map(({ chunk, docTitle }) => `[From: ${docTitle}]\n${chunk.content}`)
    .join('\n\n---\n\n');
}

export function processDocumentContent(
  orgId: string,
  title: string,
  content: string,
  source: string,
  type: KnowledgeDocument['type']
): KnowledgeDocument {
  const docId = uuidv4();
  const rawChunks = chunkText(content);

  const chunks: KnowledgeChunk[] = rawChunks.map((c, i) => ({
    id: uuidv4(),
    docId,
    content: c,
    keywords: extractKeywords(c),
    order: i,
  }));

  return { id: docId, orgId, title, content, source, type, chunks, createdAt: new Date().toISOString() };
}
