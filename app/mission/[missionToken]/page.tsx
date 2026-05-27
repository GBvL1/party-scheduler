"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { GlitchText } from "@/app/components/GlitchText";
import { playClick, playConfirm, playError, playWelcomeBack } from "@/lib/sound";

// ── Types ──────────────────────────────────────────────────────────────────

type MissionData = {
  eventName: string;
  lockedDate: string;
  missionRef: string;
};

type Step = "boot" | "q1" | "q2" | "q3" | "name" | "briefing" | "accepted" | "aborted";
type CrashPhase = null | "glitching" | "black";

// ── Constants ──────────────────────────────────────────────────────────────

const Q1_TEXT = "ÄR DU REDO ATT AKTIVERAS";
const Q2_TEXT = "KAN DU GARANTERA ATT INGEN OBEHÖRIG TAR DEL AV DETTA MATERIAL?";
const Q3_TEXT = "ACCEPTERAR DU ETT UPPDRAG SOM KAN KRÄVA EXTRALEGAL DISKRETION?";

const BRIEFING_TEXT =
`GOD MORGON, AGENT. DITT UPPDRAG, OM DU VÄLJER ATT ACCEPTERA DET, ÄR FÖLJANDE:

EN OKÄND AKTÖR FÖRBEREDER EN OPERATION SOM RISKERAR ATT DESTABILISERA FLERA SÄKERHETSZONER. DIN UPPGIFT ÄR ATT IDENTIFIERA URSPRUNGET, INHÄMTA VERIFIERBAR UNDERRÄTTELSE OCH NEUTRALISERA HOTET INNAN DET NÅR GENOMFÖRANDEFAS.

YTTERLIGARE INFORMATION KOMMER ATT TILLHANDAHÅLLAS VID EN SENARE, SÄKERSTÄLLD KONTAKTPUNKT. DU KOMMER ENDAST FÅ TILLGÅNG TILL DETALJER SOM BEDÖMS SOM NÖDVÄNDIGA FÖR VARJE STEG.

RSA KOMMER ATT FÖRNEKA ALL KÄNNEDOM OM DINA HANDLINGAR OCH AVSÄGA SIG ALLT ANSVAR OM DU SKULLE BLI INFÅNGAD ELLER ELIMINERAD. INGEN DEL AV DENNA BRIEFING FÅR DELAS, KOPIERAS ELLER REPRODUCERAS.

DETTA MEDDELANDE KOMMER ATT FÖRSTÖRA SIG SJÄLVT INOM FEM SEKUNDER.
LYCKA TILL.`;

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDateFull(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day)
    .toLocaleDateString("sv-SE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();
}

