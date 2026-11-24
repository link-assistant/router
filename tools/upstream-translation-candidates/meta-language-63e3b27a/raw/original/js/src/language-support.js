/** Schema revision for four-language parser, emitter, and translation contracts. */
export const LANGUAGE_REPRESENTATION_SCHEMA_VERSION = 2;

export const RepresentationLevel = Object.freeze({
  Preserved: 'preserved',
  ConcreteSyntax: 'concrete-syntax',
  Parsed: 'parsed',
  Resolved: 'resolved',
  Elaborated: 'elaborated',
  Opaque: 'opaque',
  NotApplicable: 'not-applicable',
  Unavailable: 'unavailable',
});

export const TranslationSupport = Object.freeze({
  PortableEncoding: 'portable-encoding',
  SemanticSubset: 'semantic-subset',
  SemanticTranslation: 'semantic-translation',
});

const SUPPORT = Object.freeze([
  language({
    name: 'JavaScript',
    aliases: ['javascript', 'js', 'ecmascript'],
    version: 'ECMAScript 2026',
    edition: 'ECMA-262, 17th edition',
    extensions: ['.js', '.mjs', '.cjs'],
    proofSyntax: RepresentationLevel.NotApplicable,
  }),
  language({
    name: 'Rust',
    aliases: ['rust', 'rs'],
    version: 'Rust 1.99.0',
    edition: '2024',
    extensions: ['.rs'],
    proofSyntax: RepresentationLevel.NotApplicable,
  }),
  language({
    name: 'Lean',
    aliases: ['lean', 'lean4'],
    version: 'Lean 4.34.1',
    edition: 'Lean 4',
    extensions: ['.lean'],
    proofSyntax: RepresentationLevel.Parsed,
  }),
  language({
    name: 'Rocq',
    aliases: ['rocq', 'coq'],
    version: 'Rocq 9.3',
    edition: 'Vernacular',
    extensions: ['.v'],
    proofSyntax: RepresentationLevel.Parsed,
  }),
]);

const BY_ALIAS = new Map(
  SUPPORT.flatMap((entry) => entry.aliases.map((alias) => [alias.toLowerCase(), entry])),
);

/** Returns the immutable capability/fidelity declaration for a built-in frontend. */
export function languageSupport(languageName) {
  return BY_ALIAS.get(String(languageName).toLowerCase());
}

/** Returns the four built-in capability declarations in canonical order. */
export function fourLanguageSupport() {
  return SUPPORT;
}

/**
 * Returns all 12 directed translation hooks.
 *
 * A hook describes the default transport behavior for arbitrary source input.
 * Individual source forms can have an executable implementation.
 */
export function translationContracts() {
  return SUPPORT.flatMap((source) =>
    SUPPORT.filter((target) => target !== source).map((target) => translation(source, target)),
  );
}

export function translationContract(sourceLanguage, targetLanguage) {
  const source = languageSupport(sourceLanguage);
  const target = languageSupport(targetLanguage);
  if (!source || !target || source === target) {
    return undefined;
  }
  return translation(source, target);
}

function language({ name, aliases, version, edition, extensions, proofSyntax }) {
  return Object.freeze({
    schemaVersion: LANGUAGE_REPRESENTATION_SCHEMA_VERSION,
    name,
    aliases: Object.freeze([...aliases]),
    version,
    edition,
    extensions: Object.freeze([...extensions]),
    sourceBytes: RepresentationLevel.Preserved,
    concreteSyntax: RepresentationLevel.ConcreteSyntax,
    bindingResolution: RepresentationLevel.Parsed,
    typeElaboration: RepresentationLevel.Unavailable,
    dynamicExtensions: RepresentationLevel.Parsed,
    proofSyntax,
    emitter: 'ordered source-token emitter',
  });
}

function translation(source, target) {
  return Object.freeze({
    schemaVersion: LANGUAGE_REPRESENTATION_SCHEMA_VERSION,
    source: source.name,
    target: target.name,
    support: TranslationSupport.PortableEncoding,
    observation: 'exact source bytes after decoding; target behavior is not preserved',
    requiredRuntime: runtimeFor(target.name),
    encoding: 'meta-language portable source envelope v1 (UTF-8 hexadecimal payload)',
    assumptions: Object.freeze([
      'the source-language runtime is required to execute decoded source',
    ]),
    obligation: 'semantic translation is not implemented for arbitrary source programs',
  });
}

function runtimeFor(languageName) {
  if (languageName === 'Lean') {
    return 'Lean 4.34.1 kernel and project environment';
  }
  if (languageName === 'Rocq') {
    return 'Rocq 9.3 kernel and project environment';
  }
  if (languageName === 'Rust') {
    return 'Rust 1.99.0, edition 2024';
  }
  return 'ECMAScript 2026 host';
}
