// Hilfsfunktionen zum Vergleich spanischer Eingaben (Gegenstück zu pinyin.js
// in der Chinesisch-App). Statt Tönen geht es hier um Akzente (á, é, í, ó, ú)
// und Sonderbuchstaben (ñ, ü): Wer "cancion" statt "canción" tippt, hat das
// Wort im Kern richtig – das melden wir als eigenes Ergebnis zurück, damit
// die App einen Hinweis geben kann, statt die Antwort als falsch zu werten.

// Grundnormalisierung: Kleinschreibung, spanische Satzzeichen (¿ ¡ ? ! . ,)
// entfernen, Mehrfach-Leerzeichen zusammenfassen.
function basic(s) {
  return s
    .toLowerCase()
    .replace(/[¿¡?!.,;:"'()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Zusätzlich alle Akzente und Sonderbuchstaben abstreifen ("canción" → "cancion",
// "año" → "ano"). NFD zerlegt á in a + Akzentzeichen, das wir dann entfernen.
export function stripAccents(s) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

// Entfernt einen führenden Artikel ("el", "la", "los", "las", "un", "una").
// So gilt "casa" auch dann als richtig, wenn in der Liste "la casa" steht –
// und umgekehrt. Der Artikel ist trotzdem sinnvoll in der Liste, weil er das
// Geschlecht mitlernt.
function stripArticle(s) {
  return s.replace(/^(el|la|los|las|un|una|unos|unas)\s+/, "");
}

// In der Vokabelliste dürfen mehrere gültige Antworten stehen, getrennt
// durch "/" oder ";" (z. B. "el carro / el coche"). Jede davon zählt.
export function splitAlternatives(target) {
  return target
    .split(/\s*[/;]\s*/)
    .map((t) => t.trim())
    .filter(Boolean);
}

// Vergleicht die Nutzereingabe mit dem Zielwort.
// Ergebnis: "correct" | "accents" (Buchstaben ok, Akzente/ñ falsch) | "wrong"
export function checkSpanish(input, target) {
  const inp = basic(input);
  if (!inp) return "wrong";
  const inpNoArt = stripArticle(inp);
  let best = "wrong";
  for (const alt of splitAlternatives(target)) {
    const tgt = basic(alt);
    const tgtNoArt = stripArticle(tgt);
    // Exakt (mit oder ohne Artikel) → richtig.
    if (inp === tgt || inpNoArt === tgtNoArt) return "correct";
    // Nur Akzente/ñ weichen ab → "fast richtig".
    if (stripAccents(inpNoArt) === stripAccents(tgtNoArt)) best = "accents";
  }
  return best;
}