function useTypewriter(text: string, active: boolean, delay = 0, speed = 30) {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    if (!active) return;
    const startId = setTimeout(() => {
      let i = 0;
      const id = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(id);
      }, speed);
      return () => clearInterval(id);
    }, delay);
    return () => clearTimeout(startId);
  }, [text, active, delay, speed]);
  return displayed;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MissionPage() {
  const { missionToken } = useParams<{ missionToken: string }>();
  const [missionData, setMissionData] = useState<MissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState<Step>("boot");
  const [booted, setBooted] = useState(false);
  const [stepGlitch, setStepGlitch] = useState(false);

  // Name step
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [acceptedName, setAcceptedName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Abort step
  const [abortCountdown, setAbortCountdown] = useState(10);
  const [abortDone, setAbortDone] = useState(false);

  // Briefing step
  const [showBriefingCountdown, setShowBriefingCountdown] = useState(false);
  const [briefingCountdown, setBriefingCountdown] = useState(5);
  const [crashPhase, setCrashPhase] = useState<CrashPhase>(null);
  const briefingScheduledRef = useRef(false);

  // ── Load mission data ──

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/mission/${missionToken}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "UPPDRAG EJ FUNNET.");
          setLoading(false);
          return;
        }
        setMissionData(data);
        setLoading(false);
        setTimeout(() => {
          setBooted(true);
          setTimeout(() => setStep("q1"), 1500);
        }, 80);
      } catch {
        setError("NÄTVERKSFEL.");
        setLoading(false);
      }
    }
    load();
  }, [missionToken]);

  // ── Abort self-destruct countdown ──

  useEffect(() => {
    if (step !== "aborted") {
      setAbortCountdown(10);
      setAbortDone(false);
      return;
    }
    const id = setInterval(() => {
      setAbortCountdown((c) => {
        if (c <= 1) { clearInterval(id); setAbortDone(true); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  // ── Briefing: reset on step leave ──

  useEffect(() => {
    if (step !== "briefing") {
      briefingScheduledRef.current = false;
      setShowBriefingCountdown(false);
      setBriefingCountdown(5);
      setCrashPhase(null);
    }
  }, [step]);

  // ── Briefing: play welcome sound when accepted appears ──

  useEffect(() => {
    if (step === "accepted") playWelcomeBack();
  }, [step]);

  // ── Briefing typewriter — 18ms/char for comfortable reading pace ──

  const briefingTyped = useTypewriter(BRIEFING_TEXT, step === "briefing", 200, 18);

  // When text finishes → 15s reading grace → show countdown
  useEffect(() => {
    if (step !== "briefing" || briefingScheduledRef.current) return;
    if (briefingTyped.length < BRIEFING_TEXT.length) return;
    briefingScheduledRef.current = true;
    const timer = setTimeout(() => setShowBriefingCountdown(true), 15000);
    return () => clearTimeout(timer);
  }, [step, briefingTyped.length]);

  // Countdown 5 → 0 → crash → black → accepted
  useEffect(() => {
    if (!showBriefingCountdown) { setBriefingCountdown(5); return; }
    setBriefingCountdown(5);
    const id = setInterval(() => {
      setBriefingCountdown((c) => {
        if (c <= 1) {
          clearInterval(id);
          // Phase 1: violent glitch (1.7s)
          setCrashPhase("glitching");
          // Phase 2: pure black (2s hold)
          setTimeout(() => setCrashPhase("black"), 1700);
          // Phase 3: accepted screen fades in
          setTimeout(() => {
            setCrashPhase(null);
            setStep("accepted");
          }, 1700 + 2000);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [showBriefingCountdown]);

  // ── Name step: auto-focus ──

  useEffect(() => {
    if (step === "name") setTimeout(() => inputRef.current?.focus(), 300);
  }, [step]);

  // ── Navigation ──

  function goToStep(next: Step) {
    setStepGlitch(true);
    setTimeout(() => setStep(next), 370);
    setTimeout(() => setStepGlitch(false), 650);
  }

  function handleYes(next: Step) { playClick(); goToStep(next); }
  function handleNo()             { playError(); goToStep("aborted"); }

  function handleReconsider() {
    playClick();
    setAbortCountdown(10);
    setAbortDone(false);
    setStep("q1");
  }

  async function handleAccept() {
    if (!name.trim() || submitting) return;
    playConfirm();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/mission/${missionToken}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { playError(); setSubmitting(false); return; }
      setAcceptedName(data.name);
      setStepGlitch(true);
      setTimeout(() => setStep("briefing"), 370);
      setTimeout(() => setStepGlitch(false), 700);
    } catch {
      playError();
      setSubmitting(false);
    }
  }

  // ── Derived ──

  const dateFormatted = missionData?.lockedDate ? formatDateFull(missionData.lockedDate) : "";
  const missionRef    = missionData?.missionRef ?? "--------";

  const q1Typed   = useTypewriter(Q1_TEXT, step === "q1",   400, 38);
  const q2Typed   = useTypewriter(Q2_TEXT, step === "q2",   400, 28);
  const q3Typed   = useTypewriter(Q3_TEXT, step === "q3",   400, 28);
  const nameTyped = useTypewriter("IDENTIFIERA DIG, AGENT.", step === "name", 300, 42);

  // ── Early returns ──

  if (loading) return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-white/40 text-xs tracking-[0.4em] uppercase font-mono">
        DEKRYPTERAR SÄNDNING <span className="cursor-blink">_</span>
      </p>
    </main>
  );

  if (error) return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="text-center space-y-4">
        <div className="logo-rsa text-[48px] leading-none tracking-tight text-white block" data-text="RSA">RSA</div>
        <p className="text-red-400 text-[11px] tracking-[0.4em] font-mono border border-red-800/50 px-4 py-3 bg-red-950/20 uppercase">
          [ÅTKOMST NEKAD] {error}
        </p>
      </div>
    </main>
  );

  // ── Main render ──

  const isBriefingOrAccepted = step === "briefing" || step === "accepted";

  return (
    <main className={`min-h-screen flex flex-col items-center justify-center px-4 py-12 ${booted ? "crt-boot" : "opacity-0"}`}>
      <div
        className={[
          "w-full max-w-lg flicker",
          stepGlitch              ? "page-glitch"  : "",
          crashPhase === "glitching" ? "glitch-crash"  : "",
          crashPhase === "black"     ? "opacity-0"     : "",
        ].join(" ")}
      >

        {/* CLASSIFICATION HEADER — hidden during briefing/accepted for full immersion */}
        {!isBriefingOrAccepted && (
          <div className="border border-white/20 p-5 mb-10 text-center">
            <div className="logo-rsa text-[56px] leading-none tracking-tight text-white block mb-3" data-text="RSA">RSA</div>
            <div className="h-px bg-white/15 mb-4" />
            <p className="text-[10px] tracking-[0.5em] text-white/50 uppercase font-mono mb-1">KLASSIFICERAT // ENDAST FÖR MOTTAGAREN</p>
            <p className="text-[10px] tracking-[0.3em] text-white/25 uppercase font-mono mb-1">UPPDRAGSORDER // REF: {missionRef}</p>
            <p className="text-[10px] tracking-[0.3em] text-white/15 uppercase font-mono">OBEHÖRIG LÄSNING STRAFFBAR ENLIGT RSA-STADGA §7</p>
          </div>
        )}

        {/* ── BOOT ── */}
        {step === "boot" && (
          <div className="text-center py-8">
            <p className="text-[11px] tracking-[0.5em] text-white/30 uppercase font-mono">
              INKOMMANDE SÄNDNING <span className="cursor-blink">_</span>
            </p>
          </div>
        )}

        {/* ── Q1 ── */}
        {step === "q1" && (
          <div className="space-y-8">
            <p className="text-[10px] tracking-[0.45em] text-white/30 uppercase font-mono">FRÅGA 01 / 03</p>
            <div className="min-h-[7rem]">
              <p className="text-[clamp(17px,3.2vw,22px)] tracking-[0.12em] text-white uppercase font-mono leading-snug">
                {q1Typed}
              </p>
              {q1Typed.length === Q1_TEXT.length && (
                <p className="text-[clamp(18px,3.6vw,24px)] tracking-[0.08em] text-white uppercase font-mono font-bold mt-3">
                  {dateFormatted}?
                </p>
              )}
            </div>
            <div className="flex gap-4 pt-2">
              <button onClick={() => handleYes("q2")} className="btn-rsa flex-1 border-2 border-white text-white uppercase tracking-[0.4em] py-5 text-[14px] font-bold hover:bg-white hover:text-black transition-all duration-100">JA</button>
              <button onClick={handleNo}              className="btn-rsa flex-1 border border-white/25 text-white/35 uppercase tracking-[0.4em] py-5 text-[14px] hover:border-white/50 hover:text-white/60 transition-all duration-100">NEJ</button>
            </div>
          </div>
        )}

        {/* ── Q2 ── */}
        {step === "q2" && (
          <div className="space-y-8">
            <p className="text-[10px] tracking-[0.45em] text-white/30 uppercase font-mono">FRÅGA 02 / 03</p>
            <p className="text-[clamp(17px,3.2vw,22px)] tracking-[0.12em] text-white uppercase font-mono leading-snug min-h-[7rem]">{q2Typed}</p>
            <div className="flex gap-4 pt-2">
              <button onClick={() => handleYes("q3")} className="btn-rsa flex-1 border-2 border-white text-white uppercase tracking-[0.4em] py-5 text-[14px] font-bold hover:bg-white hover:text-black transition-all duration-100">BEKRÄFTAT</button>
              <button onClick={handleNo}              className="btn-rsa flex-1 border border-white/25 text-white/35 uppercase tracking-[0.4em] py-5 text-[14px] hover:border-white/50 hover:text-white/60 transition-all duration-100">NEKA</button>
            </div>
          </div>
        )}

        {/* ── Q3 ── */}
        {step === "q3" && (
          <div className="space-y-8">
            <p className="text-[10px] tracking-[0.45em] text-white/30 uppercase font-mono">FRÅGA 03 / 03</p>
            <p className="text-[clamp(17px,3.2vw,22px)] tracking-[0.12em] text-white uppercase font-mono leading-snug min-h-[7rem]">{q3Typed}</p>
            <div className="flex gap-4 pt-2">
              <button onClick={() => handleYes("name")} className="btn-rsa flex-1 border-2 border-white text-white uppercase tracking-[0.4em] py-5 text-[14px] font-bold hover:bg-white hover:text-black transition-all duration-100">ACCEPTERAR</button>
              <button onClick={handleNo}                className="btn-rsa flex-1 border border-white/25 text-white/35 uppercase tracking-[0.4em] py-5 text-[14px] hover:border-white/50 hover:text-white/60 transition-all duration-100">NEKA</button>
            </div>
          </div>
        )}

        {/* ── NAME ── */}
        {step === "name" && (
          <div className="space-y-8">
            <p className="text-[clamp(15px,2.8vw,19px)] tracking-[0.18em] text-white uppercase font-mono min-h-[2rem]">{nameTyped}</p>
            <div className="border border-white/30 flex items-center bg-white/3 focus-within:border-white/60 transition-colors duration-150">
              <span className="text-white/40 font-mono text-[15px] pl-4 pr-2 shrink-0 select-none">&gt;</span>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAccept()}
                placeholder="NAMN_"
                maxLength={40}
                autoComplete="off"
                className="flex-1 bg-transparent text-white uppercase tracking-[0.2em] text-[15px] font-mono py-4 pr-4 placeholder:text-white/20 outline-none"
              />
            </div>
            <button
              onClick={handleAccept}
              disabled={!name.trim() || submitting}
              className="btn-rsa w-full border-2 border-white text-white uppercase tracking-[0.35em] py-5 text-[14px] font-bold hover:bg-white hover:text-black disabled:opacity-25 disabled:pointer-events-none transition-all duration-100"
            >
              {submitting ? <span className="cursor-blink">_</span> : "■ ACCEPTERA UPPDRAGET"}
            </button>
          </div>
        )}

        {/* ── BRIEFING ── */}
        {step === "briefing" && (
          <div className="space-y-10">
            <p className="text-[10px] tracking-[0.5em] text-white/20 uppercase font-mono">
              RSA // UPPDRAGSGENOMGÅNG // KLASSIFICERAT
            </p>
            <pre className="text-[clamp(11px,1.9vw,13px)] tracking-[0.07em] text-white/90 font-mono leading-[1.9] whitespace-pre-wrap font-[inherit]">
              {briefingTyped}
              {briefingTyped.length < BRIEFING_TEXT.length && (
                <span className="cursor-blink">_</span>
              )}
            </pre>

            {showBriefingCountdown && (
              <div className="border-t border-white/15 pt-8 text-center space-y-3">
                <p className="text-[10px] tracking-[0.5em] text-red-400/55 uppercase font-mono">
                  DETTA MEDDELANDE FÖRSTÖRS OM
                </p>
                <p className="text-[clamp(88px,24vw,128px)] leading-none font-bold text-red-400 font-mono tabular-nums">
                  {briefingCountdown}
                </p>
                <p className="text-[10px] tracking-[0.45em] text-white/20 uppercase font-mono">
                  SEKUNDER
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ACCEPTED — text on black, slow fade from darkness ── */}
        {step === "accepted" && (
          <div className="fade-in-slow text-center space-y-7 py-4">
            <p className="text-[10px] tracking-[0.6em] text-white/20 uppercase font-mono">■ ■ ■</p>
            <h2 className="text-[clamp(22px,5vw,34px)] tracking-[0.18em] text-white uppercase font-bold">
              <GlitchText text="UPPDRAG ACCEPTERAT" delay={900} speed={25} />
            </h2>
            <div className="h-px bg-white/12 max-w-[180px] mx-auto" />
            <div className="space-y-6">
              <div>
                <p className="text-[10px] tracking-[0.5em] text-white/25 uppercase font-mono mb-2">OPERATIVE</p>
                <p className="text-[clamp(16px,3vw,22px)] tracking-[0.2em] text-white uppercase font-mono">{acceptedName}</p>
              </div>
              <div>
                <p className="text-[10px] tracking-[0.5em] text-white/25 uppercase font-mono mb-2">UPPDRAGSDATUM</p>
                <p className="text-[clamp(14px,2.5vw,18px)] tracking-[0.12em] text-white uppercase font-mono">{dateFormatted}</p>
              </div>
            </div>
            <div className="h-px bg-white/8 max-w-[180px] mx-auto" />
            <p className="text-[11px] tracking-[0.4em] text-white/20 uppercase font-mono">
              YTTERLIGARE ORDER INKOMMER<span className="cursor-blink">_</span>
            </p>
            <p className="text-[10px] tracking-[0.35em] text-white/10 uppercase font-mono">RSA SER ALLT</p>
          </div>
        )}

        {/* ── ABORTED ── */}
        {step === "aborted" && (
          <div className="text-center space-y-6">
            {!abortDone ? (
              <div className="border border-red-900/60 p-8 bg-red-950/8 space-y-4">
                <p className="text-[10px] tracking-[0.55em] text-red-400/60 uppercase font-mono">UPPDRAG AVBRUTET</p>
                <p className="text-[11px] tracking-[0.35em] text-white/35 uppercase font-mono">DETTA MEDDELANDE FÖRSTÖRS OM</p>
                <p className="text-[clamp(64px,18vw,104px)] leading-none font-bold text-red-400 font-mono tabular-nums">{abortCountdown}</p>
                <p className="text-[11px] tracking-[0.4em] text-white/20 uppercase font-mono">SEKUNDER</p>
              </div>
            ) : (
              <div className="border border-red-900/40 p-8 bg-red-950/5 space-y-4">
                <p className="text-[10px] tracking-[0.55em] text-red-400/50 uppercase font-mono">SIGNAL FÖRLORAD</p>
                <p className="text-[clamp(18px,4vw,26px)] tracking-[0.18em] text-red-400/60 uppercase font-mono font-bold">TRANSMISSION AVSLUTAD</p>
                <div className="h-px bg-red-900/30" />
                <p className="text-[11px] tracking-[0.35em] text-white/20 uppercase font-mono">DIN DOSSIER HAR MAKULERATS.</p>
              </div>
            )}
            <button
              onClick={handleReconsider}
              className="text-[11px] tracking-[0.4em] text-white/25 hover:text-white/60 uppercase font-mono underline underline-offset-4 transition-colors duration-100"
            >
              OMPRÖVA BESLUTET
            </button>
          </div>
        )}

      </div>
    </main>
  );
}
