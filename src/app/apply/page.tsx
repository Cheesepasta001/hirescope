"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = {
  roleSlug: string;
  roleTitle: string;
  sector: string;
  competencyCount: number;
  available: boolean;
  error: string | null;
};

type CriteriaError = { line: number; message: string; fix: string };

export default function ApplyPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [roleSlug, setRoleSlug] = useState("");
  const [seniority, setSeniority] = useState("mid");
  const [consentInterview, setConsentInterview] = useState(false);
  const [consentRecording, setConsentRecording] = useState(false);
  const [consentLinkCheck, setConsentLinkCheck] = useState(false);
  const [consentCrossRole, setConsentCrossRole] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [inviteRequired, setInviteRequired] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criteriaProblem, setCriteriaProblem] = useState<
    { file: string; errors: CriteriaError[] } | null
  >(null);

  // Whether a code is needed is a property of the deployment, not the build, so
  // the field appears only where the operator actually configured one.
  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((c) => setInviteRequired(Boolean(c.inviteRequired)))
      .catch(() => {});
  }, []);

  // Roles come from the criteria files on disk, so this list is whatever HR has
  // published — not a hard-coded menu.
  useEffect(() => {
    fetch("/api/roles")
      .then((r) => r.json())
      .then((d) => {
        const list: Role[] = d.roles ?? [];
        setRoles(list);
        setRoleSlug(list.find((r) => r.available)?.roleSlug ?? "");
        setRolesLoaded(true);
      })
      .catch(() => setRolesLoaded(true));
  }, []);

  const selected = roles.find((r) => r.roleSlug === roleSlug);
  const noRoles = rolesLoaded && roles.filter((r) => r.available).length === 0;

  const ready =
    file && email.includes("@") && roleSlug && selected?.available && consentInterview
    && (!inviteRequired || inviteCode.trim());

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !file) return;
    setBusy(true);
    setError(null);
    setCriteriaProblem(null);

    const fd = new FormData();
    fd.set("resume", file);
    fd.set("email", email);
    fd.set("roleSlug", roleSlug);
    fd.set("seniority", seniority);
    fd.set("consentInterview", String(consentInterview));
    fd.set("consentRecording", String(consentRecording));
    fd.set("consentLinkCheck", String(consentLinkCheck));
    fd.set("consentCrossRole", String(consentCrossRole));
    fd.set("inviteCode", inviteCode.trim());

    try {
      const res = await fetch("/api/apply", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        if (data.criteriaErrors) {
          setCriteriaProblem({ file: data.criteriaFile, errors: data.criteriaErrors });
        }
        throw new Error(data.error ?? "Upload failed.");
      }
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
            <select
              className="field mt-1.5" value={roleSlug} disabled={noRoles}
              onChange={(e) => setRoleSlug(e.target.value)}
            >
              {!rolesLoaded && <option value="">Loading roles…</option>}
              {noRoles && <option value="">No roles are open</option>}
              {roles.map((r) => (
                <option key={r.roleSlug} value={r.roleSlug} disabled={!r.available}>
                  {r.roleTitle}
                  {r.available ? "" : " — unavailable"}
                </option>
              ))}
            </select>
            {selected?.available && (
              <p className="mt-1.5 text-xs text-[var(--ink-faint)]">
                Assessed against {selected.competencyCount} competencies set by this
                company&apos;s hiring team.
              </p>
            )}
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
          <Consent
            checked={consentCrossRole} onChange={setConsentCrossRole}
            label="Also consider me for other roles."
            detail="If a hiring manager thinks your background might suit a different role here, they can have this same interview read against that role's criteria. It never means another interview, and it never replaces your application for the role you chose. The result is marked as weaker evidence because the questions for that role were not the ones you were asked, and you can see it in your own report."
          />
        </fieldset>

        {noRoles && (
          <div className="panel border-[var(--warn)] p-4 text-sm">
            <div className="text-[var(--warn)] font-medium">No roles are currently open.</div>
            <p className="mt-1.5 text-xs text-[var(--ink-dim)] leading-relaxed">
              Roles come from the assessment criteria files this company maintains. If you were
              expecting one here, it has not been published yet.
            </p>
          </div>
        )}

        {error && (
          <div className="panel border-[var(--bad)] p-4 text-sm text-[var(--bad)]">{error}</div>
        )}

        {/* Shown to the candidate because staying silent about a broken standard would
            mean either a stalled application with no explanation, or an interview run
            against criteria nobody validated. The detail is for whoever fixes the file. */}
        {criteriaProblem && (
          <div className="panel border-[var(--bad)] p-4 text-sm">
            <div className="text-[var(--ink-dim)] text-xs">
              For the criteria maintainer — {criteriaProblem.file}
            </div>
            <ul className="mt-2 space-y-2">
              {criteriaProblem.errors.map((e, i) => (
                <li key={i} className="text-xs leading-relaxed">
                  <span className="font-mono text-[var(--warn)]">
                    {e.line > 0 ? `line ${e.line}` : "file"}
                  </span>{" "}
                  <span className="text-[var(--ink)]">{e.message}</span>
                  <div className="text-[var(--ink-faint)]">→ {e.fix}</div>
                </li>
              ))}
            </ul>
          </div>
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
