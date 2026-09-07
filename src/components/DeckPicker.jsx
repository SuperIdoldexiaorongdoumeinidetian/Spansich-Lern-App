// Auswahl der Lern-Decks (Lektionen), der Kartenrichtungen und des
// Eigennamen-Schalters. Wird von Flashcards und Quiz genutzt.
import {
  LESSONS,
  lessonGroups,
  lessonTitle,
  hasExamRelevant,
  DIRECTIONS,
} from "../lib/deck";

// Gruppen werden aus den Daten abgeleitet (siehe lessonGroups in deck.js):
// "1-1", "1-2" → "Lektion 1"; andere Namen bilden eine eigene Gruppe.
const GROUPS = lessonGroups(LESSONS);

export default function DeckPicker({
  decks,
  onDecks,
  directions,
  onDirections,
  includeProperNames,
  onIncludeProperNames,
  onlyHighlighted,
  onOnlyHighlighted,
  showDirections = true,
}) {
  const toggleDeck = (d) =>
    onDecks(decks.includes(d) ? decks.filter((x) => x !== d) : [...decks, d]);

  const toggleGroup = (items) => {
    const allOn = items.every((d) => decks.includes(d));
    onDecks(
      allOn
        ? decks.filter((d) => !items.includes(d))
        : [...new Set([...decks, ...items])]
    );
  };

  const toggleDir = (d) => {
    const next = directions.includes(d)
      ? directions.filter((x) => x !== d)
      : [...directions, d];
    if (next.length > 0) onDirections(next); // mindestens eine Richtung behalten
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          Decks auswählen
        </h3>
        {GROUPS.length === 0 ? (
          // Solange vocab.json leer ist, gibt es nichts auszuwählen.
          <p className="rounded-lg bg-zinc-100 p-3 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Noch keine Vokabeln vorhanden. Sobald die Vokabelliste in
            <code className="mx-1">src/data/vocab.json</code> eingetragen ist,
            erscheinen hier die Lektionen.
          </p>
        ) : (
          <div className="space-y-2">
            {GROUPS.map((g) => (
              <div key={g.title} className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => toggleGroup(g.items)}
                  className="w-24 shrink-0 text-left text-xs font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                  title="Ganze Gruppe an/aus"
                >
                  {g.title}
                </button>
                {g.items.map((d) => (
                  <button
                    key={d}
                    onClick={() => toggleDeck(d)}
                    className={`rounded-full px-3 py-1 text-sm transition-colors ${
                      decks.includes(d)
                        ? "bg-emerald-600 text-white"
                        : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                    }`}
                  >
                    <span className="font-medium">{d}</span>
                    {/* Lektionstitel aus lessons.json, falls vorhanden */}
                    {lessonTitle(d) && (
                      <span className="ml-1 opacity-80">{lessonTitle(d)}</span>
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {showDirections && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            Kartenrichtung
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(DIRECTIONS).map(([key, { label }]) => (
              <button
                key={key}
                onClick={() => toggleDir(key)}
                className={`rounded-full px-3 py-1 text-sm transition-colors ${
                  directions.includes(key)
                    ? "bg-sky-600 text-white"
                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <input
          type="checkbox"
          checked={includeProperNames}
          onChange={(e) => onIncludeProperNames(e.target.checked)}
          className="h-4 w-4 accent-emerald-600"
        />
        Eigennamen (Personennamen) einbeziehen
      </label>

      {/* Filter: nur prüfungsrelevante Vokabeln. Wird erst angezeigt, sobald
          die Liste überhaupt solche Markierungen enthält. */}
      {onOnlyHighlighted && hasExamRelevant && (
        <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={onlyHighlighted}
            onChange={(e) => onOnlyHighlighted(e.target.checked)}
            className="h-4 w-4 accent-amber-500"
          />
          Nur prüfungsrelevante (★) Vokabeln
        </label>
      )}
    </div>
  );
}
