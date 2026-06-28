import { createContext, useContext, useState, useCallback } from 'react';
import id from './id';
import en from './en';

const STORAGE_KEY = 'tcm_lang';
const DICT = { id, en };

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || 'id'
  );

  const setLang = useCallback((l) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLangState(l);
  }, []);

  /** t('encode.title') — dot-path lookup */
  const t = useCallback((path, fallback = path) => {
    const keys = path.split('.');
    let val = DICT[lang];
    for (const k of keys) {
      val = val?.[k];
      if (val === undefined) return fallback;
    }
    return val ?? fallback;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used inside LangProvider');
  return ctx;
}
