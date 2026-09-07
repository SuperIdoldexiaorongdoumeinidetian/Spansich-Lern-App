# Spanisch-Lern-App (mexikanisches Spanisch)

Lokale, installierbare Web-App (PWA) zum Lernen spanischer Vokabeln und
Grammatik. Sie ist eine Kopie der Hanzi-Lern-App (Chinesisch), angepasst an
Spanisch: gleiche Lernlogik (Spaced Repetition, Quiz, Cloud-Sync), aber ohne
Schriftzeichen-, Pinyin- und Radikal-Funktionen; dafür mit Grammatik-Bereich
und Akzent-Prüfung.

**Aktueller Stand:** `src/data/vocab.json` enthält 944 Vokabeln in 32
Lektionen: Lektion 1 (1-1 bis 1-20) deckt den Alltag ab, Lektion 2 (2-1 bis
2-12) Prozessmanagement und Enterprise Architecture Management. Die
Lektionstitel stehen in `src/data/lessons.json`, die Verben für den
Konjugationstrainer in `src/data/verbs.json` (112 Verben, mit Lektion).
`src/data/grammar.json` enthält noch Beispieldaten (fünf Themen). Lektionen,
Decks und Grammatikthemen ergeben sich automatisch aus den Daten, im Code
muss dafür nichts geändert werden. Mit leeren Listen läuft die App ebenfalls
und zeigt an den passenden Stellen Hinweise.

## Starten

```bash
npm install   # nur beim ersten Mal
npm run dev
```

