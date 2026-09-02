// Kleiner Hinweis, dass eine Vokabel in der Liste als prüfungsrelevant
// markiert ist (Feld "examRelevant": true). Bei allen anderen Karten wird
// nichts gerendert.
export default function ExamBadge({ card, className = "" }) {
  if (!card?.examRelevant) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-400/20 dark:text-amber-300 ${className}`}
      title="Prüfungsrelevant"
    >
      ★ prüfungsrelevant
    </span>
  );
}
