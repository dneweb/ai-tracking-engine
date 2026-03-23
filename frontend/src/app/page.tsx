"use client";

import { useState } from "react";
import { useUser, useAuth } from "@clerk/nextjs";
import { AlertCircle, FileText, Search, Loader2, Sparkles, ArrowRight, MessageSquare, History } from "lucide-react";
import { askQuestion, QuestionResponse } from "@/lib/api";
import ConfidenceBadge from "@/components/ConfidenceBadge";

const QUICK_QUESTIONS = [
  "How do I reset my password?",
  "How do I request time off?",
  "What is the expense policy for travel?",
];

export default function AskQuestionPage() {
  const { user } = useUser();
  const { getToken } = useAuth();

  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<QuestionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAsk = async (e?: React.FormEvent, questionText: string = query) => {
    e?.preventDefault();
    if (!questionText.trim()) return;

    setLoading(true);
    setError("");
    setAnswer(null);

    try {
      const token = await getToken();
      const data = await askQuestion(questionText, 3, {
        id: user?.id,
        email: user?.emailAddresses[0]?.emailAddress,
        name: user?.fullName || user?.username || user?.id,
      }, token || undefined);
      setAnswer(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Search Section */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/10 to-primary/5 rounded-[2rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative glass rounded-[1.5rem] p-8 overflow-hidden shadow-2xl">
          {/* Decorative Background Icon */}
          <Sparkles className="absolute -right-8 -top-8 w-40 h-40 text-primary/5 -rotate-12" />
          
          <div className="relative z-10 space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-foreground font-display tracking-tight">System Intelligence</h2>
              <p className="text-muted-foreground text-sm font-medium">Search across all company intelligence sources instantly.</p>
            </div>

            <form onSubmit={(e) => handleAsk(e)} className="relative group/form">
              <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none text-muted-foreground group-focus-within/form:text-primary transition-colors">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="Query the system or ask a question..."
                className="w-full bg-white/[0.03] border border-white/[0.05] hover:border-white/10 focus:border-primary/50 rounded-2xl py-5 pl-16 pr-40 text-foreground placeholder:text-muted-foreground transition-all outline-none text-base font-medium shadow-inner"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="absolute right-3 top-2 bottom-2 bg-primary hover:bg-primary-hover text-white px-8 rounded-xl font-bold transition-all disabled:opacity-50 disabled:grayscale flex items-center gap-2 group/btn shadow-lg shadow-primary/20"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Nexus Search</span>
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="flex flex-wrap gap-3 items-center pt-2">
              <div className="flex items-center gap-2 text-[11px] uppercase font-bold text-muted-foreground tracking-widest bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.05]">
                <MessageSquare className="w-3 h-3 text-primary" />
                Quick Queries
              </div>
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setQuery(q);
                    handleAsk(undefined, q);
                  }}
                  className="text-xs font-semibold text-muted-foreground h-9 px-4 rounded-xl border border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05] hover:text-foreground hover:border-white/10 transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Answer Area */}
      {error && (
        <div className="bg-danger/10 border border-danger/20 text-danger p-6 rounded-2xl flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center flex-shrink-0">
             <AlertCircle className="w-5 h-5" />
          </div>
          <p className="text-sm font-bold tracking-tight">{error}</p>
        </div>
      )}

      {loading && !answer && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
           <div className="h-64 glass rounded-3xl bg-white/[0.02]"></div>
           <div className="h-64 glass rounded-3xl bg-white/[0.03]"></div>
           <div className="h-64 glass rounded-3xl bg-white/[0.01]"></div>
        </div>
      )}

      {answer && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 [animation-timing-function:cubic-bezier(0.23,1,0.32,1)]">
          <div className="glass rounded-[2rem] p-10 shadow-2xl space-y-8 relative overflow-hidden">
             {/* Gradient Background Decoration */}
             <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-primary/5 rounded-full blur-[100px]" />
             
             <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/[0.05]">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-success/10 text-success rounded-2xl flex items-center justify-center shadow-inner border border-success/20">
                    <Sparkles className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight text-foreground">Intelligence Result</h3>
                    <div className="mt-1">
                      <ConfidenceBadge confidence={answer.confidence} />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                   <button className="flex items-center gap-2 px-4 py-2 bg-white/[0.03] border border-white/[0.05] hover:border-white/10 rounded-xl text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all">
                      <History className="w-3.5 h-3.5" />
                      Save Intelligence
                   </button>
                </div>
             </div>

             <div className="relative z-10">
                <div className="prose prose-invert max-w-none">
                  <p className="text-lg leading-relaxed text-muted-foreground whitespace-pre-wrap font-medium font-outfit">
                    {answer.answer}
                  </p>
                </div>
             </div>

             <div className="relative z-10 pt-8 border-t border-white/[0.05] space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-primary/10 rounded-lg">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">Source Intelligence</h4>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {answer.sources.map((source, idx) => (
                    <div
                      key={idx}
                      className="group bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-5 border border-white/[0.05] hover:border-primary/30 transition-all duration-300"
                    >
                      <div className="font-bold text-sm text-foreground mb-3 truncate leading-tight tracking-tight" title={source.title}>
                        {source.title}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/5 px-2 py-0.5 rounded-md">{source.category}</span>
                        <div className="flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 rounded-full bg-success/80"></div>
                           <span className="text-[10px] font-bold text-muted-foreground tracking-tighter italic">{Math.round(source.match * 100)}% Match</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Dummy component for error icon if Lucide's AlertCircle isn't enough, 
// but we just used the Lucide one above.
