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
  if (!isSpeechSynthesisSupported()) return;

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

export function playFeedbackTone(kind: FeedbackKind) {
  if (!hasWindow()) return;

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
