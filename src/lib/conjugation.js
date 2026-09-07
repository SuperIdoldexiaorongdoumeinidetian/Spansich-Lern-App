// Konjugations-Logik: erzeugt aus einem Infinitiv die Verbformen für die
// wichtigsten Zeiten. Regelmäßige Formen werden nach Regel gebildet,
// unregelmäßige stehen in verbs.json und überschreiben die Regel-Form.
//
// Warum nicht alle Formen in die JSON schreiben? Weil die allermeisten
// spanischen Verben regelmäßig sind — so genügt beim Einpflegen eines neuen
// Verbs eine Zeile ({ "infinitive": "trabajar", "meaning": "arbeiten" }),
// und nur die Ausnahmen müssen ausgeschrieben werden.
//
// Datenformat je Verb (verbs.json):
// {
//   "infinitive": "tener",            ← Pflicht, Infinitiv auf -ar/-er/-ir
//   "meaning": "haben",               ← deutsche Bedeutung (optional; fehlt sie,
//                                        wird sie in vocab.json nachgeschlagen)
//   "lesson": "Basis",                ← Lektion/Gruppe für den Filter (optional)
//   "forms": {                        ← nur unregelmäßige Formen (optional)
//     "presente": ["tengo", "tienes", "tiene", null, "tienen"]
//   }                                    null = diese Form ist regelmäßig
// }
// Reihenfolge in den Arrays = PERSONS (yo, tú, él/ella/usted, nosotros/-as,
// ellos/ellas/ustedes).
import verbData from "../data/verbs.json";
import vocab from "../data/vocab.json";
import { stripAccents } from "./spanish";

// Personen. Bewusst OHNE "vosotros": In Mexiko (und ganz Lateinamerika) sagt
// man "ustedes" für "ihr" — mit derselben Verbform wie ellos/ellas.
export const PERSONS = [
  { id: "yo", label: "yo", short: "yo" },
  { id: "tu", label: "tú", short: "tú" },
  { id: "el", label: "él / ella / usted", short: "él" },
  { id: "nosotros", label: "nosotros / nosotras", short: "nos." },
  { id: "ellos", label: "ellos / ellas / ustedes", short: "ellos" },
];

// Zeiten mit deutscher Bezeichnung und Kurzerklärung (für die Auswahl).
export const TENSES = [
  {
    id: "presente",
    label: "Presente",
    de: "Präsens",
    hint: "Gegenwart, Gewohnheiten: Hablo español.",
  },
  {
    id: "preterito",
    label: "Pretérito indefinido",
    de: "einfache Vergangenheit",
    hint: "Abgeschlossene Handlung: Ayer hablé con ella.",
  },
  {
    id: "imperfecto",
    label: "Pretérito imperfecto",
    de: "Verlaufsvergangenheit",
    hint: "Zustände, Gewohnheiten, Hintergrund: Antes hablaba poco.",
  },
  {
    id: "futuro",
    label: "Futuro simple",
    de: "Zukunft",
    hint: "Vorhersage, Absicht: Mañana hablaré con él.",
  },
  {
    id: "condicional",
    label: "Condicional",
    de: "Konditional",
    hint: "Höflichkeit, Hypothese: Hablaría contigo, pero…",
  },
];

// Regelmäßige Endungen je Zeit und Verbgruppe (Reihenfolge = PERSONS).
// Bei Futuro und Condicional hängt die Endung an den ganzen Infinitiv, sonst
// an den Stamm (Infinitiv ohne -ar/-er/-ir).
export const ENDINGS = {
  presente: {
    ar: ["o", "as", "a", "amos", "an"],
    er: ["o", "es", "e", "emos", "en"],
    ir: ["o", "es", "e", "imos", "en"],
  },
  preterito: {
    ar: ["é", "aste", "ó", "amos", "aron"],
    er: ["í", "iste", "ió", "imos", "ieron"],
    ir: ["í", "iste", "ió", "imos", "ieron"],
  },
  imperfecto: {
    ar: ["aba", "abas", "aba", "ábamos", "aban"],
    er: ["ía", "ías", "ía", "íamos", "ían"],
    ir: ["ía", "ías", "ía", "íamos", "ían"],
  },
  futuro: {
    ar: ["é", "ás", "á", "emos", "án"],
    er: ["é", "ás", "á", "emos", "án"],
    ir: ["é", "ás", "á", "emos", "án"],
  },
  condicional: {
    ar: ["ía", "ías", "ía", "íamos", "ían"],
    er: ["ía", "ías", "ía", "íamos", "ían"],
    ir: ["ía", "ías", "ía", "íamos", "ían"],
  },
};

// Verbgruppe aus dem Infinitiv: "ar" | "er" | "ir" (null, wenn unbekannt).
export function verbGroup(infinitive) {
  const end = infinitive.trim().slice(-2);
  return ["ar", "er", "ir"].includes(end) ? end : null;
}