Dann die angezeigte Adresse im Browser öffnen (normalerweise
http://localhost:5173). Die App ist mobile-first — am Handy einfach die
IP-Adresse des Rechners verwenden (`npm run dev -- --host`).

## Die sechs Bereiche

| Tab | Was er macht |
|---|---|
| **Übersicht** | Gelernte Karten, heute fällige Wiederholungen, Streak, Fortschritt pro Lektion, Reviews der letzten 30 Tage |
| **Lernen** | Flashcards mit Spaced Repetition (Anki-ähnlich). Decks und Kartenrichtungen (Spanisch→Deutsch, Deutsch→Spanisch) wählbar, Eigennamen standardmäßig ausgeschlossen, neue Karten pro Tag begrenzt (Standard 10). Aussprache über die Stimme des Geräts (bevorzugt es-MX) |
| **Quiz** | Multiple Choice (beide Richtungen) und „Deutsch → Spanisch schreiben" (Texteingabe). Beeinflusst den Lernstand nicht |
| **Vokabeln** | Nachschlage-Liste mit Suche (akzent-unabhängig, Spanisch oder Deutsch), Lektionsfilter, Aussprache, Lernstatus und Beispielsätzen |
| **Grammatik** | Grammatikthemen mit Erklärung, Tabellen (z. B. Konjugation), Beispielsätzen und Lückentext-Übungen |
| **Verben** | Konjugationstrainer: Verb + Person + Zeit werden vorgegeben, die Form wird eingetippt (mit Akzent-Prüfung). Sieben Zeiten wählbar, Filter regelmäßig/unregelmäßig, `vosotros` abschaltbar (in Mexiko sagt man `ustedes`). Dazu Tabellen zum Nachschlagen, in denen unregelmäßige Formen markiert sind. Beeinflusst den Lernstand nicht |

**Akzent-Prüfung:** Bei Texteingaben gilt eine Antwort als *richtig*, wenn
sie exakt stimmt (Artikel „el/la" darf weggelassen werden, Groß-/Klein-
schreibung und ¿¡?! sind egal). Stimmen nur Akzente oder ñ/ü nicht
(„cancion" statt „canción"), gibt es einen Hinweis statt „falsch".

Der Lernstand liegt im **localStorage des Browsers** und kann optional über
Supabase geräteübergreifend synchronisiert werden (siehe unten).

## Vokabeln eintragen (`src/data/vocab.json`)

Ein JSON-Array mit einem Objekt pro Vokabel. Pflichtfelder: `spanish`,
`meaning`, `lesson`. Alles andere ist optional.

```json
[
  {
    "spanish": "la casa",
    "meaning": "das Haus",
    "wordClass": "Substantiv",
    "gender": "f",
    "lesson": "1-1",
    "isProperName": false,
    "examRelevant": false,
    "example": "Mi casa es grande.",
    "exampleMeaning": "Mein Haus ist groß.",
    "note": "In Mexiko sagt man auch …",
    "mexico": true
  }
]
```

| Feld | Bedeutung |
|---|---|
| `spanish` | das spanische Wort, bei Substantiven am besten **mit Artikel** (lernt das Genus mit). Mehrere gültige Antworten mit `/` trennen: `"el carro / el coche"` |
| `meaning` | deutsche Bedeutung |
| `wordClass` | Substantiv, Verb, Adjektiv, Adverb, Redemittel, … (frei wählbar, wird angezeigt) |
| `gender` | `"m"` oder `"f"` bei Substantiven (optional) |
| `lesson` | Lektion, z. B. `"1-1"`, `"1-2"`, … Namen der Form `Zahl-Zahl` werden in der Deck-Auswahl automatisch zu „Lektion 1", „Lektion 2" gruppiert; andere Namen (z. B. `"Mexiko"`) bilden eine eigene Gruppe |
| `isProperName` | `true` bei Personennamen → standardmäßig vom Lernen ausgeschlossen |
| `examRelevant` | `true` → Stern-Markierung, Filter „nur prüfungsrelevante" und eigene Fortschrittsanzeige (erscheinen erst, wenn mindestens eine Vokabel markiert ist) |
| `example` / `exampleMeaning` | Beispielsatz (spanisch / deutsch), wird auf der Kartenrückseite gezeigt |
| `note` | freier Hinweis (Gebrauch, Unterschied Mexiko/Spanien, …) |
| `mexico` | `true` → Markierung „🇲🇽 mexikanisch" (typisch mexikanischer Ausdruck) |

Die Karten-ID ist `lesson|spanish|wordClass`. Diese drei Felder sollten sich
bei bestehenden Einträgen nicht mehr ändern, sonst geht der Lernfortschritt
dieser Karte verloren. Dieselbe Vokabel darf mit unterschiedlicher Wortart
mehrfach vorkommen.

## Lektionstitel eintragen (`src/data/lessons.json`)

Ein JSON-Array mit Nummer und Titel je Lektion. Die Titel erscheinen in der
Deck-Auswahl, im Dashboard und in den Lektionsfiltern neben der Nummer.
Lektionen ohne Eintrag werden nur mit ihrer Nummer angezeigt.

```json
[
  { "lesson": "1-1", "title": "Begrüßung & Höflichkeit" },
  { "lesson": "2-1", "title": "Prozessmanagement – Grundbegriffe" }
]
```

## Grammatik eintragen (`src/data/grammar.json`)

Ein JSON-Array mit einem Objekt pro Thema. Pflicht: `id`, `title`. Rest optional.

```json
[
  {
    "id": "ser-vs-estar",
    "title": "ser vs. estar",
    "lesson": "1-2",
    "explanation": "ser = dauerhafte Eigenschaft, Herkunft, Beruf.\n\nestar = Zustand, Ort, Befinden.",
    "table": {
      "headers": ["", "ser", "estar"],
      "rows": [["yo", "soy", "estoy"], ["tú", "eres", "estás"]]
    },
    "examples": [
      { "es": "Soy de México.", "de": "Ich komme aus Mexiko." }
    ],
    "exercises": [
      { "prompt": "Yo ___ estudiante. (ser)", "answer": "soy", "hint": "Beruf/Rolle → ser" }
    ]
  }
]
```

Absätze in `explanation` durch eine Leerzeile (`\n\n`) trennen. Bei
`exercises` wird die Antwort mit derselben Akzent-Prüfung wie im Quiz
verglichen; `hint` erscheint bei falscher Antwort neben der Lösung.

## Verben eintragen (`src/data/verbs.json`)

Ein JSON-Array mit einem Objekt pro Verb. Pflicht: `infinitive`, `meaning`.
Die Formen werden **berechnet** – regelmäßige Verben brauchen sonst nichts.
Nur Unregelmäßigkeiten werden angegeben:

```json
[
  { "infinitive": "hablar", "meaning": "sprechen" },
  { "infinitive": "pensar", "meaning": "denken", "stemChange": "e>ie" },
  { "infinitive": "levantarse", "meaning": "aufstehen" },
  {
    "infinitive": "tener",
    "meaning": "haben",
    "stemChange": "e>ie",
    "yo": "tengo",
    "preteriteStem": "tuv",
    "futureStem": "tendr"
  },
  {
    "infinitive": "ser",
    "meaning": "sein",
    "forms": {
      "presente": ["soy", "eres", "es", "somos", "sois", "son"],
      "preterito": { "el": "fue" }
    }
  }
]
```

| Feld | Bedeutung |
|---|---|
| `infinitive` | Infinitiv; reflexive Verben mit `se` (`levantarse`) – das Pronomen (me, te, se, …) setzt die App selbst davor |
| `meaning` | deutsche Bedeutung |
| `lesson` | optional; sobald gesetzt, erscheint im Trainer ein Lektionsfilter |
| `stemChange` | Stammwechsel `e>ie`, `o>ue`, `e>i` oder `u>ue` (pensar → pienso, dormir → duermo). Die -ir-Sonderformen (durmió, durmiendo, durmamos) werden mitberechnet |
| `yo` | unregelmäßige yo-Form im Presente (`tengo`, `hago`); daraus wird auch der Subjuntivo gebildet (tenga, haga) |
| `preteriteStem` | starker Pretérito-Stamm (`tuv` → tuve, tuviste, tuvo, …; nach `j` automatisch dijeron) |
| `futureStem` | Stamm für Futuro und Condicional (`tendr` → tendré, tendría) |
| `participle` / `gerund` | unregelmäßiges Partizip/Gerundium (`hecho`, `yendo`) |
| `forms` | feste Formen je Zeit, die alles überschreiben: entweder ein Array mit 6 Formen (yo, tú, él, nosotros, vosotros, ellos) oder ein Objekt mit einzelnen Personen (`yo`, `tu`, `el`, `nosotros`, `vosotros`, `ellos`). Zeiten: `presente`, `preterito`, `imperfecto`, `perfecto`, `futuro`, `condicional`, `subjuntivo` |
| `note` / `mexico` | freier Hinweis / `true` = typisch mexikanisch (nur Anzeige) |

Schreibregeln (buscar → busqué, conocer → conozco, seguir → sigo,
construir → construyo, leer → leyó) berechnet die App automatisch. Ob ein
Verb als „unregelmäßig" gilt, ergibt sich aus den berechneten Formen – in
der Tabelle sind alle Abweichungen von der regelmäßigen Bildung markiert.
Die mitgelieferte Liste enthält 112 Verben (Alltag und Prozesskontext,
jeweils mit Lektion) und kann beliebig ergänzt werden.

## Cloud-Sync (optional, Supabase)

Eine `.env` mit `VITE_SUPABASE_URL` und `VITE_SUPABASE_ANON_KEY` anlegen
(Vorlage: `.env.example`). Ohne diese Datei läuft die App rein lokal.

**Wichtig, falls dasselbe Supabase-Projekt wie für die Chinesisch-App
genutzt wird:** Diese App schreibt in eine **eigene Tabelle**
`progress_spanisch` (die Chinesisch-App nutzt `progress`). Sonst würden sich
beide Apps gegenseitig den Lernstand überschreiben. Tabelle anlegen (Supabase
→ SQL Editor):

```sql
create table public.progress_spanisch (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.progress_spanisch enable row level security;

create policy "Eigene Zeile lesen" on public.progress_spanisch
  for select using (auth.uid() = user_id);
create policy "Eigene Zeile anlegen" on public.progress_spanisch
  for insert with check (auth.uid() = user_id);
create policy "Eigene Zeile ändern" on public.progress_spanisch
  for update using (auth.uid() = user_id);
```

Login per Magic Link (E-Mail). Beim Login wird der Cloud-Stand mit dem
lokalen Stand zusammengeführt (nie überschrieben).

## Projektstruktur

```
src/
  data/vocab.json        ← Vokabelliste (Alltag + Prozessmanagement/EAM)
  data/lessons.json      ← Lektionstitel
  data/grammar.json      ← Grammatikthemen (Beispieldaten)
  data/verbs.json        ← Verbliste für den Konjugationstrainer
  lib/srs.js             ← Spaced-Repetition-Algorithmus (identisch zur Chinesisch-App)
  lib/store.js           ← localStorage-Persistenz, Streak, Tageslog, Merge
  lib/sync.js            ← Supabase-Cloud-Sync
  lib/supabase.js        ← Supabase-Client
  lib/spanish.js         ← Vergleich spanischer Eingaben (Akzente, Artikel, Alternativen)
  lib/speech.js          ← Aussprache (Web Speech API, bevorzugt es-MX)
  lib/deck.js            ← Karten/Decks aus den Daten, Session-Logik, Quiz-Optionen
  lib/conjugation.js     ← Konjugations-Engine (Formen aus Infinitiv + Ausnahmen berechnen)
  lib/verbs.js           ← aufbereitete Verbliste aus verbs.json
  components/            ← die sechs Ansichten + Deck-Auswahl + Kleinteile
  App.jsx                ← Navigation, dunkler Modus, Fortschritt-Reset
```

## Mögliche Erweiterungen (bei Bedarf einzeln anfragen)

- Imperativ und weitere Zeiten im Konjugationstrainer (z. B. Imperfecto de subjuntivo)
- Multiple-Choice-Modus im Konjugationstrainer
- Export/Import des Lernstands als JSON-Datei
- Hörverstehen: Wort nur vorlesen lassen, dann schreiben
