export interface Organization {
  id: string;
  name: string;
  apiKey: string;
  assistantName: string;
  assistantPersonality: string;
  primaryColor: string;
  widgetPosition: 'bottom-right' | 'bottom-left';
  welcomeMessage: string;
  smartTriggers: {
    inactivity: boolean;
    inactivityDelay: number;
    rageClick: boolean;
    errorDetection: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  docId: string;
  content: string;
  keywords: string[];
  order: number;
}

export interface KnowledgeDocument {
  id: string;
  orgId: string;
  title: string;
  content: string;
  source: string;
  type: 'text' | 'url' | 'faq';
  chunks: KnowledgeChunk[];
  createdAt: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatContext {
  url?: string;
  pageTitle?: string;
  screenshot?: string;
  triggeredBy?: 'user' | 'inactivity' | 'rage_click' | 'error';
}

export type AnalyticsEventType =
  | 'widget_open'
  | 'widget_close'
  | 'message_sent'
  | 'step_guide_shown'
  | 'trigger_fired'
  | 'feedback_positive'
  | 'feedback_negative'
  | 'knowledge_miss';

export interface AnalyticsEvent {
  id: string;
  orgId: string;
  sessionId: string;
  type: AnalyticsEventType;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface StepGuide {
  title: string;
  steps: {
    instruction: string;
    highlight?: string;
  }[];
}
