// Konjugations-Bereich (Tab "Verben"): zwei Ansichten.
//  1. Üben:     Verb + Person + Zeit werden vorgegeben, die Form wird
//               eingetippt und mit der Akzent-Prüfung verglichen. Wie das
//               Quiz reines Üben – der SRS-Lernstand bleibt unberührt.
//  2. Tabellen: Nachschlagen aller Formen eines Verbs; Formen, die von der
//               regelmäßigen Bildung abweichen, sind farblich markiert.
// Die Formen kommen aus der Engine in lib/conjugation.js, die Verbliste aus
// data/verbs.json (siehe README für das Datenformat).
import { useMemo, useState } from "react";
import { VERBS, VERB_LESSONS } from "../lib/verbs";
import {
  TENSES,
  TENSE_KEYS,
  PERSONS,
  personIndices,
  conjugate,
  irregularMask,
  participle,
  gerund,
  describeIrregularities,
} from "../lib/conjugation";
import { sample } from "../lib/deck";
import { checkSpanish, stripAccents } from "../lib/spanish";
import { useSpeech } from "../lib/speech";
import SpeakButton from "./SpeakButton";

const QUESTIONS = 15;
const VERB_FILTERS = {
  alle: "alle Verben",
  regular: "nur regelmäßige",
  irregular: "nur unregelmäßige",
};

// Gemeinsame Chip-Optik (wie Modus-Auswahl im Quiz). Die Klassen stehen
// ausgeschrieben da, weil Tailwind nur wörtlich vorkommende Klassen mitbaut.
const CHIP_ACTIVE = {
  sky: "bg-sky-600 text-white",
  emerald: "bg-emerald-600 text-white",
};
const chip = (active, color = "sky") =>
  `rounded-full px-3 py-1.5 text-sm transition-colors ${
    active
      ? CHIP_ACTIVE[color]
      : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
  }`;

