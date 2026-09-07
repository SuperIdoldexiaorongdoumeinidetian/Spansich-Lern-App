// Konjugations-Engine: bildet aus einem Infinitiv die Verbformen für alle
// Personen und Zeiten.
//
// Grundidee: Die allermeisten spanischen Verben sind regelmäßig – ihre Formen
// lassen sich aus Stamm + Endung berechnen. Deshalb steht in verbs.json pro
// Verb nur der Infinitiv, die Bedeutung und (falls nötig) ein paar Angaben zu
// Unregelmäßigkeiten. Alles andere rechnet diese Datei aus. So muss man für
// ein neues Verb keine 42 Formen abtippen, sondern nur die Ausnahmen.
//
// Datenformat je Verb (nur `infinitive` und `meaning` sind Pflicht):
// {
//   "infinitive": "tener",       // reflexive Verben mit "se": "levantarse"
//   "meaning": "haben",
//   "lesson": "1-3",             // optional, für den Lektionsfilter
//   "stemChange": "e>ie",        // optional: e>ie, o>ue, e>i, u>ue (Stammwechsel)
//   "yo": "tengo",               // optional: unregelmäßige yo-Form (Presente);
//                                //   daraus wird auch der Subjuntivo gebildet
//   "preteriteStem": "tuv",      // optional: starker Pretérito-Stamm (tuve, tuviste, …)
//   "futureStem": "tendr",       // optional: Stamm für Futuro/Condicional
//   "participle": "hecho",       // optional: unregelmäßiges Partizip
//   "gerund": "yendo",           // optional: unregelmäßiges Gerundium
//   "forms": {                   // optional: feste Formen, die alles überschreiben –
//     "presente": ["soy", "eres", "es", "somos", "sois", "son"],   // 6 Formen …
//     "preterito": { "el": "hizo" }                                 // … oder einzelne
//   },                           //   (Personen-Schlüssel: yo, tu, el, nosotros, vosotros, ellos)
//   "note": "…", "mexico": true  // optional, nur Anzeige
// }
// Bei reflexiven Verben werden alle Angaben OHNE Pronomen gemacht – das
// Pronomen (me, te, se, …) setzt die Engine selbst davor.
import { stripAccents } from "./spanish";

// Die sechs Personen in fester Reihenfolge. Der Index (0–5) ist überall der
// Schlüssel. "vosotros" wird in Mexiko nicht benutzt (dort sagt man "ustedes"),
// deshalb ist es per Einstellung abschaltbar (spainOnly).
export const PERSONS = [
  { key: "yo", label: "yo" },
  { key: "tu", label: "tú" },
  { key: "el", label: "él / ella / usted" },
  { key: "nosotros", label: "nosotros/-as" },
  { key: "vosotros", label: "vosotros/-as", spainOnly: true },
  { key: "ellos", label: "ellos / ellas / ustedes" },
];
const IDX = [0, 1, 2, 3, 4, 5];
// "Stiefel"-Personen: Bei Verben mit Stammwechsel (pensar → pienso) ändert
// sich der Stamm in yo, tú, él und ellos – nicht in nosotros/vosotros.
const BOOT = new Set([0, 1, 2, 5]);

// Welche Personen-Indizes werden abgefragt/angezeigt?
export function personIndices(includeVosotros) {
  return IDX.filter((i) => includeVosotros || !PERSONS[i].spainOnly);
}

// Die unterstützten Zeiten. Reihenfolge = Reihenfolge in der Auswahl.
export const TENSES = {
  presente: { label: "Presente", de: "Präsens", example: "hablo, hablas, …" },
  preterito: {
    label: "Pretérito indefinido",
    de: "einfache Vergangenheit",
    example: "hablé, hablaste, …",
  },
  imperfecto: {
    label: "Pretérito imperfecto",
    de: "Imperfekt",
    example: "hablaba, hablabas, …",
  },
  perfecto: {
    label: "Pretérito perfecto",
    de: "Perfekt",
    example: "he hablado, has hablado, …",
  },
  futuro: { label: "Futuro", de: "Futur", example: "hablaré, hablarás, …" },
  condicional: {
    label: "Condicional",
    de: "Konditional",
    example: "hablaría, hablarías, …",
  },
  subjuntivo: {
    label: "Presente de subjuntivo",
    de: "Subjuntivo Präsens",
    example: "hable, hables, …",
  },
};
export const TENSE_KEYS = Object.keys(TENSES);