// Regelmäßige Form bilden. Neben der reinen Endung gibt es zwei
// Rechtschreib-Regeln, die alle Spanischlerner brauchen:
//  1. Pretérito, yo-Form bei -car/-gar/-zar: c→qu, g→gu, z→c
//     (buscar → busqué, llegar → llegué, empezar → empecé), damit die
//     Aussprache des Stamms erhalten bleibt.
//  2. Pretérito bei -er/-ir mit Vokal am Stammende (leer, creer, oír, caer):
//     i zwischen Vokalen wird y (leyó, leyeron), und tú/nosotros bekommen
//     einen Akzent auf dem i (leíste, leímos).
export function regularForm(infinitive, tense, personIdx) {
  const group = verbGroup(infinitive);
  if (!group) return null;
  const ending = ENDINGS[tense]?.[group]?.[personIdx];
  if (ending == null) return null;

  if (tense === "futuro" || tense === "condicional") return infinitive + ending;

  let stem = infinitive.slice(0, -2);

  if (tense === "preterito") {
    if (group === "ar" && personIdx === 0) {
      if (stem.endsWith("c")) stem = stem.slice(0, -1) + "qu";
      else if (stem.endsWith("g")) stem = stem.slice(0, -1) + "gu";
      else if (stem.endsWith("z")) stem = stem.slice(0, -1) + "c";
    }
    if (group !== "ar" && /[aeo]$/.test(stem)) {
      const vowelStem = {
        1: "íste",
        2: "yó",
        3: "ímos",
        4: "yeron",
      };
      if (vowelStem[personIdx]) return stem + vowelStem[personIdx];
    }
  }
  return stem + ending;
}

// Alle fünf Formen einer Zeit: unregelmäßige Form aus den Daten, sonst Regel.
export function conjugate(verb, tense) {
  const irregular = verb.forms?.[tense] ?? [];
  return PERSONS.map((_, i) => irregular[i] || regularForm(verb.infinitive, tense, i));
}

// Ist eine bestimmte Form unregelmäßig (weicht von der Regel ab)? Wird in der
// Tabelle zum Hervorheben genutzt.
export function isIrregularForm(verb, tense, personIdx) {
  const given = verb.forms?.[tense]?.[personIdx];
  return !!given && given !== regularForm(verb.infinitive, tense, personIdx);
}

// Bedeutung notfalls aus der Vokabelliste holen (dort steht das Verb evtl.
// schon mit Übersetzung; so muss man sie nicht doppelt pflegen).
function lookupMeaning(infinitive) {
  const hit = vocab.find(
    (e) =>
      e.spanish?.split(/\s*[/;]\s*/).some((alt) => alt.trim() === infinitive) &&
      e.meaning
  );
  return hit?.meaning ?? "";
}

// Alle Verben aus verbs.json, aufbereitet: nur gültige Infinitive, Bedeutung
// ergänzt, `irregular` = hat mindestens eine unregelmäßige Form.
export const verbs = verbData
  .filter((v) => v.infinitive && verbGroup(v.infinitive))
  .map((v) => ({
    ...v,
    infinitive: v.infinitive.trim(),
    meaning: v.meaning || lookupMeaning(v.infinitive.trim()),
    irregular: TENSES.some((t) =>
      PERSONS.some((_, i) => isIrregularForm(v, t.id, i))
    ),
  }));

// Lektionen/Gruppen der Verben (Reihenfolge des ersten Vorkommens).
export const VERB_LESSONS = [...new Set(verbs.map((v) => v.lesson).filter(Boolean))];

// Für Trainer-Eingaben: ein vorangestelltes Pronomen ("yo hablo") darf mit
// eingetippt werden – es zählt nur die Verbform.
const PRONOUN = /^(yo|tú|tu|él|el|ella|usted|nosotros|nosotras|ellos|ellas|ustedes)\s+/;
export function stripPronoun(input) {
  return input.trim().toLowerCase().replace(PRONOUN, "");
}

// Vergleich Eingabe ↔ Zielform: "correct" | "accents" | "wrong".
// Gleiche Logik wie checkSpanish, nur ohne Artikel-Toleranz (bei Verbformen
// gibt es keine Artikel) und mit Pronomen-Toleranz.
export function checkForm(input, form) {
  const inp = stripPronoun(input);
  if (!inp) return "wrong";
  const tgt = form.trim().toLowerCase();
  if (inp === tgt) return "correct";
  if (stripAccents(inp) === stripAccents(tgt)) return "accents";
  return "wrong";
}

// Zufällige Trainer-Fragen: Kombination aus Verb, Zeit und Person. Es wird
// versucht, keine Kombination doppelt zu stellen (solange genug vorhanden).
export function buildQuestions(pool, tenseIds, count) {
  const all = [];
  for (const verb of pool)
    for (const tense of tenseIds)
      for (let p = 0; p < PERSONS.length; p++) all.push({ verb, tense, person: p });
  // mischen (Fisher-Yates) und abschneiden
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all.slice(0, Math.min(count, all.length)).map((q) => ({
    ...q,
    answer: conjugate(q.verb, q.tense)[q.person],
  }));
}
