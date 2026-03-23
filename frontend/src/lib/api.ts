const API_BASE_URL = 'http://localhost:8000/api';

function getHeaders(token?: string) {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

function toFiniteNumber(value: unknown): number | null {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

// Backend returns confidence as cosine similarity (0..1) and stores it as `confidence_score`.
// UI expects a percentage (0..100).
export function normalizeConfidencePercent(confidence: unknown): number {
    const n = toFiniteNumber(confidence);
    if (n === null) return 0;

    // If backend ever returns raw cosine similarity in [-1..1], map to [0..100]
    if (n < 0) {
        return Math.max(0, Math.min(100, ((n + 1) / 2) * 100));
    }

    // Common cases:
    // - 0..1 => scale to percent
    // - 0..100 => already percent
    const pct = n <= 1 ? n * 100 : n;
    return Math.max(0, Math.min(100, pct));
}

function normalizeMatch01(matchOrSimilarity: unknown): number {
    const n = toFiniteNumber(matchOrSimilarity);
    if (n === null) return 0;

    // If backend ever returns percent 0..100, convert to 0..1
    const v = n > 1 ? n / 100 : n;
    return Math.max(0, Math.min(1, v));
}

// ----------------------------
// UI-facing types (normalized)
// ----------------------------
export interface QuestionResponse {
    answer: string;
    // 0..100
    confidence: number;
    sources: Array<{ title: string; category: string; match: number }>;
}

export interface Query {
    id: string;
    question: string;
    category: string;
    // 0..100
    confidence: number;
    source: string;
    date: string;
}

export interface Document {
    id: string;
    title: string;
    category: string;
    content: string;
    created_at: string;
    updated_at: string;
}

// ----------------------------
// Backend payload shapes (raw)
// ----------------------------
type ApiRagSource = {
    title: string;
    category?: string | null;
    // Backend uses `similarity`; older frontend expected `match`
    similarity?: unknown;
    match?: unknown;
};

type ApiQuestionResponse = {
    answer: string;
    confidence: unknown;
    sources: ApiRagSource[];
};

export interface UserContext {
    id?: string;
    email?: string;
    name?: string;
}

export async function askQuestion(
    question: string,
    top_k: number = 3,
    user?: UserContext,
    token?: string
): Promise<QuestionResponse> {
    const res = await fetch(`${API_BASE_URL}/query`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({
            question,
            top_k,
            user_id: user?.id,
            user_email: user?.email,
            user_name: user?.name,
        }),
    });
    if (!res.ok) throw new Error('Failed to ask question');

    const raw = (await res.json()) as ApiQuestionResponse;
    console.log("[API] askQuestion raw response:", raw);
    return {
        answer: raw.answer,
        confidence: normalizeConfidencePercent(raw.confidence),
        sources: (raw.sources || []).map((s) => ({
            title: s.title,
            category: (s.category ?? "Unknown") as string,
            match: normalizeMatch01(s.match ?? s.similarity),
        })),
    };
}

export async function getQueries(userEmail?: string, token?: string): Promise<Query[]> {
    const url = userEmail
        ? `${API_BASE_URL}/queries?user_email=${encodeURIComponent(userEmail)}`
        : `${API_BASE_URL}/queries`;
    const res = await fetch(url, { headers: getHeaders(token) });
    if (!res.ok) throw new Error('Failed to fetch queries');
    const data = await res.json();
    console.log("[API] getQueries raw response:", data);

    // Supabase rows come back with schema-like keys.
    // Expected fields include: id, question, category, confidence_score, retrieved_doc_title, created_at
    const rows = (data?.queries ?? []) as Array<Record<string, unknown>>;
    return rows.map((r) => ({
        // Supabase may use UUID (string) or bigint; ensure we always produce a unique, stable string.
        id: String(r.id ?? r.created_at ?? `${r.question ?? ""}-${r.retrieved_doc_title ?? ""}`),
        question: String(r.question ?? ""),
        category: String(r.category ?? "Uncategorized"),
        confidence: normalizeConfidencePercent(r.confidence_score ?? r.confidence),
        source: String(r.retrieved_doc_title ?? r.source ?? "-"),
        date: String(r.created_at ?? r.date ?? new Date().toISOString()),
    }));
}

export async function getDocuments(token?: string): Promise<Document[]> {
    const res = await fetch(`${API_BASE_URL}/documents/`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error('Failed to fetch documents');
    const data = await res.json();
    console.log("[API] getDocuments raw response:", data);
    const rows = (data?.documents ?? []) as Array<Record<string, unknown>>;
    return rows.map((d) => ({
        id: String(d._id ?? d.id ?? ""),
        title: String(d.title ?? ""),
        category: String(d.category ?? "Uncategorized"),
        content: String(d.content ?? ""),
        created_at: String(d.created_at ?? ""),
        updated_at: String(d.updated_at ?? ""),
    }));
}

// ----------------------------
// Reports types
// ----------------------------
export interface ReportSummary {
    health_score: number;
    total_queries_in_period: number;
    total_low_confidence: number;
    clusters_identified: number;
    high_priority_count: number;
    medium_priority_count: number;
    low_priority_count: number;
}

export interface TopicCluster {
    cluster_id: number;
    priority: "high" | "medium" | "low";
    topic: string;
    question_count: number;
    avg_confidence: number;
    urgency_score: number;
    sample_questions: string[];
    related_documents: string[];
    recommendation: string;
    llm_analysis?: {
        failure_analysis: {
            missing_sop: number;
            ambiguous_documentation: number;
            wrong_document_retrieved: number;
            outdated_information: number;
            query_intent_misinterpretation: number;
        };
        knowledge_gap_insights: {
            what_employees_want_to_know: string;
            why_current_sop_fails: string;
            missing_information: string;
        };
        sop_recommendation: {
            problem: string;
            action: string;
            confidence: number;
        };
        auto_sop_rewrite: string;
    };
}

export interface SOPReport {
    status: string;
    report_date: string;
    period: string;
    generated_at: string;
    filters_used: {
        days: number;
        confidence_threshold: number;
        min_cluster_size: number;
    };
    summary: ReportSummary;
    productivity_impact: {
        unanswered_queries: number;
        avg_search_time_minutes: number;
        estimated_lost_minutes: number;
        estimated_lost_hours: number;
    };
    clusters: TopicCluster[];
}

export interface ReportFiltersParams {
    days: number;
    confidence_threshold: number;
    min_cluster_size: number;
}

// ----------------------------
// Analytics Enhancement types
// ----------------------------
export interface AnalyticsStats {
    total_queries: number;
    total_queries_trend: number;
    total_documents: number;
    avg_confidence: number;
    avg_confidence_trend: number;
    top_category: string;
    top_category_count: number;
}

export interface LowConfidenceQuery {
    id: string;
    question: string;
    answer: string;
    confidence_score: number;
    retrieved_doc_title: string | null;
    category: string | null;
    created_at: string;
}

export interface LowConfidenceResponse {
    queries: LowConfidenceQuery[];
    total: number;
    limit: number;
    offset: number;
}

export interface DocumentUsageItem {
    name: string;
    count: number;
}

export interface DocumentConfidenceItem {
    name: string;
    avg_confidence: number;
    query_count: number;
}

export interface TimelineResponse {
    timeline: Array<{ date: string; count: number }>;
    total_period: number;
    trend_vs_previous: number;
}

export async function analyzeTopicWithAI(payload: {
    topic: string;
    samples: string[];
    question_count: number;
    related_documents: string[];
}, token?: string): Promise<NonNullable<TopicCluster["llm_analysis"]>> {
    const res = await fetch(`${API_BASE_URL}/reports/analyze-topic`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(payload),
    });
    if (!res.ok) {
        throw new Error("Failed to analyze topic with AI");
    }
    const data = await res.json();
    return data.analysis;
}

// ----------------------------
// Reports API
// ----------------------------
export async function getSOPReport(filters: ReportFiltersParams, token?: string): Promise<SOPReport> {
    const params = new URLSearchParams({
        days: filters.days.toString(),
        confidence_threshold: filters.confidence_threshold.toString(),
        min_cluster_size: filters.min_cluster_size.toString(),
    });
    const res = await fetch(`${API_BASE_URL}/reports/sop-updates?${params}`, { headers: getHeaders(token) });
    if (!res.ok) {
        let msg = "Failed to generate SOP report";
        try {
            const body = await res.json();
            if (body?.message) msg = body.message;
        } catch { /* ignore parse errors */ }
        throw new Error(msg);
    }
    const data = await res.json();
    console.log("[API] getSOPReport raw response:", data);
    return data;
}

export async function exportSOPReportPdf(filters: ReportFiltersParams, token?: string): Promise<Blob> {
    const params = new URLSearchParams({
        days: filters.days.toString(),
        confidence_threshold: filters.confidence_threshold.toString(),
        min_cluster_size: filters.min_cluster_size.toString(),
    });

    const res = await fetch(`${API_BASE_URL}/reports/sop-updates/export-pdf?${params}`, {
        method: "GET",
        headers: {
            ...getHeaders(token),
            Accept: "application/pdf",
        },
    });

    if (!res.ok) {
        let msg = "Failed to export SOP report PDF";
        try {
            const body = await res.json();
            if (body?.message) msg = body.message;
        } catch { /* ignore parse errors */ }
        throw new Error(msg);
    }

    return res.blob();
}

export type ResolveTopicPayload = {
    topic_name: string;
    resolved_by?: string;
    notes?: string;
};

export async function resolveTopic(payload: ResolveTopicPayload, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/reports/resolve-topic`, {
        method: "POST",
        headers: getHeaders(token),
        body: JSON.stringify(payload),
    });

    if (!res.ok) {
        let msg = "Failed to resolve topic";
        try {
            const body = await res.json();
            if (body?.message) msg = body.message;
        } catch { /* ignore parse errors */ }
        throw new Error(msg);
    }
}

export async function unresolveTopic(topicName: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/reports/resolve-topic/${encodeURIComponent(topicName)}`, {
        method: "DELETE",
        headers: getHeaders(token),
    });

    if (!res.ok) {
        let msg = "Failed to unresolve topic";
        try {
            const body = await res.json();
            if (body?.message) msg = body.message;
        } catch { /* ignore parse errors */ }
        throw new Error(msg);
    }
}

