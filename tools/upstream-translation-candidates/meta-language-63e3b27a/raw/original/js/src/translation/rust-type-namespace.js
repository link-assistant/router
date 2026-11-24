import { readRuntimeProjectData } from '../project-data-loader.js';
import { unsupported, typeError } from './diagnostics.js';
import { RustSourceOrigins } from './rust-source-origins.js';
import { RUST_SOURCE_SIGNATURE_POLICY } from './rust-source-signatures.js';
import { acceptRustSourceHeaderLifetimeCharacter } from './rust-source-header-emission-rules.js';
import {checkRustUnitCloneDerivation} from './rust-unit-clone.js';
import {checkOwnedProgramContainers} from './owned-program-containers.js';
import { acceptRustTypeNamespaceModel, acceptRustTypeNamespacePosition,
  acceptRustTypeNamespaceDeclaration, acceptRustTypeNamespaceFields, acceptRustTypeNamespaceAnchor,
  acceptRustTypeNamespaceContainer, acceptRustTypeNamespaceRecordValue } from './rust-type-namespace-rules.js';

export const RUST_TYPE_NAMESPACE_POLICY = readRuntimeProjectData(new URL('./data/rust-type-namespace.lino', import.meta.url));
const fail = detail => { throw typeError(`an owned Rust type namespace ${detail}`); };

/** Reject erased container facts before the generic encoder or semantic walk. */
export function checkRustTypeNamespaceContainers(program) {
  return checkOwnedProgramContainers(program, { acceptContainer: acceptRustTypeNamespaceContainer, fail,
    selectedFields: RUST_TYPE_NAMESPACE_POLICY.containerMarkerFields });
}

/** Preserve contextual JSON/serde facts before a source or Links projection. */
export function checkRustTypeNamespaceRecordShapes(program) {
  if (!checkRustTypeNamespaceContainers(program)) return false;
  for (const field of ['imports', 'externals']) {
    if (Object.hasOwn(program, field) && (!Array.isArray(program[field]) || program[field].length)) fail('requires a Rust program without imported aliases or externals');
  }
  const visited = new WeakSet();
  function inspect(value) {
    if (!value || typeof value !== 'object' || visited.has(value)) return;
    visited.add(value);
    if (value instanceof Map) { for (const child of Map.prototype.values.call(value)) inspect(child); return; }
    if (Array.isArray(value)) { for (const child of value) inspect(child); return; }
    const context = value === program ? 'program' : value === program.main ? 'main' : typeof value.k === 'string' ? value.k : '';
    for (const [field, child] of Object.entries(value)) {
      const booleanRequired=(RUST_TYPE_NAMESPACE_POLICY.recordBooleanFields[context] ?? []).includes(field);
      if (!acceptRustTypeNamespaceRecordValue(booleanRequired,typeof child === 'boolean',child !== undefined)) {
        if (child === undefined) fail('contains an explicitly undefined owned field');
        if (context === 'fn' && field === 'generated') fail('requires original declarations with absent or false generated facts');
        fail('contains a non-Boolean contextual flag');
      }
      if (field === 'span' && child !== null && (!child || typeof child !== 'object' || Array.isArray(child)
        || Object.keys(child).length !== 2 || !Number.isSafeInteger(child.start) || !Number.isSafeInteger(child.end)
        || child.start < 0 || child.end < child.start || Object.is(child.start,-0) || Object.is(child.end,-0) || child.end > RUST_TYPE_NAMESPACE_POLICY.sourceOffsetMaximum)) fail('contains an invalid owned source span');
      inspect(child);
    }
  }
  inspect(program);
  return true;
}

/** Reuse the shared character predicate matching the actual Rust lexer. */
export function acceptRustTypeNamespaceSpellingSegment(value) {
  if (typeof value !== 'string' || value.length === 0) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!acceptRustSourceHeaderLifetimeCharacter(value.charCodeAt(index), index === 0)) return false;
  }
  return true;
}

/** Capture actual ordered source spellings alongside the existing signature. */
export function createRustTypeNamespaceProof(parameters, result) {
  return { model: RUST_TYPE_NAMESPACE_POLICY.model, language: RUST_TYPE_NAMESPACE_POLICY.language,
    parameters: parameters.map(position => [...(position.namespaceSpelling ?? [])]), result: [...(result.namespaceSpelling ?? [])] };
}

/** Compute the actual anchored parent traversal before the catalog lookup. */
export function requireRustTypeNamespaceAnchor(source, path) {
  let parents = 0;
  while (source[parents] === 'super') parents += 1;
  if (!acceptRustTypeNamespaceAnchor(parents > path.length)) fail('spelling traverses above its crate root');
}