// Regelmäßige Endungen je Zeit und Verbgruppe (-ar / -er / -ir).
const ENDINGS = {
  presente: {
    ar: ["o", "as", "a", "amos", "áis", "an"],
    er: ["o", "es", "e", "emos", "éis", "en"],
    ir: ["o", "es", "e", "imos", "ís", "en"],
  },
  preterito: {
    ar: ["é", "aste", "ó", "amos", "asteis", "aron"],
    er: ["í", "iste", "ió", "imos", "isteis", "ieron"],
    ir: ["í", "iste", "ió", "imos", "isteis", "ieron"],
  },
  imperfecto: {
    ar: ["aba", "abas", "aba", "ábamos", "abais", "aban"],
    er: ["ía", "ías", "ía", "íamos", "íais", "ían"],
    ir: ["ía", "ías", "ía", "íamos", "íais", "ían"],
  },
  subjuntivo: {
    ar: ["e", "es", "e", "emos", "éis", "en"],
    er: ["a", "as", "a", "amos", "áis", "an"],
    ir: ["a", "as", "a", "amos", "áis", "an"],
  },
  // Futuro und Condicional hängen an den ganzen Infinitiv an.
  futuro: ["é", "ás", "á", "emos", "éis", "án"],
  condicional: ["ía", "ías", "ía", "íamos", "íais", "ían"],
  // "Starke" Pretérito-Formen (tuve, pude, hice, …): eigener Stamm, ohne Akzent.
  strongPreterite: ["e", "iste", "o", "imos", "isteis", "ieron"],
};
// Hilfsverb für das Perfekt: he hablado, has hablado, …
const HABER = ["he", "has", "ha", "hemos", "habéis", "han"];
// Reflexivpronomen: me levanto, te levantas, …
const REFLEXIVE = ["me", "te", "se", "nos", "os", "se"];

// Der "schwache" Stammwechsel bei -ir-Verben: sentir hat e>ie (siento), aber
// in der 3. Person Pretérito (sintió), im Gerundium (sintiendo) und im
// Subjuntivo nosotros/vosotros (sintamos) nur e>i. Analog dormir: o>ue → o>u.
const WEAK = { "e>ie": "e>i", "e>i": "e>i", "o>ue": "o>u" };

// Infinitiv zerlegen: "levantarse" → base "levantar", reflexive, group "ar",
// stem "levant". "oír" → group "ir" (Akzent ignorieren), stem "o".
function parse(infinitive) {
  const reflexive = /(ar|er|ir|ír)se$/.test(infinitive);
  const base = reflexive ? infinitive.slice(0, -2) : infinitive;
  const group = stripAccents(base.slice(-2));
  return { base, reflexive, group, stem: base.slice(0, -2) };
}

// Stammwechsel anwenden: den LETZTEN passenden Vokal im Stamm ersetzen
// ("entend" + e>ie → "entiend", "dorm" + o>ue → "duerm").
function applyStemChange(stem, change) {
  if (!change) return stem;
  const [from, to] = change.split(">");
  const i = stem.lastIndexOf(from);
  return i < 0 ? stem : stem.slice(0, i) + to + stem.slice(i + from.length);
}

// Rechtschreib-Anpassungen VOR a/o (yo-Form Presente, Subjuntivo bei -er/-ir):
//  - Vokal + cer/cir → zc   (conocer → conozco, conducir → conduzco)
//  - Konsonant + cer/cir → z (vencer → venzo)
//  - ger/gir → j            (coger → cojo, elegir → elijo)
//  - guir → g               (seguir → sigo)
//  - uir → uy               (construir → construyo)
// Das sind keine echten Unregelmäßigkeiten, sondern Schreibregeln, damit die
// Aussprache gleich bleibt – deshalb rechnet die Engine sie automatisch.
function consonantShift(stem, base) {
  if (/[aeiou]c[ei]r$/.test(base)) return stem.slice(0, -1) + "zc";
  if (/c[ei]r$/.test(base)) return stem.slice(0, -1) + "z";
  if (/g[ei]r$/.test(base)) return stem.slice(0, -1) + "j";
  if (/guir$/.test(base)) return stem.slice(0, -1);
  if (/[^gq]uir$/.test(base)) return stem + "y";
  return stem;
}

