// Repository packaging rules share one complete entrypoint list.
// Existing full-gate commands retain their original names and behavior.
export const TRANSLATOR_ENTRYPOINTS=Object.freeze([
 'scripts/translate-router.mjs',
 'scripts/translate-router-flat-native-owned-field-meta.mjs',
 'scripts/export-router-translator.mjs',
 'scripts/regenerate-js-first.mjs',
 'scripts/regenerate-native-typescript.mjs',
 'scripts/sync-router.mjs',
 'scripts/sync-router-units.mjs',
 'scripts/sync-router-owned-project-units.mjs',
]);
