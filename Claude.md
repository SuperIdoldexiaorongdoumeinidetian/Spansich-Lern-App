# Spanisch-Lern-App — Projektdokumentation

Lokale, installierbare Web-App (PWA) zum Lernen spanischer Vokabeln und
Grammatik (Schwerpunkt **mexikanisches Spanisch**). Kopie der Hanzi-Lern-App
(Chinesisch) mit derselben Lernlogik; die chinesisch-spezifischen Teile
(Hanzi-Schrift, Pinyin/Töne, Radikale, Strichreihenfolge/hanzi-writer) sind
entfernt, dafür gibt es einen Grammatik-Bereich, eine Vokabelliste, eine
Akzent-Prüfung und einen Konjugationstrainer.

Der Nutzer ist kein erfahrener Entwickler — bei wichtigen Entscheidungen kurz das
**Warum** erklären. UI und Inhalte sind auf **Deutsch**.

**Stand:** `vocab.json` und `grammar.json` sind noch leer (Listen folgen);
`verbs.json` enthält eine Startliste häufiger Verben.
Die App muss mit leeren Listen sauber laufen (Hinweise statt Fehler) und
darf beim Befüllen keine Code-Änderung brauchen.

## Tech-Stack

- **React 19 + Vite 6**, reines Frontend, kein eigenes Backend
- **Tailwind CSS 4** (via `@tailwindcss/vite`)
- **vite-plugin-pwa**: installierbar (iOS-Homescreen), Service Worker cacht die
  App-Shell für Offline-Start (Workbox-Cache-Limit vorsorglich 6 MiB)
- **Supabase** für optionale geräteübergreifende Synchronisation des Lernstands
- Persistenz lokal über **localStorage**; Supabase liegt als Sync-Schicht darüber
- Aussprache über die **Web Speech API** (Stimme des Geräts, bevorzugt es-MX)

## Projektstruktur

```
src/
  data/
    vocab.json      ← Vokabeln (noch leer; Schema siehe unten)
    grammar.json    ← Grammatikthemen (noch leer; Schema siehe unten)
    verbs.json      ← Verben für den Konjugationstrainer (Schema siehe unten)
  lib/
    deck.js         ← Karten-/Deck-Aufbau aus den Daten, Session-Logik, Quiz-Optionen
    srs.js          ← Spaced-Repetition-Algorithmus (Anki-angelehnt, KEIN SM-2) — unverändert
    store.js        ← localStorage-Persistenz, Merge-Logik, Streak/Tageslog
    sync.js         ← Supabase-Cloud-Sync (useCloudSync-Hook), Tabelle "progress_spanisch"
    supabase.js     ← Supabase-Client (aus VITE_-Env-Vars)
    spanish.js      ← Vergleich spanischer Eingaben (Akzente, Artikel, Alternativen)
    speech.js       ← Aussprache über Web Speech API
    conjugation.js  ← Konjugationsregeln (Zeiten, Personen, Endungen), Trainer-Fragen
  components/
    Dashboard.jsx   ← Statistik/Übersicht        Flashcards.jsx ← SRS-Lernen
    Quiz.jsx        ← Quiz-Modi                   VocabList.jsx  ← Nachschlage-Liste
    Grammar.jsx     ← Grammatikthemen + Übungen   DeckPicker.jsx ← Deck-Auswahl
    CardDetails.jsx ← Wortart/Genus/Beispiel      SyncBar.jsx    ← Login/Sync-Status
    Conjugation.jsx ← Konjugationstrainer + Verbtabelle
    SpeakButton.jsx, ExamBadge.jsx
  App.jsx           ← Navigation (6 Tabs), dunkler Modus, Fortschritt-Reset
```

## Datenmodell

Vokabel-Einträge (`vocab.json`), Pflicht: `spanish`, `meaning`, `lesson`:

- `spanish` — spanisches Wort, bei Substantiven mit Artikel ("la casa");
  Alternativen mit `/` ("el carro / el coche") — jede zählt als richtig
- `meaning` — deutsche Bedeutung
- `wordClass` — Substantiv, Verb, Adjektiv, Adverb, Redemittel, … (frei)
- `gender` — "m"/"f" (optional, Substantive)
- `lesson` — z. B. "1-1", "1-2"; `lessonGroups()` in `deck.js` gruppiert
  `Zahl-Zahl` automatisch zu "Lektion N", andere Namen werden eigene Gruppen
- `isProperName` — Personennamen sind standardmäßig vom Lernen ausgeschlossen
- `examRelevant` — `true` = prüfungsrelevant (Badge, Filter, Dashboard-Balken;
  UI-Elemente erscheinen nur, wenn `hasExamRelevant` in `deck.js` true ist)
- `example` / `exampleMeaning` — Beispielsatz spanisch/deutsch (optional)
- `note` — freier Hinweis (optional); `mexico` — `true` = typisch mexikanisch

Grammatik-Einträge (`grammar.json`), Pflicht: `id`, `title`; optional
`lesson`, `explanation` (Absätze durch Leerzeile), `table` ({headers, rows}),
`examples` ([{es, de}]), `exercises` ([{prompt, answer, hint}]).

Verb-Einträge (`verbs.json`), Pflicht: `infinitive` (auf -ar/-er/-ir);
optional `meaning` (sonst Lookup in `vocab.json`), `lesson`, `forms`
({tense: [5 Formen oder null]}, Reihenfolge = `PERSONS` in `conjugation.js`).
Nur unregelmäßige Formen eintragen, `null` = regelmäßig.

Warum werden `LESSONS` aus den Daten abgeleitet statt fest im Code zu stehen
(anders als in der Chinesisch-App)? Weil die Listen erst später kommen und
der Nutzer sie ohne Code-Änderung einpflegen soll.