export default function Conjugation({ state, setState }) {
  const { settings } = state;
  const speech = useSpeech();
  const [view, setView] = useState("train"); // train | table

  const updateSettings = (patch) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  if (VERBS.length === 0) {
    return (
      <div className="space-y-3 text-center text-zinc-500">
        <p className="text-5xl">🔁</p>
        <p className="font-medium">Noch keine Verben vorhanden.</p>
        <p className="text-sm">
          Die Verbliste kommt in <code>src/data/verbs.json</code>. Das Format
          steht in der README.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex gap-1.5">
        {[
          ["train", "✍️ Üben"],
          ["table", "📋 Tabellen"],
        ].map(([key, label]) => (
          <button key={key} onClick={() => setView(key)} className={chip(view === key)}>
            {label}
          </button>
        ))}
      </div>
      {view === "train" ? (
        <Trainer settings={settings} updateSettings={updateSettings} speech={speech} />
      ) : (
        <VerbTables settings={settings} updateSettings={updateSettings} speech={speech} />
      )}
    </div>
  );
}

// Verben nach Einstellung filtern (regelmäßig/unregelmäßig, Lektion).
function filterVerbs(settings) {
  return VERBS.filter((v) => {
    if (settings.conjVerbs === "regular" && v.irregular) return false;
    if (settings.conjVerbs === "irregular" && !v.irregular) return false;
    if (settings.conjLesson !== "alle" && v.lesson !== settings.conjLesson) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// Ansicht 1: Trainer (Setup → Fragen → Ergebnis)
// ---------------------------------------------------------------------------
function Trainer({ settings, updateSettings, speech }) {
  const [phase, setPhase] = useState("setup"); // setup | run | done
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null); // null | correct | accents | wrong

  // Ungültige gespeicherte Zeiten (z. B. nach Umbenennung) still ignorieren.
  const tenses = settings.conjTenses.filter((t) => TENSES[t]);
  const persons = personIndices(settings.includeVosotros);
  const pool = useMemo(() => filterVerbs(settings), [settings]);

  const toggleTense = (t) => {
    const next = tenses.includes(t) ? tenses.filter((x) => x !== t) : [...tenses, t];
    if (next.length > 0) updateSettings({ conjTenses: next }); // mindestens eine Zeit
  };

  const start = () => {
    // Alle Kombinationen Verb × Zeit × Person bilden und daraus zufällig
    // ziehen – so kommt keine Kombination doppelt vor.
    const combos = [];
    for (const verb of pool)
      for (const tense of tenses)
        for (const p of persons) combos.push({ verb, tense, p });
    setQuestions(
      sample(combos, Math.min(QUESTIONS, combos.length)).map((q) => ({
        ...q,
        answer: conjugate(q.verb, q.tense)[q.p],
      }))
    );
    setIdx(0);
    setScore(0);
    setInput("");
    setResult(null);
    setPhase("run");
  };

  const check = () => {
    if (!input.trim()) return;
    const r = checkSpanish(input, questions[idx].answer);
    if (r === "correct") setScore((s) => s + 1);
    setResult(r);
  };

  const next = () => {
    if (idx + 1 >= questions.length) setPhase("done");
    else {
      setIdx(idx + 1);
      setInput("");
      setResult(null);
    }
  };

  if (phase === "setup") {
    const combos = pool.length * tenses.length * persons.length;
    return (
      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Zeiten
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {TENSE_KEYS.map((t) => (
              <button
                key={t}
                onClick={() => toggleTense(t)}
                title={`${TENSES[t].de} — ${TENSES[t].example}`}
                className={chip(tenses.includes(t))}
              >
                {TENSES[t].label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-zinc-400">
            {tenses.map((t) => `${TENSES[t].label} = ${TENSES[t].de}`).join(" · ")}
          </p>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Verben
          </h3>
          <div className="flex flex-wrap items-center gap-1.5">
            {Object.entries(VERB_FILTERS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => updateSettings({ conjVerbs: key })}
                className={chip(settings.conjVerbs === key, "emerald")}
              >
                {label}
              </button>
            ))}
            {VERB_LESSONS.length > 0 && (
              <select
                value={settings.conjLesson}
                onChange={(e) => updateSettings({ conjLesson: e.target.value })}
                className="rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              >
                <option value="alle">alle Lektionen</option>
                {VERB_LESSONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={settings.includeVosotros}
            onChange={(e) => updateSettings({ includeVosotros: e.target.checked })}
            className="h-4 w-4 accent-emerald-600"
          />
          vosotros mit abfragen
          <span className="text-xs text-zinc-400">(in Mexiko sagt man ustedes)</span>
        </label>

        <div className="rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
          <span className="font-medium text-emerald-600 dark:text-emerald-400">
            {pool.length} Verben
          </span>
          {" · "}
          {tenses.length} {tenses.length === 1 ? "Zeit" : "Zeiten"}
          {" · "}
          {persons.length} Personen
          {" · "}
          <span className="text-zinc-500">{combos} mögliche Formen</span>
        </div>

        <button
          onClick={start}
          disabled={combos === 0}
          className="w-full rounded-xl bg-sky-600 py-3 font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-40"
        >
          Üben starten ({Math.min(QUESTIONS, combos)} Formen)
        </button>
        {pool.length === 0 && (
          <p className="text-center text-sm text-zinc-500">
            Kein Verb passt zur Auswahl — Filter ändern.
          </p>
        )}
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="space-y-4 text-center">
        <p className="text-5xl">{score / questions.length >= 0.8 ? "🏆" : "💪"}</p>
        <h2 className="text-xl font-bold">
          {score} von {questions.length} richtig
        </h2>
        <button
          onClick={() => setPhase("setup")}
          className="rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-700"
        >
          Neue Runde
        </button>
      </div>
    );
  }

  // ---- Frageansicht ----
  const q = questions[idx];
  const inputCls =
    result === "correct"
      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950"
      : result
        ? "border-rose-500 bg-rose-50 dark:bg-rose-950"
        : "border-zinc-300 focus:border-sky-500 dark:border-zinc-600";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-zinc-500">
        <span>
          Form {idx + 1} / {questions.length}
        </span>
        <span>Punkte: {score}</span>
      </div>

      <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <p className="es text-3xl leading-tight">{q.verb.infinitive}</p>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">{q.verb.meaning}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            {PERSONS[q.p].label}
          </span>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-sm font-medium text-sky-800 dark:bg-sky-900/40 dark:text-sky-300">
            {TENSES[q.tense].label}
          </span>
        </div>
        {result && (
          <div className="mt-2 flex items-center gap-2 text-2xl text-emerald-600 dark:text-emerald-400">
            <span className="es">{q.answer}</span>
            <SpeakButton text={q.answer} speech={speech} small />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (result ? next() : check())}
          placeholder={`${PERSONS[q.p].label.split(" ")[0]} …`}
          autoFocus
          autoCapitalize="off"
          autoCorrect="off"
          lang="es"
          disabled={!!result}
          className={`w-full rounded-xl border px-4 py-3 text-lg outline-none dark:bg-zinc-800 ${inputCls}`}
        />
        {result === "accents" && (
          <p className="text-sm text-amber-600">
            Fast! Die Buchstaben stimmen, aber Akzente (á, é, í, ó, ú) oder ñ
            fehlen bzw. sitzen falsch.
          </p>
        )}
        {result === "correct" && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Richtig! ✓</p>
        )}
        <button
          onClick={result ? next : check}
          className="w-full rounded-xl bg-sky-600 py-3 font-semibold text-white hover:bg-sky-700"
        >
          {result ? "Weiter" : "Prüfen"}
        </button>
      </div>

      {/* Nach der Antwort die ganze Zeit zum Vergleich einblenden – so sieht
          man die Form im Zusammenhang und lernt die Nachbarformen mit. */}
      {result && (
        <TenseTable
          verb={q.verb}
          tense={q.tense}
          persons={persons}
          highlight={q.p}
          speech={speech}
          compact
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ansicht 2: Tabellen zum Nachschlagen
// ---------------------------------------------------------------------------
function VerbTables({ settings, updateSettings, speech }) {
  const [query, setQuery] = useState("");
  const [verbId, setVerbId] = useState(VERBS[0].id);
  const [tense, setTense] = useState("presente");

  // Akzent-unabhängige Suche in Infinitiv und Bedeutung.
  const list = useMemo(() => {
    const q = stripAccents(query.trim().toLowerCase());
    if (!q) return VERBS;
    return VERBS.filter((v) =>
      stripAccents(`${v.infinitive} ${v.meaning}`.toLowerCase()).includes(q)
    );
  }, [query]);

  // Gewähltes Verb; fällt die Auswahl aus der Trefferliste, nimm den ersten Treffer.
  const verb = list.find((v) => v.id === verbId) ?? list[0] ?? null;
  const persons = personIndices(settings.includeVosotros);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Verb suchen (spanisch oder deutsch)"
          autoCapitalize="off"
          autoCorrect="off"
          className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2 outline-none focus:border-sky-500 dark:border-zinc-600 dark:bg-zinc-800"
        />
        <select
          value={verb?.id ?? ""}
          onChange={(e) => setVerbId(e.target.value)}
          className="max-w-[45%] rounded-xl border border-zinc-300 bg-white px-2 py-2 dark:border-zinc-600 dark:bg-zinc-800"
        >
          {list.map((v) => (
            <option key={v.id} value={v.id}>
              {v.infinitive}
            </option>
          ))}
        </select>
      </div>

      {!verb ? (
        <p className="text-center text-sm text-zinc-500">Kein Verb gefunden.</p>
      ) : (
        <>
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-3">
              <p className="es text-3xl leading-tight">{verb.infinitive}</p>
              <SpeakButton text={verb.infinitive} speech={speech} />
            </div>
            <p className="mt-1 text-zinc-600 dark:text-zinc-300">{verb.meaning}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {verb.irregular ? "unregelmäßig" : "regelmäßig"}
              {verb.lesson && ` · ${verb.lesson}`}
              {verb.mexico && " · 🇲🇽 mexikanisch"}
            </p>
            {describeIrregularities(verb).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {describeIrregularities(verb).map((d) => (
                  <span
                    key={d}
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900 dark:bg-amber-400/20 dark:text-amber-300"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
            {verb.note && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">💡 {verb.note}</p>
            )}
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              Gerundio: <span className="es">{gerund(verb)}</span> · Participio:{" "}
              <span className="es">{participle(verb)}</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TENSE_KEYS.map((t) => (
              <button
                key={t}
                onClick={() => setTense(t)}
                title={TENSES[t].de}
                className={chip(tense === t)}
              >
                {TENSES[t].label}
              </button>
            ))}
          </div>

          <TenseTable verb={verb} tense={tense} persons={persons} speech={speech} />

          <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={settings.includeVosotros}
              onChange={(e) => updateSettings({ includeVosotros: e.target.checked })}
              className="h-4 w-4 accent-emerald-600"
            />
            vosotros anzeigen
          </label>
          <p className="text-xs text-zinc-400">
            <span className="rounded bg-amber-100 px-1 text-amber-900 dark:bg-amber-400/20 dark:text-amber-300">
              markierte
            </span>{" "}
            Formen weichen von der regelmäßigen Bildung ab.
          </p>
        </>
      )}
    </div>
  );
}

// Tabelle einer Zeit: Person | Form | 🔊. Unregelmäßige Formen sind gelb
// hinterlegt; `highlight` hebt eine Person hervor (Trainer nach der Antwort).
function TenseTable({ verb, tense, persons, highlight = null, speech, compact = false }) {
  const forms = conjugate(verb, tense);
  const mask = irregularMask(verb, tense);
  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800">
      <div className="border-b border-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {TENSES[tense].label} · {TENSES[tense].de}
      </div>
      <table className="w-full text-left text-sm">
        <tbody>
          {persons.map((i) => (
            <tr
              key={i}
              className={`border-b border-zinc-100 last:border-0 dark:border-zinc-700 ${
                highlight === i ? "bg-sky-50 dark:bg-sky-900/30" : ""
              }`}
            >
              <td className={`px-4 ${compact ? "py-1" : "py-1.5"} w-2/5 text-zinc-500 dark:text-zinc-400`}>
                {PERSONS[i].label}
              </td>
              <td className={`px-2 ${compact ? "py-1" : "py-1.5"}`}>
                <span
                  className={`es rounded px-1 ${
                    mask[i] ? "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-300" : ""
                  }`}
                >
                  {forms[i]}
                </span>
              </td>
              <td className="w-10 px-2 text-right">
                <SpeakButton text={forms[i]} speech={speech} small />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
