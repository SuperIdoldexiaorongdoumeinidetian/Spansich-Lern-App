// Vokabelliste zum Nachschlagen: Suche (Spanisch oder Deutsch), Filter nach
// Lektion, Aussprache und Lernstatus (✓ = mindestens einmal bewertet).
// Gegenstück zur Nachschlage-Liste im Radikal-Trainer der Chinesisch-App.
import { useMemo, useState } from "react";
import { LESSONS, lessonLabel, DIRECTIONS, vocabCards, srsKey } from "../lib/deck";
import { stripAccents } from "../lib/spanish";
import { useSpeech } from "../lib/speech";
import SpeakButton from "./SpeakButton";
import CardDetails from "./CardDetails";
import ExamBadge from "./ExamBadge";

const ALL_DIRS = Object.keys(DIRECTIONS);
// Nicht mehr als so viele Einträge auf einmal rendern – bei einer großen
// Liste bleibt die Seite damit flüssig; die Suche grenzt weiter ein.
const MAX_SHOWN = 300;

export default function VocabList({ state }) {
  const speech = useSpeech();
  const [query, setQuery] = useState("");
  const [lesson, setLesson] = useState("alle");
  const [open, setOpen] = useState(null); // ID der aufgeklappten Karte

  const filtered = useMemo(() => {
    // Akzent-unabhängig suchen: "cancion" findet auch "canción".
    const q = stripAccents(query.trim().toLowerCase());
    return vocabCards.filter((c) => {
      if (lesson !== "alle" && c.lesson !== lesson) return false;
      if (!q) return true;
      const hay = stripAccents(`${c.spanish} ${c.meaning}`.toLowerCase());
      return hay.includes(q);
    });
  }, [query, lesson]);

  const isLearned = (card) =>
    ALL_DIRS.some((d) => state.srs[srsKey(card, d)]);

  if (vocabCards.length === 0) {
    return (
      <div className="space-y-3 text-center text-zinc-500">
        <p className="text-5xl">📖</p>
        <p className="font-medium">Noch keine Vokabeln vorhanden.</p>
        <p className="text-sm">
          Die Vokabelliste kommt in <code>src/data/vocab.json</code>. Das
          Format steht in der README.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suchen (Spanisch oder Deutsch)…"
          className="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-emerald-500 dark:border-zinc-600 dark:bg-zinc-800"
        />
        <select
          value={lesson}
          onChange={(e) => setLesson(e.target.value)}
          className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        >
          <option value="alle">alle Lektionen</option>
          {LESSONS.map((l) => (
            <option key={l} value={l}>
              {lessonLabel(l)}
            </option>
          ))}
        </select>
      </div>

      <p className="text-xs text-zinc-400">
        {filtered.length} Einträge
        {filtered.length > MAX_SHOWN && ` (die ersten ${MAX_SHOWN} angezeigt)`}
      </p>

      <div className="space-y-1.5">
        {filtered.slice(0, MAX_SHOWN).map((c) => (
          <div
            key={c.id}
            onClick={() => setOpen(open === c.id ? null : c.id)}
            className="cursor-pointer rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-zinc-800"
          >
            <div className="flex items-center gap-2">
              <span className="min-w-0 flex-1">
                <span className="es block truncate">
                  {c.spanish}
                  {isLearned(c) && (
                    <span className="ml-1.5 text-xs text-emerald-600" title="schon gelernt">
                      ✓
                    </span>
                  )}
                </span>
                <span className="block truncate text-zinc-500 dark:text-zinc-400">
                  {c.meaning}
                </span>
              </span>
              <span className="shrink-0 text-xs text-zinc-400">{c.lesson}</span>
              <SpeakButton text={c.spanish} speech={speech} small />
            </div>
            {open === c.id && (
              <div className="mt-2 border-t border-zinc-100 pt-2 text-left dark:border-zinc-700">
                <ExamBadge card={c} className="mb-1" />
                <CardDetails card={c} speech={speech} compact />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
