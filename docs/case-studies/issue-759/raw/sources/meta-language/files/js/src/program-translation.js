import { createHash } from 'node:crypto';

import { languageSupport, translationContract, TranslationSupport } from './language-support.js';
import { checkProgram } from './translation/check.js';
import { TranslationError } from './translation/diagnostics.js';
import { emitJavaScript } from './translation/emit-javascript.js';
import { emitLean } from './translation/emit-lean.js';
import { emitRocq } from './translation/emit-rocq.js';
import { emitRust } from './translation/emit-rust.js';
import { parseJavaScript } from './translation/javascript.js';
import { parseLean } from './translation/lean.js';
import { parseRocq } from './translation/rocq.js';
import { parseRust } from './translation/rust.js';

const ENVELOPE_MARKER = 'meta-language:portable-source-envelope:v1';
const PROVENANCE_MARKER = 'meta-language:translation-provenance:v1';
const TRANSLATOR = 'meta-language portable-core translator';
const FRONTENDS = { JavaScript: parseJavaScript, Rust: parseRust, Lean: parseLean, Rocq: parseRocq };
const EMITTERS = { JavaScript: emitJavaScript, Rust: emitRust, Lean: emitLean, Rocq: emitRocq };
const PROVENANCE_COMMENT = {
  JavaScript: ['// ', ''],
  Rust: ['// ', ''],
  Lean: ['-- ', ''],
  Rocq: ['(* ', ' *)'],
};
/** What a semantic translation preserves: the printed lines and every stated proposition. */
export const SEMANTIC_OBSERVATION = 'the lines main prints, in order, on executions that do not abort, and the proposition of every source theorem and assertion over the translated definitions';
export const SEMANTIC_ENCODING = 'portable-core translation; the encodings it chose are listed in semantics.encodings';
const OBSERVATION_PROCEDURE = {
  JavaScript: 'run the module with node; --ml-check-theorems evaluates the theorem properties instead of main',
  Rust: 'compile with rustc and run the binary; --ml-check-theorems evaluates the theorem properties instead of main',
  Lean: 'lean --run executes main after the Lean kernel has checked every definition and theorem',
  Rocq: 'rocq compile checks every definition and proof; Eval vm_compute in main prints the list of output lines',
};
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const JS_RESERVED = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for',
  'function', 'if', 'import', 'in', 'instanceof', 'new', 'null', 'return', 'super',
  'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with',
  'yield', 'await', 'let', 'static', 'implements', 'interface', 'package',
  'private', 'protected', 'public', 'arguments', 'eval',
]);

/**
 * Translates a program between JavaScript, Rust, Lean and Rocq.
 *
 * Programs in the portable core are parsed, type-checked and emitted as native
 * target programs that print the same lines and restate the same theorems; the
 * result's `semantics` records the encodings, assumptions, proof obligations,
 * source mappings and provenance of that translation. Other programs are
 * carried in a reversible source envelope whose contract names the construct
 * that kept them out of the portable core.
 */
export function translateProgram(source, sourceLanguage, targetLanguage) {
  const sourceSupport = requiredLanguage(sourceLanguage);
  const targetSupport = requiredLanguage(targetLanguage);
  const contract = translationContract(sourceSupport.name, targetSupport.name);
  if (!contract) {
    throw new Error(`${sourceSupport.name} uses ordinary source emission, not translation`);
  }
  const text = String(source);
  let emitted;
  try {
    emitted = EMITTERS[targetSupport.name](checkProgram(FRONTENDS[sourceSupport.name](text)));
  } catch (error) {
    if (!(error instanceof TranslationError)) throw error;
    return envelopeTranslation(text, sourceSupport, targetSupport, contract, Object.freeze({
      kind: error.kind,
      message: error.message,
      span: error.span ? Object.freeze({ ...error.span }) : null,
    }));
  }
  return semanticTranslation(text, sourceSupport.name, targetSupport.name, contract, emitted);
}

/** Reads the provenance header of a semantic translation. */
export function readTranslationProvenance(code, targetLanguage) {
  const target = requiredLanguage(targetLanguage);
  const [open, close] = PROVENANCE_COMMENT[target.name];
  const firstLine = String(code).split('\n', 1)[0];
  if (!firstLine.startsWith(`${open}${PROVENANCE_MARKER} `) || !firstLine.endsWith(close)) {
    throw new Error(`invalid translation provenance: missing ${target.name} provenance comment`);
  }
  const fields = Object.fromEntries(firstLine
    .slice(open.length + PROVENANCE_MARKER.length + 1, firstLine.length - close.length)
    .split(' ')
    .map((field) => field.split('=')));
  const sourceSupport = languageSupport(fields.source ?? '');
  const sourceBytes = /^[0-9]+$/u.test(fields.bytes ?? '') ? Number(fields.bytes) : Number.NaN;
  if (!sourceSupport || !/^[0-9a-f]{64}$/u.test(fields.sha256 ?? '') || !Number.isSafeInteger(sourceBytes)) {
    throw new Error('invalid translation provenance: expected source, sha256 and bytes fields');
  }
  return Object.freeze({ sourceLanguage: sourceSupport.name, sourceSha256: fields.sha256, sourceBytes });
}

