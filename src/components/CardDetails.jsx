// Zusatzinfos zu einer Vokabel (Wortart, Genus, Beispielsatz, Hinweis,
// Mexiko-Markierung). Wird auf der Rückseite der Flashcards, nach einer
// Quiz-Antwort und in der Vokabelliste angezeigt – deshalb eine eigene,
// kleine Komponente statt dreimal derselbe Code.
import SpeakButton from "./SpeakButton";

// Genus-Kürzel aus der Liste ("m"/"f") lesbar machen.
const GENDER = { m: "maskulin", f: "feminin" };

export default function CardDetails({ card, speech, compact = false }) {
  const meta = [
    card.wordClass,
    card.gender ? GENDER[card.gender] ?? card.gender : null,
    card.mexico ? "🇲🇽 mexikanisch" : null,
  ].filter(Boolean);

  return (
    <div className={`space-y-1 ${compact ? "text-xs" : "text-sm"} text-zinc-500 dark:text-zinc-400`}>
      {meta.length > 0 && <p className="text-xs text-zinc-400">{meta.join(" · ")}</p>}
      {card.example && (
        <p className="flex items-center justify-center gap-2">
          <span>
            <span className="es italic text-zinc-700 dark:text-zinc-200">
              {card.example}
            </span>
            {card.exampleMeaning && (
              <span className="block text-xs">{card.exampleMeaning}</span>
            )}
          </span>
          {speech && <SpeakButton text={card.example} speech={speech} small />}
        </p>
      )}
      {card.note && <p className="text-xs">💡 {card.note}</p>}
    </div>
  );
}