// ----------------------------
// Analytics Enhancement APIs
// ----------------------------
export async function getAnalyticsStats(days: number = 30, token?: string): Promise<AnalyticsStats> {
    const res = await fetch(`${API_BASE_URL}/analytics/stats?days=${days}`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error("Failed to fetch analytics stats");
    return res.json();
}

export async function getLowConfidenceQueries(
    limit = 10,
    threshold = 0.5,
    offset = 0,
    sortBy: "confidence" | "date" = "confidence",
    sortOrder: "asc" | "desc" = "asc",
    token?: string
): Promise<LowConfidenceResponse> {
    const params = new URLSearchParams({
        limit: limit.toString(),
        threshold: threshold.toString(),
        offset: offset.toString(),
        sort_by: sortBy,
        sort_order: sortOrder,
    });
    const res = await fetch(`${API_BASE_URL}/analytics/low-confidence?${params}`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error("Failed to fetch low confidence queries");
    return res.json();
}

export async function getDocumentUsage(token?: string): Promise<{ most_used: DocumentUsageItem[] }> {
    const res = await fetch(`${API_BASE_URL}/analytics/document-usage`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error("Failed to fetch document usage");
    return res.json();
}

export async function getDocumentConfidence(token?: string): Promise<{ low_confidence: DocumentConfidenceItem[] }> {
    const res = await fetch(`${API_BASE_URL}/analytics/document-confidence`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error("Failed to fetch document confidence");
    return res.json();
}

export async function getTimelineData(days: string | number = 30, token?: string): Promise<TimelineResponse> {
    const res = await fetch(`${API_BASE_URL}/analytics/timeline?days=${days}`, { headers: getHeaders(token) });
    if (!res.ok) throw new Error("Failed to fetch timeline data");
    return res.json();
}

export async function uploadDocument(title: string, content: string, category: string, token?: string): Promise<Document> {
    const res = await fetch(`${API_BASE_URL}/documents/`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ title, content, category }),
    });
    if (!res.ok) throw new Error('Failed to upload document');
    const d = (await res.json()) as Record<string, unknown>;
    return {
        id: String(d._id ?? d.id ?? ""),
        title: String(d.title ?? ""),
        category: String(d.category ?? "Uncategorized"),
        content: String(d.content ?? ""),
        created_at: String(d.created_at ?? ""),
        updated_at: String(d.updated_at ?? ""),
    };
}
export async function deleteDocument(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: getHeaders(token),
    });
    if (!res.ok) throw new Error('Failed to delete document');
}

export async function updateDocument(id: string, title: string, content: string, category: string, token?: string): Promise<Document> {
    const res = await fetch(`${API_BASE_URL}/documents/${id}`, {
        method: 'PUT',
        headers: getHeaders(token),
        body: JSON.stringify({ title, content, category }),
    });
    if (!res.ok) throw new Error('Failed to update document');
    const d = (await res.json()) as Record<string, unknown>;
    return {
        id: String(d._id ?? d.id ?? ""),
        title: String(d.title ?? ""),
        category: String(d.category ?? "Uncategorized"),
        content: String(d.content ?? ""),
        created_at: String(d.created_at ?? ""),
        updated_at: String(d.updated_at ?? ""),
    };
}
export async function syncUser(clerk_id: string, email: string, fullName?: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/users/sync`, {
        method: 'POST',
        headers: getHeaders(token),
        body: JSON.stringify({ clerk_id, email, full_name: fullName }),
    });
    if (!res.ok) throw new Error('Failed to sync user');
}
