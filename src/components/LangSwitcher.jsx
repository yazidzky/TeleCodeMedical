import { useLang } from '../i18n/LangContext';

export default function LangSwitcher() {
  const { lang, setLang } = useLang();

  return (
    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 gap-0.5">
      {['id', 'en'].map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary
            ${lang === l
              ? 'bg-white text-primary shadow-sm'
              : 'text-text/50 hover:text-text'}`}
        >
          {l === 'id' ? '🇮🇩 ID' : '🇺🇸 EN'}
        </button>
      ))}
    </div>
  );
}
