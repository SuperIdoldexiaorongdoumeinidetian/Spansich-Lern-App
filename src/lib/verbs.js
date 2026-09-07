// Verbliste für den Konjugationstrainer (Tab "Verben"), aufbereitet aus
// verbs.json. Getrennt von der Engine (conjugation.js), damit die Engine
// ohne Daten testbar bleibt – und getrennt von deck.js, weil Verbformen
// keine SRS-Karten sind (der Trainer ist reines Üben, wie das Quiz).
import verbsData from "../data/verbs.json";
import { prepareVerbs } from "./conjugation";

// Alle Verben in Datenreihenfolge, mit `id` und `irregular`-Flag.
export const VERBS = prepareVerbs(verbsData);

// Lektionen, zu denen es Verben gibt (leer, solange keine `lesson`-Felder
// gesetzt sind – dann blendet die UI den Lektionsfilter aus).
export const VERB_LESSONS = [
  ...new Set(VERBS.map((v) => v.lesson).filter(Boolean)),
];
