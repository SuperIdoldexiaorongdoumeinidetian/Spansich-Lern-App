// Verbliste für den Konjugationstrainer (Tab "Verben"), aufbereitet aus
// verbs.json. Getrennt von der Engine (conjugation.js), damit die Engine
// ohne Daten testbar bleibt – und getrennt von deck.js, weil Verbformen
// keine SRS-Karten sind (der Trainer ist reines Üben, wie das Quiz).
import verbsData from "../data/verbs.json";
import { prepareVerbs } from "./conjugation";

// Alle Verben in Datenreihenfolge, mit `id` und `irregular`-Flag.
export const VERBS = prepareVerbs(verbsData);

// Lektionen, zu denen es Verben gibt (leer, solange keine `lesson`-Felder
// gesetzt sind – dann blendet die UI den Lektionsfilter aus). Sortiert nach
// Lektionsnummer ("1-12" vor "1-15" vor "2-12"), weil die Verben in
// verbs.json nicht nach Lektion geordnet sind; andere Namen kommen ans Ende.
const lessonSortKey = (l) => {
  const m = /^(\d+)-(\d+)$/.exec(l);
  return m ? Number(m[1]) * 1000 + Number(m[2]) : Number.MAX_SAFE_INTEGER;
};
export const VERB_LESSONS = [
  ...new Set(VERBS.map((v) => v.lesson).filter(Boolean)),
].sort((a, b) => lessonSortKey(a) - lessonSortKey(b) || a.localeCompare(b));