## Kernkonzepte

**Karten & Decks** (`deck.js`): Jede Vokabel wird pro Abfragerichtung zu einer
Karte. Zwei Richtungen: `sm` (Spanisch→Deutsch), `ms` (Deutsch→Spanisch).
Karten-ID = `lesson|spanish|wordClass` (darf sich nachträglich nicht ändern,
sonst geht der Lernstand der Karte verloren). SRS-Schlüssel = `card.id|direction`.

**Spaced Repetition** (`srs.js`): identisch zur Chinesisch-App. Jede Karte hat
ein `interval` (ganze Tage). Vier Bewertungen: Nochmal / Schwer / Gut / Einfach.
Gut ×2,5, Einfach ×3,5; Nochmal und Schwer setzen das Intervall auf 0 zurück
(Nochmal zählt zusätzlich als Lapse). Kurzfristige Wiedervorlagen innerhalb der
Session laufen über die Position in der Queue (Flashcards.jsx, GAP-Konstanten).

**Session-Aufbau** (`buildSession`): erst fällige Wiederholungen (älteste zuerst),
dann neue Karten bis zum Tageslimit (Standard 10/Tag).

**Akzent-Prüfung** (`spanish.js`, `checkSpanish`): Ergebnis `correct` |
`accents` | `wrong`. Normalisiert Groß-/Kleinschreibung und ¿¡?!.,; führende
Artikel (el/la/los/las/un/una) dürfen fehlen; Alternativen (`/`) zählen alle.
`accents` = nur Akzente/ñ/ü weichen ab → Hinweis statt "falsch".

**Konjugation** (`conjugation.js`): fünf Zeiten (presente, preterito,
imperfecto, futuro, condicional), fünf Personen ohne vosotros (Mexiko:
ustedes). `regularForm` bildet Stamm + Endung (`ENDINGS`), inkl. der
Rechtschreibregeln -car/-gar/-zar (yo, Pretérito) und Vokalstamm bei -er/-ir
(leyó, leíste). `conjugate(verb, tense)` nimmt Formen aus `forms`, sonst die
Regel. `checkForm` prüft wie `checkSpanish` (Akzent-Hinweis), toleriert aber
ein vorangestelltes Pronomen statt eines Artikels. Trainer-Einstellungen
(`conjTenses`, `conjFilter`, `conjLesson`) liegen in `settings`.

**Persistenz & Merge** (`store.js`): localStorage-Schlüssel
`spanisch-lern-app-v1` (eigener Schlüssel, damit Chinesisch- und Spanisch-App
im selben Browser nicht kollidieren). `mergeStates` führt lokal + Cloud
verlustfrei zusammen — `srs`: jüngeres `lastReviewed` gewinnt; `log`: Maximum
je Tagesfeld; `settings`: jüngeres `updatedAt` gewinnt.

**Cloud-Sync** (`sync.js` + `supabase.js`): Login per Magic Link. Beim Login wird
der Cloud-Stand geladen und **gemergt** (nie überschrieben), Änderungen werden
debounced (3 s) hochgeladen, offline wird gepuffert. Ohne `VITE_`-Env-Vars läuft
die App rein lokal weiter. **Eigene Tabelle `progress_spanisch`** (Konstante
`TABLE` in `sync.js`), damit ein gemeinsames Supabase-Projekt mit der
Chinesisch-App (Tabelle `progress`) nicht zu überschriebenen Ständen führt.
SQL für Tabelle + Row Level Security steht in der README.

## Die sechs Bereiche (Tabs in `App.jsx`)

| Tab | Inhalt |
|---|---|
| **Übersicht** | Gelernte Karten, heute fällig, Streak, Fortschritt pro Lektion, Reviews der letzten 30 Tage, Fortschritt zurücksetzen |
| **Lernen** | Flashcards mit SRS; Decks, Richtungen, Tageslimit, Eigennamen-Toggle, „nur prüfungsrelevant", Auto-Aussprache; Tasten 1–4 / Leertaste |
| **Quiz** | Multiple Choice (beide Richtungen, Distraktoren bevorzugt aus derselben Lektion) + „Deutsch → Spanisch schreiben" (Texteingabe mit Akzent-Prüfung). Ändert den Lernstand nicht |
| **Vokabeln** | Suche (akzent-unabhängig), Lektionsfilter, Aussprache, Lernstatus ✓, aufklappbare Details |
| **Grammatik** | Themen aus `grammar.json`: Erklärung, Tabelle, Beispiele (vorlesbar), Lückentext-Übungen |
| **Verben** | Trainer (Verb + Person + Zeit → Form tippen, Zeiten/Filter wählbar, nach Fehler ganze Reihe sichtbar) und Tabelle (alle Zeiten, unregelmäßige Formen gelb, Tippen liest vor, regelmäßige Endungen) |

## Entwicklung

```bash
npm install        # nur beim ersten Mal
npm run dev        # Dev-Server (http://localhost:5173), --host fürs Handy
npm run build      # Produktions-Build nach dist/
npm run preview    # Build lokal testen
```

Für Cloud-Sync eine `.env` mit `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY`
anlegen (ohne läuft die App lokal).

## Arbeitsweise

- Sauberer, **kommentierter** Code auf Deutsch (siehe bestehende Dateien —
  Kommentare erklären das „Warum") — der Nutzer will ihn nachvollziehen und erweitern.
- Nach größeren Änderungen kurz erklären, was gebaut wurde und wie man es testet.
- Bei Unklarheit nachfragen statt raten.
- Neue Daten: einfach an `vocab.json`/`grammar.json`/`verbs.json` anhängen;
  Lektionen und Gruppen ergeben sich automatisch.