function semanticTranslation(text, sourceLanguage, targetLanguage, contract, emitted) {
  const bytes = encoder.encode(text);
  const sourceSha256 = createHash('sha256').update(bytes).digest('hex');
  const [open, close] = PROVENANCE_COMMENT[targetLanguage];
  const header = `${open}${PROVENANCE_MARKER} source=${sourceLanguage} sha256=${sourceSha256} bytes=${bytes.length}${close}`;
  const kernelTarget = targetLanguage === 'Lean' || targetLanguage === 'Rocq';
  const freezeAll = (list) => Object.freeze(list.map((item) => Object.freeze(item)));
  const semantics = Object.freeze({
    entry: emitted.entry ?? null,
    observationProcedure: OBSERVATION_PROCEDURE[targetLanguage],
    encodings: freezeAll(emitted.encodings.map(({ id, statement }) => ({ id, statement }))),
    assumptions: freezeAll(emitted.assumptions.map(({ id, statement, details }) => ({
      id, statement, details: Object.freeze([...details]),
    }))),
    obligations: freezeAll(emitted.theorems.map((theorem) => ({
      source: theorem.source,
      target: theorem.target,
      kind: theorem.kind,
      closedGoal: theorem.closedGoal,
      discharge: theorem.discharge ?? (kernelTarget ? 'target-kernel' : 'runtime-assertion'),
      check: theorem.check ?? null,
    }))),
    mappings: freezeAll(emitted.mappings.map(({ kind, source, target, sourceSpan }) => ({
      kind, source, target, sourceSpan: sourceSpan ? Object.freeze({ ...sourceSpan }) : null,
    }))),
    runtimeDependencies: Object.freeze(runtimeDependencies(targetLanguage, emitted.text)),
    provenance: Object.freeze({
      translator: TRANSLATOR,
      sourceLanguage,
      sourceSha256,
      sourceBytes: bytes.length,
      header,
    }),
  });
  return Object.freeze({
    sourceLanguage,
    targetLanguage,
    code: `${header}\n${emitted.text}`,
    contract: Object.freeze({
      ...contract,
      support: TranslationSupport.SemanticTranslation,
      observation: SEMANTIC_OBSERVATION,
      encoding: SEMANTIC_ENCODING,
      assumptions: Object.freeze(semantics.assumptions.map(({ statement }) => statement)),
      obligation: null,
    }),
    semantics,
    diagnostic: null,
  });
}

/** The libraries and host features the emitted program needs, read from its text. */
function runtimeDependencies(targetLanguage, code) {
  if (targetLanguage === 'JavaScript') {
    return [
      'ECMAScript 2026 host with BigInt',
      ...(code.includes('process.argv') ? ['Node.js process.argv (selects --ml-check-theorems)'] : []),
    ];
  }
  if (targetLanguage === 'Rust') {
    return [
      'Rust 1.99.0 standard library',
      ...(code.includes('\npub mod ml {') ? ['ml::Big arbitrary-precision integers, defined inside the artifact'] : []),
      ...(code.includes('\npub mod ml_number {')
        ? ['ml_number JavaScript Number formatting and SameValue, defined inside the artifact']
        : []),
    ];
  }
  if (targetLanguage === 'Lean') {
    const imports = [...code.matchAll(/^import ([^\n]+)$/gmu)].map((match) => match[1].trim());
    return ['Lean 4.34.1 core library', ...imports];
  }
  const libraries = [...code.matchAll(/^From ([A-Za-z]+) Require Import ([^.\n]+)\.$/gmu)]
    .flatMap((match) => match[2].trim().split(/\s+/u).map((module) => `${match[1]}.${module}`));
  return ['Rocq 9.3', ...libraries];
}

function envelopeTranslation(text, sourceSupport, targetSupport, contract, diagnostic) {
  const bytes = encoder.encode(text);
  const payload = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  const metadata = `${ENVELOPE_MARKER}:${sourceSupport.name}:${bytes.length}:${payload}`;
  const artifact = targetSource(targetSupport.name, metadata, sourceSupport.name, text);
  return Object.freeze({
    sourceLanguage: sourceSupport.name,
    targetLanguage: targetSupport.name,
    code: artifact.code,
    contract: artifact.observation
      ? Object.freeze({
          ...contract,
          support: 'semantic-subset',
          observation: artifact.observation,
          encoding: 'direct executable target source with a reversible source provenance envelope',
          assumptions: Object.freeze([]),
          obligation: null,
        })
      : contract,
    semantics: null,
    diagnostic,
  });
}