// Rechtschreib-Anpassungen VOR e bei -ar-Verben (Pretérito yo, Subjuntivo):
// buscar → busqué, llegar → llegué, empezar → empecé.
function spellBeforeE(stem) {
  if (/c$/.test(stem)) return stem.slice(0, -1) + "qu";
  if (/g$/.test(stem)) return stem.slice(0, -1) + "gu";
  if (/z$/.test(stem)) return stem.slice(0, -1) + "c";
  return stem;
}

// Feste Formen aus verb.forms holen – als Array (6 Formen) oder Objekt
// mit Personen-Schlüsseln (nur einzelne Formen).
function override(ov, i) {
  if (!ov) return undefined;
  if (Array.isArray(ov)) return ov[i] || undefined;
  return ov[PERSONS[i].key];
}

// Partizip: hablado / comido / vivido; leído (Vokal-Stamm) oder unregelmäßig.
export function participle(verb, naive = false) {
  if (!naive && verb.participle) return verb.participle;
  const { group, stem } = parse(verb.infinitive);
  if (group === "ar") return stem + "ado";
  return stem + (!naive && /[aeo]$/.test(stem) ? "ído" : "ido");
}

// Gerundium: hablando / comiendo; leyendo (Vokal-Stamm), durmiendo
// (schwacher Stammwechsel) oder unregelmäßig.
export function gerund(verb, naive = false) {
  if (!naive && verb.gerund) return verb.gerund;
  const { base, group, stem } = parse(verb.infinitive);
  if (group === "ar") return stem + "ando";
  const weak = naive ? stem : applyStemChange(stem, WEAK[verb.stemChange]);
  const y = !naive && (/[aeo]$/.test(stem) || /[^gq]uir$/.test(base));
  return weak + (y ? "yendo" : "iendo");
}

// Kern: die sechs Formen einer Zeit berechnen.
// naive = true ignoriert ALLE Unregelmäßigkeiten und Schreibregeln und bildet
// stur Stamm + Endung. Das braucht die Tabellenansicht, um abweichende Formen
// zu markieren, und der Filter "nur unregelmäßige Verben".
function buildForms(verb, tense, naive) {
  const { base, reflexive, group, stem } = parse(verb.infinitive);
  const v = naive ? {} : verb;
  const isIr = group === "ir";
  const uir = !naive && /[^gq]uir$/.test(base); // construir, huir, …
  const vowelStem = !naive && /[aeo]$/.test(stem); // leer, creer, oír, traer, …
  const boot = applyStemChange(stem, v.stemChange); // pienso, duermo
  const weak = isIr ? applyStemChange(stem, WEAK[v.stemChange]) : stem; // sintió
  // Subjuntivo-Stamm aus der yo-Form: tengo → teng-a. Formen auf "-oy"
  // (soy, doy, voy, estoy) taugen dafür nicht – diese Verben haben feste Formen.
  const yoStem = v.yo && !/oy$/.test(v.yo) ? v.yo.slice(0, -1) : null;

  let forms;
  switch (tense) {
    case "presente": {
      const e = ENDINGS.presente[group];
      forms = IDX.map((i) => {
        if (i === 0) return v.yo ?? (naive ? stem : consonantShift(boot, base)) + "o";
        const s = BOOT.has(i) ? boot : stem;
        return (uir && BOOT.has(i) ? s + "y" : s) + e[i];
      });
      break;
    }
    case "preterito": {
      if (v.preteriteStem) {
        // Starker Stamm: tuve, tuviste, tuvo … Nach j fällt das i weg: dijeron.
        forms = ENDINGS.strongPreterite.map(
          (e, i) => v.preteriteStem + (i === 5 && /j$/.test(v.preteriteStem) ? "eron" : e)
        );
      } else if (group === "ar") {
        forms = ENDINGS.preterito.ar.map(
          (e, i) => (i === 0 && !naive ? spellBeforeE(stem) : stem) + e
        );
      } else {
        // Vokal-Stamm: i → y in der 3. Person (leyó, leyeron) und Akzent auf
        // dem i der übrigen Formen (leíste, leímos). -uir nur y (construyó).
        const y = vowelStem || uir;
        forms = [
          stem + "í",
          stem + (vowelStem ? "íste" : "iste"),
          weak + (y ? "yó" : "ió"),
          stem + (vowelStem ? "ímos" : "imos"),
          stem + (vowelStem ? "ísteis" : "isteis"),
          weak + (y ? "yeron" : "ieron"),
        ];
      }
      break;
    }
    case "imperfecto":
      forms = ENDINGS.imperfecto[group].map((e) => stem + e);
      break;
    case "futuro":
    case "condicional": {
      // Ganzer Infinitiv (ohne Akzent: oír → oiré) oder eigener Stamm (tendr-).
      const f = v.futureStem ?? stripAccents(base);
      forms = ENDINGS[tense].map((e) => f + e);
      break;
    }
    case "perfecto": {
      const p = participle(verb, naive);
      forms = HABER.map((h) => `${h} ${p}`);
      break;
    }
    case "subjuntivo": {
      const e = ENDINGS.subjuntivo[group];
      if (group === "ar") {
        forms = IDX.map((i) => {
          const s = BOOT.has(i) ? boot : stem;
          return (naive ? s : spellBeforeE(s)) + e[i];
        });
      } else {
        // -er/-ir: aus der yo-Form (tengo → tenga, conozco → conozca). Ohne
        // eigene yo-Form gilt in nosotros/vosotros der Grundstamm bzw. bei
        // -ir-Verben der schwache Stammwechsel (durmamos, sintamos).
        forms = IDX.map((i) => {
          if (yoStem) return yoStem + e[i];
          const s = BOOT.has(i) ? boot : weak;
          return (naive ? s : consonantShift(s, base)) + e[i];
        });
      }
      break;
    }
    default:
      throw new Error(`Unbekannte Zeit: ${tense}`);
  }

  // Feste Formen aus den Daten haben immer das letzte Wort.
  if (!naive) forms = forms.map((f, i) => override(verb.forms?.[tense], i) ?? f);
  // Reflexivpronomen davorsetzen: me levanto, te levantas, …
  if (reflexive) forms = forms.map((f, i) => `${REFLEXIVE[i]} ${f}`);
  return forms;
}

