// Grammatik-Bereich: Nachschlage-Liste der Grammatikthemen (aus grammar.json)
// mit Erklärung, optionaler Tabelle (z. B. Konjugation), Beispielsätzen und
// kleinen Lückentext-Übungen. Die Übungen beeinflussen den SRS-Lernstand
// nicht – reines Üben, wie das Quiz.
//
// Datenformat je Thema (alle Felder außer id/title optional):
// {
//   "id": "ser-vs-estar", "title": "ser vs. estar", "lesson": "1-2",
//   "explanation": "Absätze durch Leerzeile trennen…",
//   "table": { "headers": ["", "ser", "estar"], "rows": [["yo", "soy", "estoy"]] },
//   "examples": [{ "es": "Soy de México.", "de": "Ich komme aus Mexiko." }],
//   "exercises": [{ "prompt": "Yo ___ estudiante. (ser)", "answer": "soy" }]
// }
import { useMemo, useState } from "react";
import { grammarTopics } from "../lib/deck";
import { checkSpanish } from "../lib/spanish";
import { useSpeech } from "../lib/speech";
import SpeakButton from "./SpeakButton";

export default function Grammar() {
  const speech = useSpeech();
  const [lesson, setLesson] = useState("alle");
  const [open, setOpen] = useState(null);

  // Lektionen, zu denen es Grammatikthemen gibt (in Datenreihenfolge).
  const lessons = useMemo(
    () => [...new Set(grammarTopics.map((t) => t.lesson).filter(Boolean))],
    []
  );
  const topics =
    lesson === "alle"
      ? grammarTopics
      : grammarTopics.filter((t) => t.lesson === lesson);

  if (grammarTopics.length === 0) {
    return (
      <div className="space-y-3 text-center text-zinc-500">
        <p className="text-5xl">📝</p>
        <p className="font-medium">Noch keine Grammatikthemen vorhanden.</p>
        <p className="text-sm">
          Die Grammatikliste kommt in <code>src/data/grammar.json</code>. Das
          Format steht in der README.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {lessons.length > 1 && (
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          Lektion:
          <select
            value={lesson}
            onChange={(e) => setLesson(e.target.value)}
            className="rounded border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-800"
          >
            <option value="alle">alle ({grammarTopics.length})</option>
            {lessons.map((l) => (
              <option key={l} value={l}>
                {l} ({grammarTopics.filter((t) => t.lesson === l).length})
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="space-y-2">
        {topics.map((t) => (
          <section
            key={t.id}
            className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
          >
            <button
              onClick={() => setOpen(open === t.id ? null : t.id)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <span className="font-semibold">{t.title}</span>
              <span className="flex items-center gap-2 text-xs text-zinc-400">
                {t.lesson}
                <span>{open === t.id ? "▲" : "▼"}</span>
              </span>
            </button>
            {open === t.id && (
              <div className="space-y-4 border-t border-zinc-100 px-4 py-3 text-sm dark:border-zinc-700">
                {t.explanation && (
                  <div className="space-y-2">
                    {t.explanation.split(/\n\s*\n/).map((p, i) => (
                      <p key={i} className="whitespace-pre-line">
                        {p}
                      </p>
                    ))}
                  </div>
                )}
                {t.table && <GrammarTable table={t.table} />}
                {t.examples?.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Beispiele
                    </h4>
                    <ul className="space-y-1.5">
                      {t.examples.map((ex, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <SpeakButton text={ex.es} speech={speech} small />
                          <span>
                            <span className="es">{ex.es}</span>
                            {ex.de && (
                              <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                                {ex.de}
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {t.exercises?.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      Übungen
                    </h4>
                    <div className="space-y-2">
                      {t.exercises.map((ex, i) => (
                        <Exercise key={`${t.id}-${i}`} exercise={ex} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

// Tabelle (z. B. Konjugation): erste Zeile Kopf, erste Spalte hervorgehoben.
function GrammarTable({ table }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        {table.headers && (
          <thead>
            <tr>
              {table.headers.map((h, i) => (
                <th
                  key={i}
                  className="border-b border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {table.rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`px-2 py-1 ${j === 0 ? "text-zinc-500 dark:text-zinc-400" : "es"}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Lückentext-Übung: Eingabe, Prüfen (akzent-tolerant mit Hinweis), Lösung.
function Exercise({ exercise }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null); // null | correct | accents | wrong

  const check = () => {
    if (!input.trim()) return;
    setResult(checkSpanish(input, exercise.answer));
  };
  const reset = () => {
    setInput("");
    setResult(null);
  };

  const cls =
    result === "correct"
      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
      : result
        ? "border-rose-500 bg-rose-50 dark:bg-rose-950"
        : "border-zinc-300 focus:border-sky-500 dark:border-zinc-600";

  return (
    <div className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
      <p className="es mb-1.5">{exercise.prompt}</p>
      <div className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (result ? reset() : check())}
          disabled={!!result}
          autoCapitalize="off"
          autoCorrect="off"
          lang="es"
          placeholder="Antwort"
          className={`min-w-0 flex-1 rounded-lg border bg-white px-3 py-1.5 outline-none dark:bg-zinc-800 ${cls}`}
        />
        <button
          onClick={result ? reset : check}
          className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
        >
          {result ? "Nochmal" : "Prüfen"}
        </button>
      </div>
      {result && result !== "correct" && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          {result === "accents" && "Fast! Achte auf Akzente bzw. ñ. "}
          Lösung: <span className="es text-emerald-600 dark:text-emerald-400">{exercise.answer}</span>
          {exercise.hint && ` — ${exercise.hint}`}
        </p>
      )}
      {result === "correct" && (
        <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">Richtig! ✓</p>
      )}
    </div>
  );
}
