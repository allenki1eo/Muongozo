import Anthropic from '@anthropic-ai/sdk';
import type { Organization, ChatContext, ChatMessage } from './types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export function buildSystemPrompt(
  org: Organization,
  knowledgeContext: string,
  ctx?: ChatContext
): string {
  const lines: string[] = [
    `You are ${org.assistantName}, the AI guide for ${org.name}.`,
    `Personality: ${org.assistantPersonality}`,
    '',
    '## Role',
    'Help users accomplish tasks, answer questions, and navigate the product.',
    'Be brief. Users need answers now, not essays.',
    '',
    '## Step-Guide Format',
    'When a task requires multiple steps, append a JSON block at the END of your reply:',
    '```json',
    '{',
    '  "stepGuide": {',
    '    "title": "How to do X",',
    '    "steps": [',
    '      { "instruction": "Click Settings in the top-right menu", "highlight": "#settings-btn" },',
    '      { "instruction": "Select the Billing tab" }',
    '    ]',
    '  }',
    '}',
    '```',
    'Rules: only include the JSON when steps genuinely help. Keep each instruction under 12 words.',
    'The "highlight" field is a CSS selector for the element to highlight on the page.',
    '',
  ];

  if (knowledgeContext) {
    lines.push('## Relevant Documentation', knowledgeContext, '');
  }

  if (ctx?.url) {
    lines.push(`## Current Page`, `URL: ${ctx.url}`);
    if (ctx.pageTitle) lines.push(`Title: ${ctx.pageTitle}`);
    lines.push('');
  }

  const triggerNotes: Record<string, string> = {
    inactivity: 'The user appears idle or stuck on this page.',
    rage_click: 'The user has been clicking repeatedly — they may be frustrated.',
    error: 'A JavaScript error occurred on this page.',
  };
  if (ctx?.triggeredBy && ctx.triggeredBy !== 'user') {
    const note = triggerNotes[ctx.triggeredBy];
    if (note) lines.push(`## Context`, note, '');
  }

  lines.push(
    '## Guidelines',
    '- Keep responses to 1–3 sentences unless steps are required',
    "- If unsure, say so — never fabricate product details",
    '- Acknowledge frustration briefly, then solve the problem',
    '- Reference UI elements by their visible label (e.g. "the blue Save button")',
  );

  return lines.join('\n');
}

type ContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } };

type MsgParam = { role: 'user' | 'assistant'; content: string | ContentPart[] };

export async function streamChatResponse(
  messages: ChatMessage[],
  systemPrompt: string,
  screenshot: string | undefined,
  onChunk: (text: string) => void
): Promise<void> {
  const formatted: MsgParam[] = messages.map((m, i) => {
    if (screenshot && i === messages.length - 1 && m.role === 'user') {
      return {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: screenshot.replace(/^data:image\/jpeg;base64,/, ''),
            },
          },
          { type: 'text', text: m.content },
        ],
      };
    }
    return { role: m.role, content: m.content };
  });

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: formatted,
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      onChunk(event.delta.text);
    }
  }
}