// Öffentliche Funktionen -------------------------------------------------

// Die sechs Formen eines Verbs in einer Zeit (Index = Person, siehe PERSONS).
export function conjugate(verb, tense) {
  return buildForms(verb, tense, false);
}

// Welche der sechs Formen weichen von der stur regelmäßigen Bildung ab?
// (für die farbliche Markierung in der Tabelle)
export function irregularMask(verb, tense) {
  const real = buildForms(verb, tense, false);
  const naive = buildForms(verb, tense, true);
  return real.map((f, i) => f !== naive[i]);
}

// Gilt das Verb (in irgendeiner Zeit) als unregelmäßig? Dazu zählen auch
// Stammwechsel und Schreibänderungen – alles, worauf man beim Lernen achten
// muss, wird so als "unregelmäßig" geführt.
export function isIrregular(verb) {
  return (
    TENSE_KEYS.some((t) => irregularMask(verb, t).some(Boolean)) ||
    participle(verb) !== participle(verb, true) ||
    gerund(verb) !== gerund(verb, true)
  );
}

// Kurze deutsche Beschreibung der Besonderheiten (für den Tabellenkopf).
export function describeIrregularities(verb) {
  const out = [];
  if (verb.stemChange) out.push(`Stammwechsel ${verb.stemChange.replace(">", " → ")}`);
  if (verb.yo) out.push(`yo-Form: ${verb.yo}`);
  if (verb.preteriteStem) out.push(`Pretérito-Stamm: ${verb.preteriteStem}-`);
  if (verb.futureStem) out.push(`Futuro-Stamm: ${verb.futureStem}-`);
  if (verb.participle) out.push(`Partizip: ${verb.participle}`);
  if (verb.gerund) out.push(`Gerundium: ${verb.gerund}`);
  const fixed = Object.keys(verb.forms ?? {}).map((t) => TENSES[t]?.label ?? t);
  if (fixed.length) out.push(`eigene Formen: ${fixed.join(", ")}`);
  return out;
}

// Verbliste aus verbs.json aufbereiten: stabile ID, Flag "unregelmäßig",
// Infinitiv in Datenreihenfolge belassen. Ungültige Einträge (ohne
// Infinitiv auf -ar/-er/-ir) werden übersprungen statt die App zu brechen.
export function prepareVerbs(data) {
  return data
    .filter((v) => v && typeof v.infinitive === "string" && /(ar|er|ir|ír)(se)?$/.test(v.infinitive))
    .map((v) => ({ ...v, id: v.infinitive, irregular: isIrregular(v) }));
}
