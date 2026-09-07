// Deck-Logik: macht aus den JSON-Daten "Karten" mit stabiler ID und
// stellt Filterung (Lektionen, Eigennamen) und Sitzungsaufbau bereit.
//
// Anders als in der Chinesisch-App sind die Lektionen hier NICHT fest im
// Code hinterlegt, sondern werden aus den Daten abgeleitet. Warum? Die
// Vokabelliste kommt erst später – so muss beim Einpflegen neuer Lektionen
// nichts im Code angepasst werden: einfach an vocab.json anhängen, fertig.
import vocab from "../data/vocab.json";
import grammar from "../data/grammar.json";
import lessons from "../data/lessons.json";

// Abfragerichtungen: sm = Spanisch → Bedeutung, ms = Bedeutung → Spanisch.
export const DIRECTIONS = {
  sm: { label: "Spanisch → Deutsch" },
  ms: { label: "Deutsch → Spanisch" },
};

// Vokabel-Karten: ID aus Lektion + spanischem Wort + Wortart (eindeutig,
// solange dieselbe Vokabel nicht doppelt mit gleicher Wortart in derselben
// Lektion steht). Die ID ist der Schlüssel für den Lernstand – sie darf sich
// später nicht mehr ändern, sonst geht der Fortschritt der Karte verloren.
export const vocabCards = vocab.map((e) => ({
  ...e,
  id: `${e.lesson}|${e.spanish}|${e.wordClass ?? ""}`,
  type: "vocab",
}));

// Alle Lektionen in Reihenfolge des ersten Vorkommens in den Daten
// (für Auswahl-Listen und Statistik).
export const LESSONS = [...new Set(vocabCards.map((c) => c.lesson))];

// Lektionstitel aus lessons.json: "1-1" → "Begrüßung & Höflichkeit". Die
// Nummern allein sagen dem Lernenden wenig, deshalb zeigt die UI den Titel
// mit an. Fehlt ein Titel (oder die Datei ist leer), bleibt es bei der Nummer.
export const LESSON_TITLES = Object.fromEntries(
  lessons.filter((l) => l && l.lesson).map((l) => [l.lesson, l.title ?? ""])
);
export const lessonTitle = (lesson) => LESSON_TITLES[lesson] ?? "";

// Anzeigetext für Auswahllisten: "1-1 · Begrüßung & Höflichkeit" (ohne Titel
// nur "1-1").
export function lessonLabel(lesson) {
  const title = lessonTitle(lesson);
  return title ? `${lesson} · ${title}` : lesson;
}

// Alle Grammatikthemen (Nachschlage-Liste + Übungen im Grammatik-Tab).
export const grammarTopics = grammar;

// Gruppen für die Deck-Auswahl: "1-1", "1-2", … landen unter "Lektion 1",
// alles andere (z. B. "Extras", "Mexiko") bildet eine eigene Gruppe mit dem
// Lektionsnamen selbst. Reihenfolge = erstes Vorkommen in den Daten.
export function lessonGroups(lessons = LESSONS) {
  const groups = [];
  for (const lesson of lessons) {
    const m = /^(\d+)-\d+$/.exec(lesson);
    const title = m ? `Lektion ${m[1]}` : lesson;
    let g = groups.find((x) => x.title === title);
    if (!g) {
      g = { title, items: [] };
      groups.push(g);
    }
    g.items.push(lesson);
  }
  return groups;
}

// "Prüfungsrelevant": in der Vokabelliste explizit als solche markiert.
// Darüber filtert der Schalter „nur prüfungsrelevante Vokabeln".
export const isExamRelevant = (card) => card.examRelevant === true;

// Gibt es überhaupt prüfungsrelevante Vokabeln? Wenn nicht, blenden die
// Komponenten den Filter und die Fortschrittsanzeige dafür aus.
export const hasExamRelevant = vocabCards.some(isExamRelevant);

// Karten-Pool für eine Deck-Auswahl zusammenstellen.
// onlyHighlighted: nur prüfungsrelevante Vokabeln.
export function buildPool(decks, includeProperNames, onlyHighlighted = false) {
  const pool = [];
  for (const c of vocabCards) {
    if (!decks.includes(c.lesson)) continue;
    if (c.isProperName && !includeProperNames) continue;
    if (onlyHighlighted && !isExamRelevant(c)) continue;
    pool.push(c);
  }
  return pool;
}

// Schlüssel für den SRS-Zustand: Karte + Abfragerichtung.
export const srsKey = (card, dir) => `${card.id}|${dir}`;

// Baut die heutige Lern-Session: erst fällige Wiederholungen, dann neue
// Karten (begrenzt durch das Tageslimit).
export function buildSession(pool, directions, srs, newLimit, now = Date.now()) {
  const due = [];
  const fresh = [];
  for (const card of pool) {
    for (const dir of directions) {
      const st = srs[srsKey(card, dir)];
      if (st && st.dueDate != null) {
        if (st.dueDate <= now) due.push({ card, dir, state: st });
      } else {
        fresh.push({ card, dir, state: null });
      }
    }
  }
  // Fällige nach Fälligkeit (älteste zuerst), neue in Datenreihenfolge.
  due.sort((a, b) => a.state.dueDate - b.state.dueDate);
  return { due, fresh: fresh.slice(0, Math.max(0, newLimit)) };
}

// Zufällige Auswahl von n Elementen (für Quiz-Distraktoren).
export function sample(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

// Multiple-Choice-Optionen: 3 Distraktoren, bevorzugt aus derselben Lektion.
export function mcOptions(card, pool, field) {
  const others = pool.filter((c) => c.id !== card.id && c[field] !== card[field]);
  const sameLesson = others.filter((c) => c.lesson === card.lesson);
  const distractors = sample(sameLesson, 3);
  if (distractors.length < 3) {
    const rest = others.filter((c) => !distractors.includes(c));
    distractors.push(...sample(rest, 3 - distractors.length));
  }
  return sample([card, ...distractors], 4); // mischen
}