/** Use the existing anchored, filtered lookup over actual checked declarations. */
export function validateRustTypeNamespace(program) {
  checkRustTypeNamespaceRecordShapes(program);
  const selected = [...program.declarations.values()].some(entry => Object.hasOwn(entry, 'sourceTypeNamespace')||Object.hasOwn(entry,'sourceUnitCloneDerivation'));
  if (!selected) return;
  if (program.sourceLanguage !== RUST_TYPE_NAMESPACE_POLICY.language || program.imports?.length || program.externals?.length) fail('requires a Rust program without imported aliases or externals');
  const catalog = new Map();
  for (const [name, declaration] of program.declarations) {
    if (typeof name !== 'string' || !acceptRustTypeNamespaceSpellingSegment(declaration.name) || !Array.isArray(declaration.modulePath) || !declaration.modulePath.every(acceptRustTypeNamespaceSpellingSegment)) fail('catalog contains an invalid Rust identifier segment');
    if(Object.hasOwn(declaration,'sourceUnitCloneDerivation'))checkRustUnitCloneDerivation(declaration.sourceUnitCloneDerivation,declaration);
    catalog.set(name, { k: declaration.k });
    if (declaration.k === 'data') for (const constructor of declaration.ctors) {
      if (!acceptRustTypeNamespaceSpellingSegment(constructor.name)) fail('catalog contains an invalid constructor identifier segment');
      const key = `${name}.${constructor.name}`;
      if (catalog.has(key) || program.declarations.has(key)) fail('cannot admit a constructor-overwritten declaration identity');
      catalog.set(key, { k: 'ctor' });
    }
  }
  const modules = [...program.items];
  for (let index = 0; index < modules.length; index += 1) {
    const item = modules[index];
    if (item.k === 'module') {
      if (!acceptRustTypeNamespaceSpellingSegment(item.name)) fail('catalog contains an invalid module identifier segment');
      if (catalog.has(item.fullName)) fail('cannot admit a shared module/declaration identity');
      catalog.set(item.fullName, { k: 'module' }); modules.push(...item.items);
    }
  }
  const origins = new RustSourceOrigins(catalog);
  const spelling = value => Array.isArray(value) && value.length > 0 && value.every(acceptRustTypeNamespaceSpellingSegment);
  const position = (source, signature, path, result) => {
    if (!spelling(source) || !acceptRustTypeNamespacePosition(signature.owner.kind,
      signature.wrappers.some(wrapper => !RUST_TYPE_NAMESPACE_POLICY.parameterWrappers.includes(wrapper)), result && signature.wrappers.length > 0)) fail('position needs an actual primitive or datatype spelling and a proved direct result');
    requireRustTypeNamespaceAnchor(source, path);
    const declared = origins.lookup(source, path, RUST_SOURCE_SIGNATURE_POLICY.typeOwnerKinds);
    if (declared) {
      if (!acceptRustTypeNamespaceDeclaration(declared.k) || signature.owner.kind !== 'declaration' || declared.fullName !== signature.owner.path.join('.')) fail('spelling does not target its actual scoped datatype declaration');
    } else if (signature.owner.kind !== 'primitive' || source.length !== 1 || signature.owner.path.length !== 1 || source[0] !== signature.owner.path[0]) fail('spelling has no actual primitive type binding');
  };
  for (const declaration of program.declarations.values()) {
    if (declaration.k !== 'fn') continue;
    if (!acceptRustTypeNamespaceFields(Object.keys(declaration).some(field => !RUST_TYPE_NAMESPACE_POLICY.declarationFields.includes(field)))) fail('function contains unrepresented interface fields');
    if (Object.hasOwn(declaration, 'generated') && declaration.generated !== false) fail('requires original declarations with absent or false generated facts');
    for (const parameter of declaration.params) if (!acceptRustTypeNamespaceFields(Object.keys(parameter).some(field => !RUST_TYPE_NAMESPACE_POLICY.parameterFields.includes(field))) || parameter.guard != null || parameter.default != null) fail('parameter contains unrepresented interface fields or defaults');
    const proof = declaration.sourceTypeNamespace;
    const signature = declaration.sourceSignature;
    if (!proof || typeof proof !== 'object' || Array.isArray(proof) || Object.keys(proof).length !== RUST_TYPE_NAMESPACE_POLICY.fields.length || RUST_TYPE_NAMESPACE_POLICY.fields.some(field => !Object.hasOwn(proof, field)) || !acceptRustTypeNamespaceModel(proof.model) || !proof.model || proof.language !== RUST_TYPE_NAMESPACE_POLICY.language) fail('has malformed or missing selected facts');
    if (!signature || !Array.isArray(proof.parameters) || proof.parameters.length !== signature.parameters.length) fail('must retain its owned source signature and ordered parameter positions');
    proof.parameters.forEach((source, index) => position(source, signature.parameters[index], declaration.modulePath, false));
    position(proof.result, signature.result, declaration.modulePath, true);
  }
}

export function requireRustTypeNamespaceWithoutImports(model) {
  if (model) throw unsupported('Rust type namespace imports', 'imported aliases require a separate source binding proof');
}