/** Decodes and integrity-checks a portable envelope from target source. */
export function decodeProgramTranslation(code, targetLanguage) {
  const target = requiredLanguage(targetLanguage);
  const metadata = envelopeMetadata(String(code), target.name);
  const [sourceLanguage, byteLength, payload, ...extra] = metadata.split(':');
  if (!sourceLanguage || !byteLength || payload === undefined || extra.length) {
    throw new Error('invalid portable envelope: expected source language, byte length, and hexadecimal payload');
  }
  const sourceSupport = languageSupport(sourceLanguage);
  if (!sourceSupport) throw new Error(`invalid portable envelope: unknown source language ${sourceLanguage}`);
  if (!/^(?:[0-9a-f]{2})*$/u.test(payload)) {
    throw new Error('invalid portable envelope: payload is not lowercase hexadecimal');
  }
  const bytes = Uint8Array.from(payload.match(/../gu) ?? [], (pair) => Number.parseInt(pair, 16));
  const expectedLength = Number.parseInt(byteLength, 10);
  if (!Number.isSafeInteger(expectedLength) || expectedLength < 0 || bytes.length !== expectedLength) {
    throw new Error(`invalid portable envelope: declared ${byteLength} bytes but decoded ${bytes.length}`);
  }
  let source;
  try {
    source = decoder.decode(bytes);
  } catch {
    throw new Error('invalid portable envelope: payload is not UTF-8 source');
  }
  return Object.freeze({ sourceLanguage: sourceSupport.name, source });
}

function requiredLanguage(language) {
  const support = languageSupport(language);
  if (!support) throw new Error(`no four-language translation frontend for ${language}`);
  return support;
}

function targetSource(language, metadata, sourceLanguage, source) {
  if (language === 'JavaScript') {
    const rustFunction = sourceLanguage === 'Rust'
      ? /^pub fn ([A-Za-z_][A-Za-z_0-9]*)\(\) -> u32 \{ ([0-9]+) \}$/u.exec(source)
      : null;
    if (
      rustFunction &&
      !JS_RESERVED.has(rustFunction[1]) &&
      /^(?:0|[1-9][0-9]*)$/u.test(rustFunction[2]) &&
      BigInt(rustFunction[2]) <= 4_294_967_295n
    ) {
      return {
        code: `/*${metadata}*/\nexport function ${rustFunction[1]}() { return ${rustFunction[2]}; }\n`,
        observation: 'calling the exported zero-argument function returns the same integer',
      };
    }
    return { code: `/*${metadata}*/\nexport const __meta_language_portable_v1 = Object.freeze({ schemaVersion: 1 });\n` };
  }
  if (language === 'Rust') {
    const print = sourceLanguage === 'JavaScript'
      ? /^console\.log\(([0-9]+)\);$/u.exec(source)
      : null;
    if (
      print &&
      /^(?:0|[1-9][0-9]*)$/u.test(print[1]) &&
      BigInt(print[1]) <= BigInt(Number.MAX_SAFE_INTEGER)
    ) {
      return {
        code: `/*${metadata}*/\npub fn main() { println!("${print[1]}"); }\n`,
        observation: 'running the target main function prints the same decimal value and newline',
      };
    }
    return { code: `/*${metadata}*/\npub const __META_LANGUAGE_PORTABLE_V1: u32 = 1;\n` };
  }
  if (language === 'Lean') {
    return { code: `/-${metadata}-/\ndef __meta_language_portable_v1 : Nat := 1\n` };
  }
  return { code: `(*${metadata}*)\nDefinition __meta_language_portable_v1 : nat := 1.\n` };
}

function envelopeMetadata(code, targetLanguage) {
  const [open, close] = targetLanguage === 'Lean'
    ? ['/-', '-/']
    : targetLanguage === 'Rocq'
      ? ['(*', '*)']
      : ['/*', '*/'];
  if (!code.startsWith(open)) {
    throw new Error(`invalid portable envelope: missing ${targetLanguage} envelope comment`);
  }
  const closeAt = code.indexOf(close, open.length);
  if (closeAt === -1) {
    throw new Error(`invalid portable envelope: unclosed ${targetLanguage} envelope comment`);
  }
  const metadata = code.slice(open.length, closeAt);
  if (!metadata.startsWith(`${ENVELOPE_MARKER}:`)) {
    throw new Error('invalid portable envelope: missing schema marker');
  }
  return metadata.slice(ENVELOPE_MARKER.length + 1);
}
