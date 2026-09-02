// Audio-Aussprache über die im Browser eingebaute Web Speech API.
// Komplett kostenlos und offline — es werden keine externen Dienste genutzt.
//
// Warum eine eigene Datei + Hook? Die Stimmen-Verwaltung hat ein paar
// Eigenheiten (vor allem auf iOS/Safari), die wir an genau einer Stelle
// kapseln, damit jede Komponente nur `speak()` und `available` braucht.
import { useEffect, useState } from "react";

const synth = typeof window !== "undefined" ? window.speechSynthesis : null;

// Eine spanische Stimme aus der Liste heraussuchen. Bevorzugt mexikanisches
// Spanisch (es-MX), danach andere lateinamerikanische Varianten (es-US,
// es-419), notfalls irgendeine spanische Stimme (z. B. es-ES aus Spanien) –
// Hauptsache überhaupt Spanisch.
function pickSpanishVoice(voices) {
  const norm = (l) => (l || "").toLowerCase().replace("_", "-");
  return (
    voices.find((v) => norm(v.lang) === "es-mx") ||
    voices.find((v) => ["es-us", "es-419"].includes(norm(v.lang))) ||
    voices.find((v) => norm(v.lang).startsWith("es")) ||
    null
  );
}

// React-Hook: lädt die Stimmenliste (asynchron, mit voiceschanged-Event),
// cached die gefundene spanische Stimme und stellt `speak` bereit.
export function useSpeech() {
  // null = noch nicht geladen, false = keine es-Stimme, Voice = gefunden
  const [voice, setVoice] = useState(null);

  useEffect(() => {
    if (!synth) {
      setVoice(false);
      return;
    }
    // Auf iOS ist getVoices() beim ersten Aufruf oft leer; die Liste kommt
    // erst per "voiceschanged"-Event nach. Wir prüfen beides.
    const load = () => {
      const voices = synth.getVoices();
      if (voices.length === 0) return; // noch nicht da — auf Event warten
      setVoice(pickSpanishVoice(voices) ?? false);
    };
    load();
    synth.addEventListener("voiceschanged", load);
    return () => synth.removeEventListener("voiceschanged", load);
  }, []);

  // Text auf Spanisch vorlesen. Muss aus einer echten Nutzerinteraktion
  // (z. B. Button-Klick) heraus aufgerufen werden — iOS spielt sonst nichts ab.
  const speak = (text) => {
    if (!synth || !voice || !text) return;
    synth.cancel(); // laufende Wiedergabe abbrechen, damit sich nichts überlagert
    // Alternativen aus der Liste ("el carro / el coche") mit kurzer Pause
    // vorlesen statt den Schrägstrich mitzusprechen.
    const u = new SpeechSynthesisUtterance(text.replace(/\s*\/\s*/g, ", "));
    u.voice = voice;
    u.lang = voice.lang || "es-MX";
    u.rate = 0.9; // etwas verlangsamt, damit man gut mithört
    synth.speak(u);
  };

  return {
    speak,
    // Audio nutzbar, sobald eine spanische Stimme gefunden wurde.
    available: !!voice,
    // true, solange wir noch nicht wissen, ob eine Stimme existiert.
    loading: voice === null,
    // Sprachcode der gefundenen Stimme (für einen Hinweis wie "es-MX").
    lang: voice ? voice.lang : null,
  };
}
