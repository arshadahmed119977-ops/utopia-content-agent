import { useState } from "react";

const SAMPLE_TRANSCRIPT = `Meeting: Co-Build Session — SupplyFlowQatar | 14:00 Doha Time
Attendees: Mo (Studio Director), Fatima Al-Rashidi (Fellow, CEO SupplyFlowQatar), Tariq (Tech Lead)

Mo: Alright, let's start with where you are on the market gauge. Fatima, what did you find?

Fatima: I spoke to three freight forwarders in the Industrial Area last week. All three said the same thing — they're tracking shipments in WhatsApp groups. Screenshot-based tracking. The biggest one, Hassan Logistics, moving about 200 containers a month with no idea where 30% of them are at any given time.

Mo: That's a real number. Representative or an outlier?

Fatima: Hassan said that's normal across the sector. He introduced me to two other operators who confirmed it.

Tariq: The tech lift is actually low — we're not building new infrastructure, we're building a visibility layer on top of existing port systems. Integrates with QTerminals' existing data feeds.

Mo: Fatima, I want you in front of QTerminals next week. Not a pitch — a discovery call. Can you get that scheduled?

Fatima: Yes. Tariq connected me to someone there. I'll confirm by tomorrow.

Mo: Good. We're presenting SupplyFlowQatar at the Radical Asia call on Thursday. Tariq, pull together a one-pager on the tech architecture before that.

Tariq: Will do. I'll have it by Wednesday EOD.

Mo: Fatima, your G0 is in six days. You need two more calls on the books. QTerminals plus one more — who else?

Fatima: I've been talking to someone at Qatar Navigation. I'll push for a formal meeting this week.

Mo: Don't ask, just propose a time. Three calls confirmed before G0 or we push the review. That's the gate.

[Meeting ended 14:43]`;

const SYSTEM_PROMPT = `You are Utopia Studio's content agent. Utopia Studio is a venture studio in Doha that co-builds early-stage companies alongside founders called fellows.

Voice rules: declarative, specific, no hedging. The studio publishes opinions, not summaries. No filler phrases like "excited to announce" or "delighted to share." Short sentences. Strong verbs.

The LAUNCH framework maps every piece of content to a stage:
- Lead: awareness, introducing a concept or person for the first time
- Amplify: reach, sharing proof or results to a wider audience
- Unify: community, spotlighting a relationship or network moment
- Nurture: trust, showing process, depth, or behind-the-scenes thinking
- Convert: action, driving a specific next step from the audience
- Harvest: advocacy, celebrating an outcome or milestone

From the transcript, extract the single strongest signal and produce three outputs:

1. LINKEDIN_POST — Studio account post. Max 150 words. First line must be a declarative statement that stands alone. 2-3 relevant hashtags max. Assign one LAUNCH stage.

2. FOLLOW_UP_EMAIL — Personalised email to the key attendee. Reference something specific they said or committed to. Subject line plus body. Max 100 words. Direct but warm — no corporate pleasantries.

3. PRESS_ANGLE — One sentence a Gulf tech journalist could pitch to their editor. Specific, newsworthy, no hype.

Return ONLY the raw JSON object below. No markdown. No code fences. No explanation before or after. Just the JSON.

{"linkedin_post":"full post text","follow_up_email":{"subject":"subject line","body":"email body"},"press_angle":"one sentence","key_attendee":"Name, Role","launch_stage":"Lead or Amplify or Unify or Nurture or Convert or Harvest","signal":"one sentence core insight from this transcript"}`;

const LAUNCH_BADGE = {
  Lead:    { background: "#1E0A3C", color: "#C4B5FD", border: "1px solid #3B1D7E" },
  Amplify: { background: "#0A1628", color: "#93C5FD", border: "1px solid #1E3A5F" },
  Unify:   { background: "#071A20", color: "#67E8F9", border: "1px solid #0E4A5A" },
  Nurture: { background: "#071A12", color: "#6EE7B7", border: "1px solid #0E4A30" },
  Convert: { background: "#1C1004", color: "#FCD34D", border: "1px solid #5A3A0A" },
  Harvest: { background: "#1C0D04", color: "#FDBA74", border: "1px solid #5A2A0A" },
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{
        fontSize: 11, fontFamily: "monospace", padding: "4px 10px", borderRadius: 5,
        border: "1px solid #1A1A30", background: "#0E0E1C",
        color: copied ? "#6EE7B7" : "#4A4A80", cursor: "pointer",
      }}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

