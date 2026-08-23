"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SECTORS = [
  ["engineering", "Engineering"],
  ["finance", "Banking & finance"],
  ["hr", "HR & people"],
  ["product", "Product"],
  ["sales", "Sales"],
  ["marketing", "Marketing"],
  ["healthcare", "Healthcare"],
  ["legal", "Legal"],
  ["operations", "Operations"],
  ["other", "Other"],
] as const;

export default function ApplyPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [sector, setSector] = useState("engineering");
  const [seniority, setSeniority] = useState("mid");
  const [consentInterview, setConsentInterview] = useState(false);
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentLinkCheck, setConsentLinkCheck] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRequired, setInviteRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Whether a code is needed is a property of the deployment, not the build, so
  // the field appears only where the operator actually configured one.
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setInviteRequired(Boolean(c.inviteRequired)))
      .catch(() => {});
  }, []);

  const ready =
    file && email.includes("@") && roleTitle.trim() && consentInterview
    && (!inviteRequired || inviteCode.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !file) return;
    setBusy(true);
    setError(null);

    const fd = new FormData();
    fd.set("resume", file);
    fd.set("email", email);
    fd.set("roleTitle", roleTitle);
    fd.set("sector", sector);
    fd.set("seniority", seniority);
    fd.set("consentInterview", String(consentInterview));
    fd.set("consentRecording", String(consentRecording));
    fd.set("consentLinkCheck", String(consentLinkCheck));
    fd.set("inviteCode", inviteCode.trim());

    try {
      const res = await fetch("/api/apply", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed.");
      router.push(`/interview/${data.interviewId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Start your interview</h1>
      <p className="mt-2 text-sm text-[var(--ink-dim)]">
        Upload your resume. We read it, then ask you about your actual work — expect roughly
        20 minutes.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-5">
        {inviteRequired && (
          <div className="panel p-5">
            <label className="text-sm font-medium">Invite code</label>
            <p className="mt-1 text-xs text-[var(--ink-faint)]">
              This demo runs on the operator&apos;s API account, so it is invite-only.
            </p>
            <input
              className="field mt-3" value={inviteCode} placeholder="Enter your code"
              onChange={(e) => setInviteCode(e.target.value)}
            />
          </div>
        )}

        <label className="block panel p-5 cursor-pointer hover:border-[var(--accent-dim)]">
          <div className="text-sm font-medium">Resume</div>
          <div className="mt-1 text-xs text-[var(--ink-faint)]">PDF, DOCX, or plain text. Max 10MB.</div>
          <input
            type="file"
            accept=".pdf,.docx,.txt,.md,application/pdf"
            className="mt-3 text-sm text-[var(--ink-dim)] file:mr-3 file:rounded file:border-0 file:bg-[var(--panel-2)] file:px-3 file:py-1.5 file:text-[var(--ink)]"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file && <div className="mt-2 text-xs text-[var(--good)]">{file.name}</div>}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm">Email</label>
            <input
              type="email" className="field mt-1.5" value={email} placeholder="you@example.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm">Role you are applying for</label>
            <input
              className="field mt-1.5" value={roleTitle} placeholder="Senior backend engineer"
              onChange={(e) => setRoleTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm">Sector</label>
            <select className="field mt-1.5" value={sector} onChange={(e) => setSector(e.target.value)}>
              {SECTORS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm">Level</label>
            <select className="field mt-1.5" value={seniority} onChange={(e) => setSeniority(e.target.value)}>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="lead">Lead / principal</option>
            </select>
          </div>
        </div>

        <fieldset className="panel p-5 space-y-4">
          <legend className="px-1 text-sm font-medium">Your consent</legend>

          <Consent
            checked={consentInterview} onChange={setConsentInterview} required
            label="I agree to an AI-assisted interview and assessment."
            detail="Your answers are assessed by an AI system to produce competency scores and a written summary. A human reviews the result before any hiring decision. You can request the assessment, contest it, or have your data deleted at any time."
          />
          <Consent
            checked={consentRecording} onChange={setConsentRecording}
            label="I agree to session integrity monitoring."
            detail="We record when the interview tab loses focus, when text is pasted, and how answer timing is shaped. We do not use your camera, we do not analyse your face, gaze, or emotions, and we do not record audio. Declining does not affect your assessment."
          />
          <Consent
            checked={consentLinkCheck} onChange={setConsentLinkCheck}
            label="I agree to verification of the professional links on my resume."
            detail="We check only URLs you put on your own resume — a public GitHub profile, ORCID, or portfolio — to confirm they exist and are reachable. We do not search for you, and we do not look at social media. Anything we find is shown to you before it is shown to anyone else."
          />
        </fieldset>

        {error && (
          <div className="panel border-[var(--bad)] p-4 text-sm text-[var(--bad)]">{error}</div>
        )}

        <button className="btn" disabled={!ready || busy}>
          {busy ? "Reading your resume…" : "Begin interview"}
        </button>
        {busy && (
          <p className="text-xs text-[var(--ink-faint)]">
            Parsing, checking consistency, and building your interview plan. This takes 15–30 seconds.
          </p>
        )}
      </form>
    </div>
  );
}

function Consent(props: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  detail: string;
  required?: boolean;
}) {
  return (
    <label className="flex gap-3 items-start cursor-pointer">
      <input
        type="checkbox" checked={props.checked} className="mt-1 accent-[var(--accent)]"
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span>
        <span className="text-sm">
          {props.label}
          {props.required && <span className="text-[var(--bad)]"> *</span>}
          {!props.required && <span className="text-[var(--ink-faint)]"> (optional)</span>}
        </span>
        <span className="mt-1 block text-xs text-[var(--ink-faint)] leading-relaxed">{props.detail}</span>
      </span>
    </label>
  );
}
