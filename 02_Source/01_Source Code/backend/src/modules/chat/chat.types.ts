export interface ChatContextFilters {
  material_id?: string;
  lot_id?: string;
  date_from?: string;
  date_to?: string;
}

export interface ChatAskRequest {
  question: string;
  locale?: string;
  context?: ChatContextFilters;
}

export interface ChatCitation {
  chunk_id: string;
  source_uri: string;
  section_path?: string;
  score: number;
}

export interface ChatAnswerData {
  answer: string;
  confidence: number;
  intent: string;
  citations: ChatCitation[];
  retrieval_trace_id: string;
  warnings?: string[];
  generated_at: string;
}

export interface RagServiceAnswerRequest {
  question: string;
  locale: string;
  correlation_id: string;
  role_context: string[];
  user_context: {
    user_id: string;
    username: string;
  };
  retrieval_hints?: {
    top_k?: number;
    intent?: string;
  };
  operational_context?: Record<string, unknown>;
}

export interface RagServiceAnswerResponse {
  answer_text: string;
  confidence: number;
  intent: string;
  citations: ChatCitation[];
  warnings?: string[];
  latency_breakdown?: Record<string, number>;
}
