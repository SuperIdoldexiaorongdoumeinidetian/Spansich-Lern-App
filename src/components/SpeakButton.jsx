// Lautsprecher-Button, der ein spanisches Wort vorliest.
// Ist keine spanische Stimme installiert, wird der Button ausgegraut und
// (optional) ein dezenter Hinweis angezeigt. Die App funktioniert ohne Audio
// uneingeschränkt weiter.
export default function SpeakButton({ text, speech, showHint = false, small = false }) {
  const { speak, available, loading } = speech;

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        // Klick-Bubbling stoppen, damit das Klicken auf den Button nicht
        // versehentlich die Karte auf-/zudeckt.
        onClick={(e) => {
          e.stopPropagation();
          speak(text);
        }}
        disabled={!available}
        aria-label="Aussprache anhören"
        title={available ? "Aussprache anhören" : "Keine spanische Stimme installiert"}
        className={`inline-flex items-center justify-center rounded-full transition-colors ${
          small ? "h-7 w-7 text-sm" : "h-9 w-9 text-lg"
        } ${
          available
            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/70"
            : "cursor-not-allowed bg-zinc-100 text-zinc-300 dark:bg-zinc-800 dark:text-zinc-600"
        }`}
      >
        🔊
      </button>
      {showHint && !available && !loading && (
        <span className="text-xs text-zinc-400">
          Keine spanische Stimme installiert — unter iOS-Einstellungen &gt;
          Bedienungshilfen &gt; Gesprochene Inhalte hinzufügbar.
        </span>
      )}
    </span>
  );
}