function Dots() {
  return (
    <>
      <style>{`@keyframes udot{0%,80%,100%{transform:translateY(0);opacity:.3}40%{transform:translateY(-5px);opacity:1}}`}</style>
      <span style={{ display: "inline-flex", gap: 5 }}>
        {[0,1,2].map(i => (
          <span key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: "#818CF8", display: "block", animation: "udot 1.1s infinite", animationDelay: `${i*0.18}s` }} />
        ))}
      </span>
    </>
  );
}

function Card({ label, badge, badgeStyle, copyText, children }) {
  return (
    <div style={{ background: "#0C0C1A", border: "1px solid #161628", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #161628" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "#3A3A65", textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</span>
          {badge && badgeStyle && (
            <span style={{ fontSize: 9, fontFamily: "monospace", padding: "2px 7px", borderRadius: 4, ...badgeStyle }}>{badge}</span>
          )}
        </div>
        <CopyButton text={copyText} />
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

export default function UtopiaContentAgent() {
  const [transcript, setTranscript] = useState("");
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showJson, setShowJson] = useState(false);
  const [phase, setPhase] = useState("input"); // "input" | "output"

  const runAgent = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setError("");
    setOutput(null);
    setShowJson(false);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1200,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: `Transcript:\n\n${transcript}\n\nReturn only the raw JSON object. No markdown. No code fences.` }],
        }),
      });
      const data = await res.json();
      const raw = data.content?.find(b => b.type === "text")?.text || "";
      const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      const objectMatch = raw.match(/\{[\s\S]*\}/);
      const clean = fenceMatch ? fenceMatch[1].trim() : objectMatch ? objectMatch[0].trim() : raw.trim();
      const parsed = JSON.parse(clean);
      setOutput(parsed);
      setPhase("output");
    } catch {
      setError("Tap Run agent again — this usually resolves on retry.");
    } finally {
      setLoading(false);
    }
  };

  const s = {
    page: { background: "#080812", minHeight: "100vh", color: "#E0E0F0", fontFamily: "system-ui,-apple-system,sans-serif", paddingBottom: 40 },
    topbar: { borderBottom: "1px solid #111122", padding: "13px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
    topLabel: { fontSize: 11, fontFamily: "monospace", color: "#40408A", letterSpacing: "0.12em", textTransform: "uppercase" },
    dot: { width: 7, height: 7, borderRadius: "50%", background: "#6366f1", display: "inline-block", marginRight: 8, boxShadow: "0 0 8px #6366f199" },
    section: { padding: "0 16px", display: "flex", flexDirection: "column", gap: 12 },
    label: { fontSize: 10, fontFamily: "monospace", color: "#2A2A55", textTransform: "uppercase", letterSpacing: "0.12em" },
    textarea: { width: "100%", background: "#0A0A18", border: "1px solid #161628", borderRadius: 10, padding: "13px 14px", fontSize: 13, fontFamily: "monospace", color: "#A0A0C8", resize: "none", outline: "none", lineHeight: 1.7, boxSizing: "border-box", minHeight: 200 },
    row: { display: "flex", gap: 10 },
    btnSecondary: { padding: "12px 18px", fontSize: 13, fontFamily: "monospace", color: "#2A2A55", background: "none", border: "1px solid #161628", borderRadius: 8, cursor: "pointer" },
    btnPrimary: (disabled) => ({ flex: 1, padding: "13px", fontSize: 14, fontWeight: 700, background: disabled ? "#0F0F22" : "#4F46E5", color: disabled ? "#2A2A55" : "#fff", border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }),
    bodyText: { fontSize: 13, color: "#C8C8E8", lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0 },
    meta: { fontSize: 11, fontFamily: "monospace", color: "#2A2A55", marginBottom: 8 },
    italic: { fontSize: 14, color: "#E8D080", lineHeight: 1.65, fontStyle: "italic", margin: 0 },
    signal: { background: "#0A0A18", border: "1px solid #161628", borderRadius: 10, padding: "12px 15px" },
  };

  return (
    <div style={s.page}>
      {/* Topbar */}
      <div style={s.topbar}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <span style={s.dot} />
          <span style={s.topLabel}>Utopia OS · Content Agent</span>
        </div>
        {phase === "output" && (
          <button
            onClick={() => { setPhase("input"); setOutput(null); setError(""); }}
            style={{ fontSize: 11, fontFamily: "monospace", color: "#4F46E5", background: "none", border: "none", cursor: "pointer" }}
          >
            ← New
          </button>
        )}
      </div>

      <div style={s.section}>

        {/* INPUT PHASE */}
        {phase === "input" && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={s.label}>Granola Transcript</span>
              <button
                onClick={() => setTranscript(SAMPLE_TRANSCRIPT)}
                style={{ fontSize: 12, fontFamily: "monospace", color: "#4F46E5", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                Load sample →
              </button>
            </div>

            <textarea
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
              placeholder="Paste meeting transcript here…"
              style={s.textarea}
              rows={10}
            />

            <div style={s.row}>
              <button style={s.btnSecondary} onClick={() => { setTranscript(""); setError(""); }}>Clear</button>
              <button
                style={s.btnPrimary(loading || !transcript.trim())}
                disabled={loading || !transcript.trim()}
                onClick={runAgent}
              >
                {loading ? <><Dots /><span>Processing…</span></> : "Run agent →"}
              </button>
            </div>

            {error && <p style={{ fontSize: 12, fontFamily: "monospace", color: "#f87171", margin: 0 }}>{error}</p>}

            <div style={{ borderTop: "1px solid #0E0E1E", paddingTop: 14, display: "flex", flexDirection: "column", gap: 7 }}>
              {[["Input","Raw Granola transcript"],["Output","LinkedIn post · Email · Press angle"],["Format","Readable + JSON (agent-ready)"]].map(([k,v]) => (
                <div key={k} style={{ display: "flex", gap: 10, fontSize: 11, fontFamily: "monospace" }}>
                  <span style={{ color: "#2A2A55", width: 48, flexShrink: 0 }}>{k}</span>
                  <span style={{ color: "#40406A" }}>{v}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* OUTPUT PHASE */}
        {phase === "output" && output && (
          <>
            {/* Signal */}
            <div style={s.signal}>
              <span style={{ fontSize: 10, fontFamily: "monospace", color: "#2A2A55", textTransform: "uppercase", letterSpacing: "0.1em" }}>Signal → </span>
              <span style={{ fontSize: 12, fontFamily: "monospace", color: "#5A5A95" }}>{output.signal}</span>
            </div>

            {/* LinkedIn Post */}
            <Card
              label="LinkedIn Post"
              badge={output.launch_stage ? `LAUNCH · ${output.launch_stage}` : null}
              badgeStyle={output.launch_stage ? LAUNCH_BADGE[output.launch_stage] : null}
              copyText={output.linkedin_post}
            >
              <p style={s.bodyText}>{output.linkedin_post}</p>
            </Card>

            {/* Follow-up Email */}
            <Card
              label="Follow-up Email"
              badge={output.key_attendee ? `→ ${output.key_attendee}` : null}
              badgeStyle={{ background: "#071A12", color: "#6EE7B7", border: "1px solid #0E4A30" }}
              copyText={`Subject: ${output.follow_up_email?.subject}\n\n${output.follow_up_email?.body}`}
            >
              <p style={s.meta}>Subject: {output.follow_up_email?.subject}</p>
              <p style={s.bodyText}>{output.follow_up_email?.body}</p>
            </Card>

            {/* Press Angle */}
            <Card label="Press Angle" copyText={output.press_angle}>
              <p style={s.italic}>"{output.press_angle}"</p>
            </Card>

            {/* JSON toggle */}
            <div style={{ background: "#0C0C1A", border: "1px solid #161628", borderRadius: 12, overflow: "hidden" }}>
              <button
                onClick={() => setShowJson(v => !v)}
                style={{ width: "100%", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer" }}
              >
                <span style={{ fontSize: 10, fontFamily: "monospace", color: "#2A2A55", textTransform: "uppercase", letterSpacing: "0.12em" }}>Agent-readable JSON</span>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <CopyButton text={JSON.stringify(output, null, 2)} />
                  <span style={{ fontSize: 10, color: "#2A2A55", fontFamily: "monospace" }}>{showJson ? "▲" : "▼"}</span>
                </div>
              </button>
              {showJson && (
                <div style={{ borderTop: "1px solid #161628", padding: "14px 16px" }}>
                  <pre style={{ fontSize: 11, fontFamily: "monospace", color: "#4A4A85", overflowX: "auto", margin: 0, lineHeight: 1.65, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {JSON.stringify(output, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
