export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem("soundEnabled");
    if (v === null) return true;
    return v === "true";
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("soundEnabled", enabled ? "true" : "false");
    window.dispatchEvent(new Event("soundSettingsChanged"));
  } catch {}
}

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof (window as any).SpeechSynthesisUtterance !== "undefined"
  );
}

export function speakText(text: string, lang = "en-US") {
  if (!isSpeechSynthesisSupported()) return;
  try {
    const Utter = (window as any).SpeechSynthesisUtterance;
    const u = new Utter(text);
    u.lang = lang;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u as SpeechSynthesisUtterance);
  } catch {
    // ignore
  }
}

export function playFeedbackTone(
  type: "correct" | "wrong" | "click" = "click",
) {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    if (type === "correct") {
      o.frequency.value = 880;
    } else if (type === "wrong") {
      o.frequency.value = 220;
    } else {
      o.frequency.value = 440;
    }
    g.gain.value = 0.001;
    o.start();
    g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    setTimeout(() => {
      try {
        o.stop();
        ctx.close();
      } catch {}
    }, 300);
  } catch {}
}

export default {};
type FeedbackKind = "correct" | "wrong";

interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

function hasWindow() {
  return typeof window !== "undefined";
}

export function isSpeechSynthesisSupported() {
  return (
    hasWindow() &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window
  );
}

export function speakText(text: string, options: SpeakOptions = {}) {
  if (!isSpeechSynthesisSupported() || !isSoundEnabled()) return;

  const content = text.trim();
  if (!content) return;

  const utterance = new SpeechSynthesisUtterance(content);
  utterance.lang = options.lang ?? "en-US";
  utterance.rate = options.rate ?? 1;
  utterance.pitch = options.pitch ?? 1;

  // Avoid overlapping utterances when users click the button repeatedly.
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (!isSpeechSynthesisSupported()) return;
  window.speechSynthesis.cancel();
}

export function isSoundEnabled(): boolean {
  if (!hasWindow()) return true;
  return localStorage.getItem("flashcard_sound_enabled") !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  if (!hasWindow()) return;
  localStorage.setItem("flashcard_sound_enabled", enabled ? "true" : "false");
  // Dispatch custom event so other components can react
  window.dispatchEvent(new Event("soundSettingsChanged"));
}

export function playFeedbackTone(kind: FeedbackKind) {
  if (!hasWindow() || !isSoundEnabled()) return;

  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass) return;

  const audioContext = new AudioContextClass();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = kind === "correct" ? 880 : 240;

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0.0001, now);
  gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

  oscillator.start(now);
  oscillator.stop(now + 0.2);

  oscillator.onended = () => {
    audioContext.close().catch(() => {
      // Closing can fail if context is already closed.
    });
  };
}
