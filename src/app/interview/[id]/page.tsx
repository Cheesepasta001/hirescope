"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InterviewRoom } from "@/components/InterviewRoom";

type Msg = { role: "interviewer" | "candidate"; text: string; questionType?: string | null };

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [messages, setMessages] = useState<Msg[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ asked: 0, budget: 12 });
  const [isFinal, setIsFinal] = useState(false);
  const [role, setRole] = useState("");
  const [candidateName, setCandidateName] = useState("");
  // Set when the candidate is returning to a session they walked away from.
  const [resumeOffer, setResumeOffer] = useState<{ purgeAfter: string | null } | null>(null);
  const [discarding, setDiscarding] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  // Timing is measured relative to when the question appeared, not to page load.
  const questionShownAt = useRef<number>(Date.now());
  const firstKeyAt = useRef<number | null>(null);

  const signal = useCallback(
    (type: string, payload?: Record<string, number | boolean>) => {
      // Beacons are fire-and-forget: integrity telemetry must never block or
      // interrupt the candidate.
      void fetch(`/api/interview/${id}/signal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload }),
        keepalive: true,
      }).catch(() => {});
    },
    [id],
  );

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/interview/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load this interview.");
        if (data.status === "completed") {
          router.replace(`/interview/${id}/done`);
          return;
        }
        setMessages(data.turns);
        setProgress({ asked: data.questionsAsked, budget: data.questionBudget });
        setRole(`${data.seniority} ${data.roleTitle}`);
        setCandidateName(data.candidateName ?? "");
        if (data.resumeOffered) {
          setResumeOffer({ purgeAfter: data.purgeAfter ?? null });
        }
        questionShownAt.current = Date.now();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load this interview.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  // Non-biometric integrity instrumentation. Everything observed here is about
  // the browser window, never about the person in front of it.
  useEffect(() => {
    const onBlur = () => signal("blur");
    const onVisibility = () => { if (document.hidden) signal("tab_hidden"); };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [signal]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  async function send() {
    const text = answer.trim();
    if (!text || thinking) return;

    const submittedAt = Date.now();
    setMessages((m) => [...m, { role: "candidate", text }]);
    setAnswer("");
    setThinking(true);
    setError(null);

    try {
      const res = await fetch(`/api/interview/${id}/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answer: text,
          latencyMsFirstKey: firstKeyAt.current ? firstKeyAt.current - questionShownAt.current : null,
          latencyMsSubmit: submittedAt - questionShownAt.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit that answer.");

      setMessages((m) => [...m, { role: "interviewer", text: data.question, questionType: data.questionType }]);
      setProgress({ asked: data.questionsAsked, budget: data.questionBudget });
      setIsFinal(Boolean(data.isFinalQuestion));
      questionShownAt.current = Date.now();
      firstKeyAt.current = null;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      // Put the answer back so nothing the candidate wrote is lost.
      setAnswer(text);
      setMessages((m) => m.slice(0, -1));
    } finally {
      setThinking(false);
    }
  }

  async function finish() {
    setFinishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/interview/${id}/finish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not complete the assessment.");
      router.push(`/interview/${id}/done`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setFinishing(false);
    }
  }

  async function discard() {
    setDiscarding(true);
    try {
      const res = await fetch(`/api/interview/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not delete this interview.");
      router.replace("/apply?discarded=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete this interview.");
      setDiscarding(false);
    }
  }

  if (loading) return <p className="text-sm text-[var(--ink-dim)]">Loading your interview…</p>;

  // The one retry, offered once, with the deletion date stated rather than
  // implied. A candidate who walked away should not have to guess what happens
  // to what they already wrote.
  if (resumeOffer) {
    return (
      <div className="max-w-xl space-y-5">
        <h1 className="text-2xl font-semibold tracking-tight">You left this interview partway</h1>
        <p className="text-sm text-[var(--ink-dim)] leading-relaxed">
          {progress.asked > 0
            ? `You answered ${messages.filter((m) => m.role === "candidate").length} of `
              + `${progress.budget} questions. You can pick up where you left off — nothing you `
              + `wrote has been lost.`
            : "You had not answered anything yet. You can start now, or delete your application."}
        </p>
        <p className="text-sm text-[var(--ink-dim)] leading-relaxed">
          If you would rather not continue, we will delete your resume and everything from this
          session. That is not reversible.
          {resumeOffer.purgeAfter && (
            <>
              {" "}If we do not hear from you, it is deleted automatically after{" "}
              {new Date(resumeOffer.purgeAfter).toLocaleDateString()}.
            </>
          )}
        </p>
        {error && <div className="panel border-[var(--bad)] p-4 text-sm text-[var(--bad)]">{error}</div>}
        <div className="flex flex-wrap items-center gap-3">
          <button className="btn" onClick={() => setResumeOffer(null)} disabled={discarding}>
            Continue the interview
          </button>
          <button className="btn-ghost" onClick={() => void discard()} disabled={discarding}>
            {discarding ? "Deleting…" : "Delete my application"}
          </button>
        </div>
      </div>
    );
  }

  const pct = Math.min(100, Math.round((progress.asked / progress.budget) * 100));

  return (
    <div className="max-w-3xl">
      <div className="flex items-baseline justify-between">
        <h1 className="text-lg font-medium">{role}</h1>
        <span className="text-xs text-[var(--ink-faint)]">
          Question {Math.min(progress.asked, progress.budget)} of {progress.budget}
        </span>
      </div>
      <div className="mt-2 h-1 bg-[var(--panel-2)] overflow-hidden">
        <div className="h-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {/* The interviewer animates precisely while the model is composing, which
          turns the one unavoidable wait in this app into its liveliest moment. */}
      <div className="mt-6">
        <InterviewRoom
          candidateName={candidateName || "candidate"}
          started={messages.length > 0}
          speaking={thinking}
          label={
            thinking
              ? "면접관이 다음 질문을 생각하고 있습니다"
              : "책상 건너편에 면접관이 앉아 있습니다"
          }
        />
      </div>

      <div className="mt-8 space-y-5">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "candidate" ? "flex justify-end" : ""}>
            <div
              className={
                m.role === "candidate"
                  ? "max-w-[85%] rounded-xl rounded-br-sm bg-[var(--panel-2)] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                  : "max-w-[92%] panel px-5 py-4 leading-relaxed"
              }
            >
              {m.role === "interviewer" && (
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-[var(--ink-faint)]">
                  Interviewer{m.questionType === "closing" ? " · final question" : ""}
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="panel px-5 py-4 flex gap-1.5 items-center text-[var(--ink-faint)]">
            <span className="dot">●</span><span className="dot">●</span><span className="dot">●</span>
            <span className="ml-2 text-xs">Considering your answer</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && <div className="mt-5 panel border-[var(--bad)] p-4 text-sm text-[var(--bad)]">{error}</div>}

      <div className="mt-6 space-y-3">
        <textarea
          className="field min-h-36 resize-y leading-relaxed"
          placeholder="Take your time. Specifics beat polish — name the actual decision, the actual number, the thing that broke."
          value={answer}
          disabled={thinking || finishing}
          onChange={(e) => {
            if (firstKeyAt.current === null && e.target.value.length > 0) firstKeyAt.current = Date.now();
            setAnswer(e.target.value);
          }}
          onPaste={(e) => signal("paste", { length: e.clipboardData.getData("text").length })}
          onCopy={() => signal("copy")}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") { e.preventDefault(); void send(); }
          }}
        />
        <div className="flex items-center gap-3">
          <button className="btn" onClick={() => void send()} disabled={!answer.trim() || thinking || finishing}>
            Send answer
          </button>
          <span className="text-xs text-[var(--ink-faint)]">⌘/Ctrl + Enter</span>
          <div className="flex-1" />
          {(isFinal || progress.asked >= 3) && (
            <button className="btn-ghost" onClick={() => void finish()} disabled={thinking || finishing}>
              {finishing ? "Building your assessment…" : isFinal ? "Finish interview" : "End early"}
            </button>
          )}
        </div>
        <p className="text-xs text-[var(--ink-faint)]">
          Session integrity is monitored via window focus and paste events only. Your camera and
          microphone are not used, and nothing about your face, gaze, or emotions is analysed.
        </p>
      </div>
    </div>
  );
}
