import { readRuntimeProjectData } from './project-data-loader.js';

/**
 * Every registered language with its aliases, file extensions, and default
 * grammars, generated from parity/language-grammar-inventory.json by
 * js/scripts/build-language-catalog.mjs. The Rust runtime embeds the same file.
 */
export const LANGUAGE_CATALOG = deepFreeze(
  readRuntimeProjectData(new URL('./data/language-catalog.lino', import.meta.url)),
);

const BY_ALIAS = new Map();
for (const language of LANGUAGE_CATALOG.languages) {
  for (const alias of [language.name, ...language.aliases]) {
    BY_ALIAS.set(alias.toLowerCase(), language);
  }
}

/** Returns the catalog entry for a language name or alias (case-insensitive). */
export function languageEntry(language) {
  return BY_ALIAS.get(String(language).toLowerCase());
}

/** Returns the canonical inventory name for a language name or alias. */
export function canonicalLanguageName(language) {
  return languageEntry(language)?.name;
}

/**
 * Returns every language registered for a file path, most specific first:
 * languages whose extension is a longer case-insensitive suffix of the path
 * come before shorter ones, and ties keep catalog order.
 */
export function languageCandidatesForPath(path) {
  const lower = String(path).toLowerCase();
  const candidates = [];
  for (const [index, language] of LANGUAGE_CATALOG.languages.entries()) {
    const length = Math.max(
      -1,
      ...language.extensions.filter((extension) => lower.endsWith(extension)).map(({ length: n }) => n),
    );
    if (length >= 0) candidates.push({ language: language.name, length, index });
  }
  return candidates
    .sort((left, right) => right.length - left.length || left.index - right.index)
    .map(({ language }) => language);
}

/** Returns the language a file path dispatches to, or `undefined`. */
export function languageForPath(path) {
  return languageCandidatesForPath(path)[0];
}

/** Returns the grammars (id, version, parser digest) that parse a language by default. */
export function grammarProvenance(language) {
  return languageEntry(language)?.grammars ?? [];
}

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
