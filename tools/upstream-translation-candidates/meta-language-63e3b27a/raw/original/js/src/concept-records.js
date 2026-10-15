import { readRuntimeProjectData } from './project-data-loader.js';
import { readProjectFileBytes } from './project-data-files.js';
import { readStructuredDataLino } from './structured-data-links.js';
import { createHash } from 'node:crypto';
import { createLazyFrozenArray } from './lazy-shipped-data.js';

const recordsFile = new URL('./data/concept-records.lino', import.meta.url);
const recordsMetadata = readRuntimeProjectData(new URL('./data/concept-records-metadata.lino', import.meta.url));
if (recordsMetadata.schemaVersion !== 1 || recordsMetadata.source !== 'concept-records.lino'
  || !Number.isSafeInteger(recordsMetadata.conceptCount) || recordsMetadata.conceptCount < 1
  || !/^[0-9a-f]{64}$/u.test(recordsMetadata.sourceSha256)) {
  throw new TypeError('concept record metadata is invalid');
}

function loadConceptRecords() {
  const bytes = readProjectFileBytes(recordsFile);
  if (createHash('sha256').update(bytes).digest('hex') !== recordsMetadata.sourceSha256) {
    throw new TypeError('concept records differ from their generated source digest');
  }
  return readStructuredDataLino(bytes.toString('utf8')).concepts;
}

/**
 * The record of every canonical concept and operation meta-language defines:
 * its stable identity, the readable English phrase the identity spells, its
 * role (a concept is a noun phrase, an operation a verb phrase), definition,
 * constraints, the names other sources give it, and the former names that
 * still decode to it. Generated from parity/naming/canonical-concepts.json by
 * js/scripts/build-concept-records.mjs; the Rust runtime embeds the same file.
 */
export const CONCEPT_RECORDS = createLazyFrozenArray(recordsMetadata.conceptCount, loadConceptRecords);

/** The vocabulary of the alias links that keep a concept's former names. */
export const FORMER_CONCEPT_ID_VOCABULARY = 'meta-language';

/**
 * Former concept identities and the identities that replaced them, as in
 * Rust's `FORMER_CONCEPT_IDS`. Every pair is also a former name of its
 * concept record.
 */
export const FORMER_CONCEPT_IDS = Object.freeze([
  ['grammar.repetition', 'grammar.counted-repetition'],
  ['grammar.zero-or-more', 'grammar.zero-or-more-repetition'],
  ['grammar.one-or-more', 'grammar.one-or-more-repetition'],
  ['grammar.optional', 'grammar.optional-expression'],
  ['grammar.non-terminal', 'grammar.nonterminal'],
  ['grammar.char-class', 'grammar.character-class'],
  ['grammar.char-range', 'grammar.character-range'],
  ['grammar.any-char', 'grammar.any-character'],
  ['grammar.empty', 'grammar.empty-expression'],
  ['grammar.boolean', 'grammar.boolean-value'],
  ['sequence', 'sequential-composition'],
  ['strong', 'strong-emphasis'],
  ['blockquote', 'block-quote'],
].map((pair) => Object.freeze(pair)));

const FORMER_IDS = new Map(FORMER_CONCEPT_IDS);
let BY_NAME;
let BY_SOURCE_NAME;
function ensureConceptIndexes() {
  if (BY_NAME) return;
  const namesByIdentity = new Map();
  const namesBySource = new Map();
  for (const record of CONCEPT_RECORDS) {
    for (const name of [record.id, ...record.formerNames]) namesByIdentity.set(name, record);
    for (const { source, name } of record.sourceAliases) {
      let names = namesBySource.get(source);
      if (!names) namesBySource.set(source, names = new Map());
      let records = names.get(name);
      if (!records) names.set(name, records = []);
      if (records.at(-1) !== record) records.push(record);
    }
  }
  BY_NAME = namesByIdentity;
  BY_SOURCE_NAME = namesBySource;
}

/** The current identity of a concept: `id` itself, or the identity that replaced it. */
export function currentConceptId(id) {
  ensureConceptIndexes();
  return BY_NAME.get(id)?.id ?? FORMER_IDS.get(id) ?? id;
}

/** Every concept record, in register order. */
export function conceptRecords() {
  return CONCEPT_RECORDS;
}

/** The record whose identity or former name is `name`, or `undefined`. */
export function conceptRecord(name) {
  ensureConceptIndexes();
  return BY_NAME.get(name);
}

/** The records a source (such as `ebnf` or `Rust`) names `name`, in register order. */
export function conceptRecordsForSourceName(source, name) {
  ensureConceptIndexes();
  // Only the deeply frozen shipped register is indexed. A fresh result keeps
  // callers' array edits separate from the process-local derived lookup.
  return [...(BY_SOURCE_NAME.get(source)?.get(name) ?? [])];
}

/**
 * Assigns a concept record to `network`: the concept link under the record's
 * identity with its definition, its English phrase, an alias link for every
 * name a source gives it, and an alias link in the meta-language vocabulary
 * for every former name. `nameOrRecord` is a record, an identity or a former
 * name. Returns the concept link and the number of links added.
 */
export function insertConceptRecord(network, nameOrRecord) {
  const record = typeof nameOrRecord === 'string' ? conceptRecord(nameOrRecord) : nameOrRecord;
  if (!record) throw new Error(`no concept record is named ${nameOrRecord}`);
  const before = network.len();
  const concept = network.internConcept(record.id, record.definition);
  network._insertConceptSyntaxMapping(concept, record.id, 'en', record.phrase, false);
  for (const { source, name } of record.sourceAliases) {
    network._insertConceptAliasLink(concept, source, name);
  }
  for (const former of record.formerNames) {
    network._insertConceptAliasLink(concept, FORMER_CONCEPT_ID_VOCABULARY, former);
  }
  return { concept, links: network.len() - before };
}
