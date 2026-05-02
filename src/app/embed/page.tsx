'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Mic, MicOff, X, ThumbsUp, ThumbsDown, ChevronDown, ChevronUp } from 'lucide-react';
import { parseAssistantMessage } from '@/lib/utils';
import type { StepGuide } from '@/lib/types';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  stepGuide?: StepGuide;
  pending?: boolean;
}

interface PageContext {
  url?: string;
  pageTitle?: string;
  screenshot?: string;
  triggeredBy?: string;
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-gray-400 block"
          style={{ animation: `pulseDot 1.4s ease-in-out ${i * 0.16}s infinite` }}
        />
      ))}
    </div>
  );
}

function StepGuideCard({ guide, onHighlight }: { guide: StepGuide; onHighlight: (selector: string, label: string) => void }) {
  const [open, setOpen] = useState(true);
  const [activeStep, setActiveStep] = useState(0);

  function handleStepClick(step: StepGuide['steps'][0], i: number) {
    setActiveStep(i);
    if (step.highlight) onHighlight(step.highlight, step.instruction);
  }

  return (
    <div className="mt-2 border border-indigo-100 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-indigo-50 text-left"
      >
        <span className="text-sm font-semibold text-indigo-700">{guide.title}</span>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-indigo-400" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />}
      </button>
      {open && (
        <div className="divide-y divide-gray-50">
          {guide.steps.map((step, i) => (
            <button
              key={i}
              onClick={() => handleStepClick(step, i)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
                activeStep === i ? 'bg-indigo-50/50' : ''
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 ${
                  activeStep === i
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {i + 1}
              </span>
              <span className="text-sm text-gray-700 leading-snug">{step.instruction}</span>
              {step.highlight && (
                <span className="ml-auto text-xs text-indigo-400 flex-shrink-0">→ highlight</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  msg,
  onHighlight,
  onFeedback,
}: {
  msg: Message;
  onHighlight: (selector: string, label: string) => void;
  onFeedback: (positive: boolean) => void;
}) {
  if (msg.role === 'user') {
    return (
      <div className="flex justify-end mb-3">
        <div className="bg-indigo-500 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[85%] text-sm leading-relaxed">
          {msg.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 mb-4">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold mt-0.5">
        A
      </div>
      <div className="flex-1 min-w-0">
        {msg.pending ? (
          <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
            <TypingDots />
          </div>
        ) : (
          <>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {msg.text}
            </div>
            {msg.stepGuide && (
              <StepGuideCard guide={msg.stepGuide} onHighlight={onHighlight} />
            )}
            <div className="flex gap-1 mt-1 ml-1">
              <button
                onClick={() => onFeedback(true)}
                className="text-gray-300 hover:text-green-500 transition-colors p-1"
                title="Helpful"
              >
                <ThumbsUp className="w-3 h-3" />
              </button>
              <button
                onClick={() => onFeedback(false)}
                className="text-gray-300 hover:text-red-400 transition-colors p-1"
                title="Not helpful"
              >
                <ThumbsDown className="w-3 h-3" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function EmbedWidget() {
  const [orgId, setOrgId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [assistantName, setAssistantName] = useState('Aria');
  const [primaryColor, setPrimaryColor] = useState('#6366f1');
  const [welcomeMessage, setWelcomeMessage] = useState("Hi! I'm your AI guide. How can I help?");

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [pageCtx, setPageCtx] = useState<PageContext>({});
  const [screenshotData, setScreenshotData] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const historyRef = useRef<{ role: 'user' | 'assistant'; content: string }[]>([]);

  // Parse URL params
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setOrgId(p.get('orgId') || '');
    setApiKey(p.get('apiKey') || '');
    setSessionId(p.get('sessionId') || crypto.randomUUID());

    // Fetch org settings for branding
    const oid = p.get('orgId');
    if (oid) {
      fetch(`/api/settings`)
        .then((r) => r.json())
        .then((s) => {
          if (s.assistantName) setAssistantName(s.assistantName);
          if (s.primaryColor) setPrimaryColor(s.primaryColor);
          if (s.welcomeMessage) setWelcomeMessage(s.welcomeMessage);
        })
        .catch(() => {});
    }
  }, []);

  // Show welcome message
  useEffect(() => {
    if (!welcomeMessage) return;
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        text: welcomeMessage,
      },
    ]);
  }, [welcomeMessage]);

  // Listen to parent messages
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || e.data.source !== 'muongozo-parent') return;
      const { type } = e.data;
      if (type === 'PAGE_CONTEXT') {
        setPageCtx({
          url: e.data.url,
          pageTitle: e.data.title,
          triggeredBy: e.data.trigger,
        });
        if (e.data.trigger && e.data.trigger !== 'user') {
          const triggerIntros: Record<string, string> = {
            inactivity: "You've been here a while — need help with anything on this page?",
            rage_click: "Looks like something isn't working as expected. Want me to help?",
            error: "I noticed an error on the page. I can try to help you troubleshoot.",
          };
          const intro = triggerIntros[e.data.trigger];
          if (intro) {
            setMessages((prev) => [
              ...prev,
              { id: crypto.randomUUID(), role: 'assistant', text: intro },
            ]);
          }
        }
      } else if (type === 'SCREENSHOT_RESPONSE') {
        setScreenshotData(e.data.screenshot);
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function postToParent(msg: object) {
    window.parent.postMessage({ ...msg, source: 'muongozo-widget' }, '*');
  }

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming || !orgId || !apiKey) return;

      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text };
      const pendingId = crypto.randomUUID();
      const pendingMsg: Message = { id: pendingId, role: 'assistant', text: '', pending: true };

      setMessages((prev) => [...prev, userMsg, pendingMsg]);
      historyRef.current.push({ role: 'user', content: text });
      setInput('');
      setIsStreaming(true);

      // Request screenshot from parent
      postToParent({ type: 'SCREENSHOT_REQUEST' });
      await new Promise((r) => setTimeout(r, 300));

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Org-Id': orgId,
            'X-Api-Key': apiKey,
          },
          body: JSON.stringify({
            messages: historyRef.current,
            sessionId,
            context: {
              ...pageCtx,
              screenshot: screenshotData || undefined,
            },
          }),
        });

        if (!res.ok || !res.body) throw new Error('Request failed');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);
            if (data === '[DONE]') break;
            try {
              const { text: chunk, error } = JSON.parse(data);
              if (error) throw new Error(error);
              if (chunk) {
                fullText += chunk;
                const { text: cleanText, stepGuide } = parseAssistantMessage(fullText);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === pendingId ? { ...m, text: cleanText, stepGuide, pending: false } : m
                  )
                );
              }
            } catch {
              // ignore parse errors on partial chunks
            }
          }
        }

        historyRef.current.push({ role: 'assistant', content: fullText });
        const { stepGuide } = parseAssistantMessage(fullText);
        if (stepGuide) postToParent({ type: 'LOG_EVENT', data: { type: 'step_guide_shown' } });
      } catch (err) {
        const errText = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        setMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId ? { ...m, text: errText, pending: false } : m
          )
        );
      } finally {
        setIsStreaming(false);
        setScreenshotData(null);
        inputRef.current?.focus();
      }
    },
    [isStreaming, orgId, apiKey, sessionId, pageCtx, screenshotData]
  );

  function handleHighlight(selector: string, label: string) {
    postToParent({ type: 'HIGHLIGHT_ELEMENT', data: { selector, label } });
  }

  function handleFeedback(positive: boolean) {
    postToParent({
      type: 'LOG_EVENT',
      data: { type: positive ? 'feedback_positive' : 'feedback_negative' },
    });
  }

  function handleClose() {
    postToParent({ type: 'CLOSE' });
  }

  function toggleVoice() {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const SpeechRecognition =
      (window as typeof window & { SpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition ||
      (window as typeof window & { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
    };
    rec.onend = () => setIsListening(false);
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  }

  const initial = assistantName.charAt(0).toUpperCase();

  return (
    <div
      className="flex flex-col h-screen bg-white font-sans text-sm"
      style={{ '--brand': primaryColor } as React.CSSProperties}
    >
      <style>{`
        @keyframes pulseDot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        :root { --brand: ${primaryColor}; }
        .btn-brand { background-color: ${primaryColor}; }
        .btn-brand:hover { filter: brightness(0.9); }
        .ring-brand:focus { box-shadow: 0 0 0 2px ${primaryColor}40; }
        .text-brand { color: ${primaryColor}; }
        .bg-brand-msg { background-color: ${primaryColor}; }
        .avatar-bg { background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}cc); }
        .step-active { background-color: ${primaryColor}; }
      `}</style>

      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-gray-100"
        style={{ borderBottom: `1px solid ${primaryColor}20` }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold avatar-bg"
          >
            {initial}
          </div>
          <div>
            <div className="font-semibold text-gray-900 leading-tight">{assistantName}</div>
            <div className="text-[10px] text-gray-400">AI Guide · Powered by Muongozo</div>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            onHighlight={handleHighlight}
            onFeedback={handleFeedback}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-gray-100">
        <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 ring-brand">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
            placeholder="Ask me anything…"
            disabled={isStreaming}
            className="flex-1 bg-transparent text-sm text-gray-800 placeholder-gray-400 outline-none disabled:opacity-50"
          />
          <button
            onClick={toggleVoice}
            className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
              isListening ? 'bg-red-100 text-red-500' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-200'
            }`}
            title={isListening ? 'Stop recording' : 'Voice input'}
          >
            {isListening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-40 btn-brand"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="text-center mt-1.5">
          <span className="text-[9px] text-gray-300">Powered by Muongozo × Claude</span>
        </div>
      </div>
    </div>
  );
}
