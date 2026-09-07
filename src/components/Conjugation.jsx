// Verben-Bereich: Konjugationstrainer + Nachschlage-Tabelle.
//
// Zwei Ansichten:
//  1. Trainer: Verb + Person + Zeit werden vorgegeben, die Form wird
//     eingetippt und akzent-tolerant geprüft (wie im Quiz). Beeinflusst den
//     SRS-Lernstand nicht – reines Üben.
//  2. Tabelle: alle Formen eines Verbs in allen Zeiten, unregelmäßige Formen
//     hervorgehoben; dazu die regelmäßigen Endungen zum Nachschlagen.
//
// Die Verben kommen aus src/data/verbs.json (Format siehe conjugation.js).
import { useMemo, useState } from "react";
import {
  PERSONS,
  TENSES,
  ENDINGS,
  VERB_LESSONS,
  verbs,
  conjugate,
  isIrregularForm,
  checkForm,
  buildQuestions,
} from "../lib/conjugation";
import { useSpeech } from "../lib/speech";
import SpeakButton from "./SpeakButton";

const TRAINING_LENGTH = 10;
const VIEWS = { train: "Trainer", table: "Tabelle" };
const FILTERS = {
  alle: "alle Verben",
  irregular: "nur unregelmäßige",
  regular: "nur regelmäßige",
};

