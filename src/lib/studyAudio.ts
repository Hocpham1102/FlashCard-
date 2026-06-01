// Lightweight audio / speech helpers for the client
type FeedbackKind = "correct" | "wrong";

interface SpeakOptions {
  lang?: string;
  rate?: number;
  pitch?: number;
}

function hasWindow() {
  return typeof window !== "undefined";
}

export function isSoundEnabled(): boolean {
  if (!hasWindow()) return true;
  return localStorage.getItem("flashcard_sound_enabled") !== "false";
}

export function setSoundEnabled(enabled: boolean) {
  if (!hasWindow()) return;
  localStorage.setItem("flashcard_sound_enabled", enabled ? "true" : "false");
  window.dispatchEvent(new Event("soundSettingsChanged"));
}

export function isSpeechSynthesisSupported(): boolean {
  return (
    hasWindow() &&
    "speechSynthesis" in window &&
    typeof (window as any).SpeechSynthesisUtterance !== "undefined"
  );
}

export function speakText(text: string, options: SpeakOptions = {}) {
  if (!isSpeechSynthesisSupported() || !isSoundEnabled()) return;
  const content = text?.toString().trim();
  if (!content) return;
  try {
    const utterance = new SpeechSynthesisUtterance(content);
    utterance.lang = options.lang ?? "en-US";
    utterance.rate = options.rate ?? 1;
    utterance.pitch = options.pitch ?? 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    // ignore
  }
}

export function stopSpeaking() {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {}
}

export function playFeedbackTone(kind: FeedbackKind = "correct") {
  if (!hasWindow() || !isSoundEnabled()) return;
  try {
    const AudioContextClass =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = kind === "correct" ? 880 : 240;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
    osc.start(now);
    osc.stop(now + 0.2);
    osc.onended = () => {
      try {
        ctx.close();
      } catch {}
    };
  } catch {}
}

export default {};
