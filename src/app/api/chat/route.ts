import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getOrg, logEvent, ensureDefaultOrg } from '@/lib/store';
import { buildSystemPrompt, streamChatResponse } from '@/lib/claude';
import { retrieveKnowledge } from '@/lib/knowledge';

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Org-Id, X-Api-Key',
    },
  });
}

export async function POST(req: NextRequest) {
  const orgId = req.headers.get('X-Org-Id') || '';
  const apiKey = req.headers.get('X-Api-Key') || '';

  ensureDefaultOrg();
  const org = getOrg(orgId);

  if (!org || org.apiKey !== apiKey) {
    return Response.json({ error: 'Unauthorized' }, {
      status: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }

  const { messages, context, sessionId } = await req.json() as {
    messages: { role: 'user' | 'assistant'; content: string }[];
    context?: { url?: string; pageTitle?: string; screenshot?: string; triggeredBy?: string };
    sessionId?: string;
  };

  const lastMessage = messages.at(-1)?.content || '';
  const knowledgeContext = retrieveKnowledge(orgId, lastMessage);
  const systemPrompt = buildSystemPrompt(org, knowledgeContext, context);
  const sid = sessionId || uuidv4();

  logEvent({
    id: uuidv4(),
    orgId,
    sessionId: sid,
    type: 'message_sent',
    data: {
      url: context?.url,
      hasKnowledge: knowledgeContext.length > 0,
      triggeredBy: context?.triggeredBy || 'user',
      messageLength: lastMessage.length,
    },
    timestamp: new Date().toISOString(),
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        await streamChatResponse(
          messages,
          systemPrompt,
          context?.screenshot,
          (chunk) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }
        );
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