export default function Conjugation({ state, setState }) {
  const [view, setView] = useState("train");

  if (verbs.length === 0) {
    return (
      <div className="space-y-3 text-center text-zinc-500">
        <p className="text-5xl">🔤</p>
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
        {Object.entries(VIEWS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
              view === key
                ? "bg-sky-600 text-white"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {view === "train" ? (
        <Trainer state={state} setState={setState} />
      ) : (
        <VerbTable />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trainer
// ---------------------------------------------------------------------------
function Trainer({ state, setState }) {
  const { settings } = state;
  const speech = useSpeech();
  const [phase, setPhase] = useState("setup"); // setup | run | done
  const [questions, setQuestions] = useState([]);
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null); // null | correct | accents | wrong

  // Ausgewählte Zeiten und Filter liegen in den Einstellungen (werden also
  // gespeichert und mit synchronisiert), damit man nicht jedes Mal neu wählt.
  const tenseIds = settings.conjTenses ?? ["presente"];
  const filter = settings.conjFilter ?? "alle";
  const lesson = settings.conjLesson ?? "alle";
  const updateSettings = (patch) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  const toggleTense = (id) => {
    const next = tenseIds.includes(id)
      ? tenseIds.filter((t) => t !== id)
      : TENSES.map((t) => t.id).filter((t) => t === id || tenseIds.includes(t));
    updateSettings({ conjTenses: next });
  };

  const pool = useMemo(
    () =>
      verbs.filter(
        (v) =>
          (filter === "alle" ||
            (filter === "irregular" && v.irregular) ||
            (filter === "regular" && !v.irregular)) &&
          (lesson === "alle" || v.lesson === lesson)
      ),
    [filter, lesson]
  );

  const start = () => {
    setQuestions(buildQuestions(pool, tenseIds, TRAINING_LENGTH));
    setIdx(0);
    setScore(0);
    setInput("");
    setResult(null);
    setPhase("run");
  };

  const check = () => {
    if (!input.trim()) return;
    const r = checkForm(input, questions[idx].answer);
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
    const canStart = pool.length > 0 && tenseIds.length > 0;
    return (
      <div className="space-y-5">
        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Zeiten
          </h3>
          <div className="space-y-1.5">
            {TENSES.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              >
                <input
                  type="checkbox"
                  checked={tenseIds.includes(t.id)}
                  onChange={() => toggleTense(t.id)}
                  className="mt-0.5 accent-sky-600"
                />
                <span>
                  <span className="font-medium">{t.label}</span>
                  <span className="text-zinc-500 dark:text-zinc-400"> · {t.de}</span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {t.hint}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Verben
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(FILTERS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => updateSettings({ conjFilter: key })}
                className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
                  filter === key
                    ? "bg-emerald-600 text-white"
                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {VERB_LESSONS.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
              Lektion:
              <select
                value={lesson}
                onChange={(e) => updateSettings({ conjLesson: e.target.value })}
                className="rounded border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-800"
              >
                <option value="alle">alle</option>
                {VERB_LESSONS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {pool.length} Verben ausgewählt. Personen: yo, tú, él/ella/usted,
            nosotros, ellos/ustedes (ohne vosotros — in Mexiko sagt man ustedes).
          </p>
        </section>

        <button
          onClick={start}
          disabled={!canStart}
          className="w-full rounded-xl bg-sky-600 py-3 font-semibold text-white transition-colors hover:bg-sky-700 disabled:opacity-40"
        >
          Training starten ({Math.min(TRAINING_LENGTH, pool.length * tenseIds.length * PERSONS.length)} Formen)
        </button>
        {!canStart && (
          <p className="text-center text-sm text-zinc-500">
            {tenseIds.length === 0
              ? "Bitte mindestens eine Zeit auswählen."
              : "Keine Verben für diese Auswahl."}
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
          Neues Training
        </button>
      </div>
    );
  }

  // ---- Frageansicht ----
  const q = questions[idx];
  const tense = TENSES.find((t) => t.id === q.tense);
  const person = PERSONS[q.person];
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

      <div className="flex min-h-40 flex-col items-center justify-center gap-1 rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {tense.label} · {tense.de}
        </p>
        <p className="es text-3xl leading-tight">{q.verb.infinitive}</p>
        {q.verb.meaning && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{q.verb.meaning}</p>
        )}
        <p className="mt-3 text-2xl">
          {person.label} <span className="text-zinc-400">…</span>
        </p>
        {result && (
          <div className="mt-2 flex items-center gap-2 text-xl text-emerald-600 dark:text-emerald-400">
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
          placeholder={`Form für „${person.short}“ eingeben`}
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
        {result && result !== "correct" && (
          <TenseRow verb={q.verb} tense={q.tense} highlight={q.person} />
        )}
        <button
          onClick={result ? next : check}
          className="w-full rounded-xl bg-sky-600 py-3 font-semibold text-white hover:bg-sky-700"
        >
          {result ? "Weiter" : "Prüfen"}
        </button>
      </div>
    </div>
  );
}

// Nach einem Fehler: die komplette Reihe der Zeit zeigen, damit man das
// Muster sieht (nicht nur die eine Form).
function TenseRow({ verb, tense, highlight }) {
  const forms = conjugate(verb, tense);
  return (
    <div className="rounded-lg bg-zinc-50 p-2 text-sm dark:bg-zinc-900">
      <ul className="grid grid-cols-1 gap-x-4 gap-y-0.5 sm:grid-cols-2">
        {PERSONS.map((p, i) => (
          <li
            key={p.id}
            className={`flex justify-between ${
              i === highlight ? "font-semibold text-emerald-600 dark:text-emerald-400" : ""
            }`}
          >
            <span className="text-zinc-500 dark:text-zinc-400">{p.label}</span>
            <span className={`es ${isIrregularForm(verb, tense, i) ? "text-amber-600 dark:text-amber-400" : ""}`}>
              {forms[i]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Nachschlage-Tabelle
// ---------------------------------------------------------------------------
function VerbTable() {
  const speech = useSpeech();
  const [infinitive, setInfinitive] = useState(verbs[0].infinitive);
  const [showEndings, setShowEndings] = useState(false);
  const verb = verbs.find((v) => v.infinitive === infinitive) ?? verbs[0];

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        Verb:
        <select
          value={verb.infinitive}
          onChange={(e) => setInfinitive(e.target.value)}
          className="es min-w-0 flex-1 rounded border border-zinc-300 bg-white px-2 py-1.5 dark:border-zinc-600 dark:bg-zinc-800"
        >
          {verbs.map((v) => (
            <option key={v.infinitive} value={v.infinitive}>
              {v.infinitive}
              {v.meaning ? ` – ${v.meaning}` : ""}
              {v.irregular ? " *" : ""}
            </option>
          ))}
        </select>
      </label>

      <section className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="mb-2 flex items-center gap-2">
          <span className="es text-xl">{verb.infinitive}</span>
          <SpeakButton text={verb.infinitive} speech={speech} small />
          {verb.meaning && (
            <span className="text-sm text-zinc-500 dark:text-zinc-400">{verb.meaning}</span>
          )}
          {verb.irregular && (
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              unregelmäßig
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr>
                <th className="border-b border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400" />
                {TENSES.map((t) => (
                  <th
                    key={t.id}
                    className="whitespace-nowrap border-b border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                  >
                    {t.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERSONS.map((p, i) => (
                <tr key={p.id}>
                  <td className="whitespace-nowrap px-2 py-1 text-zinc-500 dark:text-zinc-400">
                    {p.label}
                  </td>
                  {TENSES.map((t) => {
                    const form = conjugate(verb, t.id)[i];
                    const irregular = isIrregularForm(verb, t.id, i);
                    return (
                      <td key={t.id} className="px-2 py-1">
                        {/* Tippen auf eine Form liest sie vor. */}
                        <button
                          type="button"
                          onClick={() => speech.speak(form)}
                          className={`es whitespace-nowrap rounded px-1 hover:bg-zinc-100 dark:hover:bg-zinc-700 ${
                            irregular ? "text-amber-600 dark:text-amber-400" : ""
                          }`}
                        >
                          {form}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="text-amber-600 dark:text-amber-400">Gelb</span> =
          unregelmäßige Form. Tippen liest die Form vor.
        </p>
      </section>

      <button
        onClick={() => setShowEndings(!showEndings)}
        className="text-sm text-sky-600 hover:underline dark:text-sky-400"
      >
        {showEndings ? "▲ Regelmäßige Endungen ausblenden" : "▼ Regelmäßige Endungen zeigen"}
      </button>
      {showEndings && <EndingsTable />}
    </div>
  );
}

// Regelmäßige Endungen je Zeit für -ar / -er / -ir zum Nachschlagen.
function EndingsTable() {
  return (
    <div className="space-y-3">
      {TENSES.map((t) => (
        <section
          key={t.id}
          className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
        >
          <h4 className="mb-1 text-sm font-semibold">
            {t.label}{" "}
            <span className="font-normal text-zinc-500 dark:text-zinc-400">· {t.de}</span>
          </h4>
          <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
            {t.id === "futuro" || t.id === "condicional"
              ? "Endung an den ganzen Infinitiv anhängen (hablar + é = hablaré)."
              : "Endung an den Stamm anhängen (habl- + o = hablo)."}
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400" />
                  {["ar", "er", "ir"].map((g) => (
                    <th
                      key={g}
                      className="border-b border-zinc-200 px-2 py-1 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
                    >
                      -{g}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERSONS.map((p, i) => (
                  <tr key={p.id}>
                    <td className="whitespace-nowrap px-2 py-1 text-zinc-500 dark:text-zinc-400">
                      {p.label}
                    </td>
                    {["ar", "er", "ir"].map((g) => (
                      <td key={g} className="es px-2 py-1">
                        -{ENDINGS[t.id][g][i]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
