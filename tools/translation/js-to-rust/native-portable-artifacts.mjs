import { createHash } from 'node:crypto';
import { isDeepStrictEqual,types } from 'node:util';
import { analyzeJavaScript,analyzeJavaScriptBatched, parseMeta, emitRust, emitTypeScript } from './translator.mjs';
import { toLino } from './vendor/ir.mjs';
import {createConstructorSourceGraph} from './vendor/source-constructors.mjs';
import {assertPrivateParserExecution} from '../private-parser-execution.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => `${JSON.stringify(value)}\n`;
const safeSource = /^packages\/javascript\/native\/(?:[a-z0-9]+(?:-[a-z0-9]+)*\/)*[a-z0-9]+(?:-[a-z0-9]+)*\.mjs$/u;

/** Assemble independently checked native bodies; refused owners remain refused. */
export function buildNativePortableArtifacts(sources) {
  const artifacts = new Map();
  const modules = [];
  const names = new Set();
  // A refused graph never grants a partial constructor capability. Existing
  // per-module discovery below retains its exact census and syntax failures.
  let constructorGraph;try{constructorGraph=createConstructorSourceGraph(sources);}catch{}
  for (const { path, source } of [...sources].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) {
    if (!safeSource.test(path) || names.has(path) || typeof source !== 'string') {
      throw new Error('invalid or duplicate native portable source');
    }
    names.add(path);
    const analyzed = analyzeJavaScript(source, { sourcePath: path,constructorGraph });
    const scoped = analyzed.scopedFunctions;
    if (!scoped?.complete || scoped.sourceItems !== scoped.items.length
      || !Number.isSafeInteger(scoped.fullDomainTranslatedItems) || scoped.fullDomainTranslatedItems < 0
      || !Number.isSafeInteger(scoped.conditionalPrivateBodyDraftItems) || scoped.conditionalPrivateBodyDraftItems < 0
      || scoped.fullDomainTranslatedItems + scoped.conditionalPrivateBodyDraftItems !== scoped.translatedItems
      || scoped.program.filter((item) => item.conditionalInputs === true || item.conditionalCaptures === true || item.conditionalCalls === true).length !== scoped.conditionalPrivateBodyDraftItems
      || scoped.translatedItems !== scoped.program.length
      || scoped.sourceItems !== scoped.translatedItems + scoped.unsupportedItems) {
      throw new Error(`incomplete scoped native discovery: ${path}`);
    }
    if (!isDeepStrictEqual(scoped.items.filter((item) => item.status === 'translated').map((item) => item.name),
      scoped.program.map((item) => item.name))) throw new Error(`scoped native identity drift: ${path}`);
    const topLevel = {
      sourceItems: analyzed.items.length,
      translatedItems: analyzed.program.length,
      fullDomainTranslatedItems: analyzed.program.filter(item=>!item.conditionalConstructors&&!item.conditionalInputs&&!item.conditionalCaptures&&!item.conditionalCalls).length,
      conditionalPrivateBodyDraftItems: analyzed.program.filter(item=>item.conditionalConstructors||item.conditionalInputs||item.conditionalCaptures||item.conditionalCalls).length,
      unsupportedItems: analyzed.items.filter((item) => item.status === 'unsupported').length,
      items: analyzed.items,
      diagnostics: analyzed.diagnostics,
    };
    if (topLevel.sourceItems !== topLevel.translatedItems + topLevel.unsupportedItems) {
      throw new Error(`incomplete top-level native discovery: ${path}`);
    }
    const stem = path.slice('packages/javascript/native/'.length, -4);
    const outputs = [];
    for (const [scope, program] of [['top-level', analyzed.program], ['scoped', scoped.program]]) {
      const meta = `${program.map(toLino).join('\n')}\n`;
      const decoded = parseMeta(meta,{constructorGraph});
      if (!isDeepStrictEqual(decoded, program)) throw new Error(`native meta roundtrip drift: ${path} ${scope}`);
      const header = `// GENERATED: node scripts/regenerate-js-first.mjs\n// Independently checked ${scope} bodies from ${path}; source sha256=${hash(source)}; IR sha256=${hash(meta)}.\n// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.\n`;
      for (const [outputPath, content] of [
        [`tools/translation/js-to-rust/generated/native-portable/${scope}/${stem}.lino`, `# GENERATED: checked portable-router-v1 bodies; no source envelopes.\n${meta}`],
        [`tools/translation/js-to-rust/generated/native-portable/${scope}/${stem}.rs.txt`, `${header}${emitRust(decoded)}`],
        [`packages/typescript/native/portable-draft/${scope}/${stem}.ts`, `${header}export {};\n${emitTypeScript(decoded,{outputPath:`packages/typescript/native/portable-draft/${scope}/${stem}.ts`})}`],
      ]) {
        if (artifacts.has(outputPath)) throw new Error(`duplicate native portable output: ${outputPath}`);
        artifacts.set(outputPath, content);
        outputs.push({ path: outputPath, bytes: Buffer.byteLength(content), sha256: hash(content), scope, definitions: decoded.length });
      }
    }
    modules.push({ path, bytes: Buffer.byteLength(source), sha256: hash(source), topLevel,
      scopedFunctions: { complete: true, sourceItems: scoped.sourceItems, translatedItems: scoped.translatedItems,
        fullDomainTranslatedItems: scoped.fullDomainTranslatedItems, conditionalPrivateBodyDraftItems: scoped.conditionalPrivateBodyDraftItems,
        unsupportedItems: scoped.unsupportedItems, items: scoped.items, diagnostics: scoped.diagnostics }, outputs });
  }
  const totals = (field) => modules.reduce((sum, module) => {
    const census = module[field];
    return { sourceItems: sum.sourceItems + census.sourceItems, translatedItems: sum.translatedItems + census.translatedItems,
      unsupportedItems: sum.unsupportedItems + census.unsupportedItems,
        fullDomainTranslatedItems: sum.fullDomainTranslatedItems + census.fullDomainTranslatedItems,
        conditionalPrivateBodyDraftItems: sum.conditionalPrivateBodyDraftItems + census.conditionalPrivateBodyDraftItems };
  }, { sourceItems: 0, translatedItems: 0, unsupportedItems: 0, fullDomainTranslatedItems: 0, conditionalPrivateBodyDraftItems: 0 });
  const manifest = { schema: 'native-portable-body-draft-v1', fragment: 'portable-router-v1',
    contract: { wholeNativeImplementationTranslated: false, runtimeParity: false, rustCompiled: false,
      topLevel: 'Original top-level source items; partial module admission does not admit its refused owners. Source-bound owned-iteration bodies retain explicit conditionalCalls standard-intrinsic obligations. Imported Error construction retains conditionalConstructors; external constructor/global Error/prototype lookup stability remains unproved and Rust exposes only normal/throw projections. Conditional drafts have separate counts.',
      scopedFunctions: 'Additional ArrowFunction, FunctionExpression and FunctionDeclaration bodies, excluding top-level declarations and initializer forms already counted at top level, and excluding method/accessor bodies themselves; privately source-checked lexical environments retain their closed capture contracts. Full-domain helpers and explicitly conditional private producer/captured-container body drafts have separate counts. Conditional drafts require unchanged standard producer/callback/collection intrinsics, with producer effects and lookup stability unproved; parents and public/unqualified callers remain refused.',
      meta: 'Both targets consume the serialized and independently checked meta-language program.',
      targets: 'TypeScript preserves the declared checked fragment; Rust uses explicit payload and host-qualified projections.' },
    topLevel: totals('topLevel'), scopedFunctions: totals('scopedFunctions'), modules };
  artifacts.set('parity/js-native-portable-draft.json', json(manifest));
  return { artifacts, manifest };
}

// This separate assembler deliberately opts into the documented batch contract.
// The entire original default body above remains unchanged.
function bulkArtifactSourceSnapshot(input){
  assertPrivateParserExecution();
  const get=Object.getOwnPropertyDescriptor,own=Object.hasOwn,names=Reflect.ownKeys,parent=Object.getPrototypeOf,isProxy=types.isProxy;
  const arrayPrototype=Array.prototype,objectPrototype=Object.prototype,records=[];
  function capture(value,expected,expectedKeys){
    if(!value||typeof value!=='object'||isProxy(value))throw Error('bulk artifact own data required');
    const base=parent(value);if(base!==expected&&!(expected===objectPrototype&&base===null))throw Error('bulk artifact source prototype');
    const keys=names(value),fields=[];
    // Native captureStackTrace may attach lazy fields to a plain row or Array.
    if(keys.length!==expectedKeys.length)throw Error('bulk artifact exact field shape required');
    for(let at=0;at<keys.length;at++)if(keys[at]!==expectedKeys[at])throw Error('bulk artifact exact field names required');
    for(let at=0;at<keys.length;at++){const field=get(value,keys[at]);if(!field||!own(field,'value'))throw Error('bulk artifact data fields required');fields.push(field);}
    records.push({value,base,keys,fields});return {keys,fields};
  }
  if(!input||typeof input!=='object'||isProxy(input)||!Array.isArray(input))throw Error('bulk artifact source array required');
  const length=get(input,'length');
  if(!length||!own(length,'value')||typeof length.value!=='number'||length.value<0||length.value>256||length.value%1)throw Error('bulk artifact source count');
  const positions=[];for(let at=0;at<length.value;at++)positions.push(''+at);positions.push('length');
  const outer=capture(input,arrayPrototype,positions);
  if(!length||!own(length,'value')||typeof length.value!=='number'||length.value<0||length.value>256||length.value%1||outer.keys.length!==length.value+1||outer.keys[length.value]!=='length')throw Error('bulk artifact source count/density');
  const sources=[];
  for(let at=0;at<length.value;at++){
    if(outer.keys[at]!==''+at||outer.fields[at].enumerable!==true)throw Error('bulk artifact source positions');
    const row=capture(outer.fields[at].value,objectPrototype,['path','source']);
    if(row.keys.length!==2||row.keys[0]!=='path'||row.keys[1]!=='source'||row.fields[0].enumerable!==true||row.fields[1].enumerable!==true||typeof row.fields[0].value!=='string'||typeof row.fields[1].value!=='string')throw Error('bulk artifact primitive path/source required');
    sources.push({path:row.fields[0].value,source:row.fields[1].value});
  }
  return {sources,requireCurrent(){
    // Last caller check is captured native reflection only; no callback follows.
    for(let at=0;at<records.length;at++){
      const row=records[at],keys=names(row.value);if(parent(row.value)!==row.base||keys.length!==row.keys.length)throw Error('bulk artifact original source shape changed');
      for(let index=0;index<keys.length;index++)if(keys[index]!==row.keys[index])throw Error('bulk artifact original source names changed');
      for(let index=0;index<keys.length;index++){
        const field=get(row.value,keys[index]),before=row.fields[index];
        if(!field||!own(field,'value')||field.value!==before.value||field.writable!==before.writable||field.enumerable!==before.enumerable||field.configurable!==before.configurable)throw Error('bulk artifact original source changed');
      }
    }
  }};
}
export function buildNativePortableArtifactsBulk(input) {
  const snapshot=bulkArtifactSourceSnapshot(input),sources=snapshot.sources;
  const artifacts = new Map();
  const modules = [];
  const names = new Set();
  // A refused graph never grants a partial constructor capability. Existing
  // per-module discovery below retains its exact census and syntax failures.
  let constructorGraph;try{constructorGraph=createConstructorSourceGraph(sources);}catch{}
  for (const { path, source } of [...sources].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) {
    if (!safeSource.test(path) || names.has(path) || typeof source !== 'string') {
      throw new Error('invalid or duplicate native portable source');
    }
    names.add(path);
    const analyzed = analyzeJavaScriptBatched(source, { sourcePath: path,constructorGraph }).analysis;
    const scoped = analyzed.scopedFunctions;
    if (!scoped?.complete || scoped.sourceItems !== scoped.items.length
      || !Number.isSafeInteger(scoped.fullDomainTranslatedItems) || scoped.fullDomainTranslatedItems < 0
      || !Number.isSafeInteger(scoped.conditionalPrivateBodyDraftItems) || scoped.conditionalPrivateBodyDraftItems < 0
      || scoped.fullDomainTranslatedItems + scoped.conditionalPrivateBodyDraftItems !== scoped.translatedItems
      || scoped.program.filter((item) => item.conditionalInputs === true || item.conditionalCaptures === true || item.conditionalCalls === true).length !== scoped.conditionalPrivateBodyDraftItems
      || scoped.translatedItems !== scoped.program.length
      || scoped.sourceItems !== scoped.translatedItems + scoped.unsupportedItems) {
      throw new Error(`incomplete scoped native discovery: ${path}`);
    }
    if (!isDeepStrictEqual(scoped.items.filter((item) => item.status === 'translated').map((item) => item.name),
      scoped.program.map((item) => item.name))) throw new Error(`scoped native identity drift: ${path}`);
    const topLevel = {
      sourceItems: analyzed.items.length,
      translatedItems: analyzed.program.length,
      fullDomainTranslatedItems: analyzed.program.filter(item=>!item.conditionalConstructors&&!item.conditionalInputs&&!item.conditionalCaptures&&!item.conditionalCalls).length,
      conditionalPrivateBodyDraftItems: analyzed.program.filter(item=>item.conditionalConstructors||item.conditionalInputs||item.conditionalCaptures||item.conditionalCalls).length,
      unsupportedItems: analyzed.items.filter((item) => item.status === 'unsupported').length,
      items: analyzed.items,
      diagnostics: analyzed.diagnostics,
    };
    if (topLevel.sourceItems !== topLevel.translatedItems + topLevel.unsupportedItems) {
      throw new Error(`incomplete top-level native discovery: ${path}`);
    }
    const stem = path.slice('packages/javascript/native/'.length, -4);
    const outputs = [];
    for (const [scope, program] of [['top-level', analyzed.program], ['scoped', scoped.program]]) {
      const meta = `${program.map(toLino).join('\n')}\n`;
      const decoded = parseMeta(meta,{constructorGraph});
      if (!isDeepStrictEqual(decoded, program)) throw new Error(`native meta roundtrip drift: ${path} ${scope}`);
      const header = `// GENERATED: node scripts/regenerate-js-first.mjs\n// Independently checked ${scope} bodies from ${path}; source sha256=${hash(source)}; IR sha256=${hash(meta)}.\n// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.\n`;
      for (const [outputPath, content] of [
        [`tools/translation/js-to-rust/generated/native-portable/${scope}/${stem}.lino`, `# GENERATED: checked portable-router-v1 bodies; no source envelopes.\n${meta}`],
        [`tools/translation/js-to-rust/generated/native-portable/${scope}/${stem}.rs.txt`, `${header}${emitRust(decoded)}`],
        [`packages/typescript/native/portable-draft/${scope}/${stem}.ts`, `${header}export {};\n${emitTypeScript(decoded,{outputPath:`packages/typescript/native/portable-draft/${scope}/${stem}.ts`})}`],
      ]) {
        if (artifacts.has(outputPath)) throw new Error(`duplicate native portable output: ${outputPath}`);
        artifacts.set(outputPath, content);
        outputs.push({ path: outputPath, bytes: Buffer.byteLength(content), sha256: hash(content), scope, definitions: decoded.length });
      }
    }
    modules.push({ path, bytes: Buffer.byteLength(source), sha256: hash(source), topLevel,
      scopedFunctions: { complete: true, sourceItems: scoped.sourceItems, translatedItems: scoped.translatedItems,
        fullDomainTranslatedItems: scoped.fullDomainTranslatedItems, conditionalPrivateBodyDraftItems: scoped.conditionalPrivateBodyDraftItems,
        unsupportedItems: scoped.unsupportedItems, items: scoped.items, diagnostics: scoped.diagnostics }, outputs });
  }
  const totals = (field) => modules.reduce((sum, module) => {
    const census = module[field];
    return { sourceItems: sum.sourceItems + census.sourceItems, translatedItems: sum.translatedItems + census.translatedItems,
      unsupportedItems: sum.unsupportedItems + census.unsupportedItems,
        fullDomainTranslatedItems: sum.fullDomainTranslatedItems + census.fullDomainTranslatedItems,
        conditionalPrivateBodyDraftItems: sum.conditionalPrivateBodyDraftItems + census.conditionalPrivateBodyDraftItems };
  }, { sourceItems: 0, translatedItems: 0, unsupportedItems: 0, fullDomainTranslatedItems: 0, conditionalPrivateBodyDraftItems: 0 });
  const manifest = { schema: 'native-portable-body-draft-v1', fragment: 'portable-router-v1',
    contract: { wholeNativeImplementationTranslated: false, runtimeParity: false, rustCompiled: false,
      topLevel: 'Original top-level source items; partial module admission does not admit its refused owners. Source-bound owned-iteration bodies retain explicit conditionalCalls standard-intrinsic obligations. Imported Error construction retains conditionalConstructors; external constructor/global Error/prototype lookup stability remains unproved and Rust exposes only normal/throw projections. Conditional drafts have separate counts.',
      scopedFunctions: 'Additional ArrowFunction, FunctionExpression and FunctionDeclaration bodies, excluding top-level declarations and initializer forms already counted at top level, and excluding method/accessor bodies themselves; privately source-checked lexical environments retain their closed capture contracts. Full-domain helpers and explicitly conditional private producer/captured-container body drafts have separate counts. Conditional drafts require unchanged standard producer/callback/collection intrinsics, with producer effects and lookup stability unproved; parents and public/unqualified callers remain refused.',
      meta: 'Both targets consume the serialized and independently checked meta-language program.',
      targets: 'TypeScript preserves the declared checked fragment; Rust uses explicit payload and host-qualified projections.' },
    topLevel: totals('topLevel'), scopedFunctions: totals('scopedFunctions'), modules };
  artifacts.set('parity/js-native-portable-draft.json', json(manifest));
  const result={artifacts,manifest};
  assertPrivateParserExecution();snapshot.requireCurrent();return result;
}


import {analyzeJavaScriptCorpusBatched} from './translator.mjs';
import {captureNativeCorpusSources} from './native-corpus-sources.mjs';
// Explicit whole-corpus sibling; both existing assemblers above stay unchanged.
export function buildNativePortableArtifactsCorpusBulk(input) {
  const snapshot=captureNativeCorpusSources(input),sources=snapshot.sources;
  const artifacts = new Map();
  const modules = [];
  const names = new Set();
  // A refused graph never grants a partial constructor capability. Existing
  // per-module discovery below retains its exact census and syntax failures.
  let constructorGraph;try{constructorGraph=createConstructorSourceGraph(sources);}catch{}
  const corpus=analyzeJavaScriptCorpusBatched(sources,{constructorGraph});let analysisIndex=0;
  for (const { path, source } of [...sources].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0)) {
    if (!safeSource.test(path) || names.has(path) || typeof source !== 'string') {
      throw new Error('invalid or duplicate native portable source');
    }
    names.add(path);
    const checked=corpus.analyses[analysisIndex++];if(!checked||checked.path!==path||checked.source!==source)throw Error('corpus ordinary analysis association differs');
    const analyzed = checked.analysis;
    const scoped = analyzed.scopedFunctions;
    if (!scoped?.complete || scoped.sourceItems !== scoped.items.length
      || !Number.isSafeInteger(scoped.fullDomainTranslatedItems) || scoped.fullDomainTranslatedItems < 0
      || !Number.isSafeInteger(scoped.conditionalPrivateBodyDraftItems) || scoped.conditionalPrivateBodyDraftItems < 0
      || scoped.fullDomainTranslatedItems + scoped.conditionalPrivateBodyDraftItems !== scoped.translatedItems
      || scoped.program.filter((item) => item.conditionalInputs === true || item.conditionalCaptures === true || item.conditionalCalls === true).length !== scoped.conditionalPrivateBodyDraftItems
      || scoped.translatedItems !== scoped.program.length
      || scoped.sourceItems !== scoped.translatedItems + scoped.unsupportedItems) {
      throw new Error(`incomplete scoped native discovery: ${path}`);
    }
    if (!isDeepStrictEqual(scoped.items.filter((item) => item.status === 'translated').map((item) => item.name),
      scoped.program.map((item) => item.name))) throw new Error(`scoped native identity drift: ${path}`);
    const topLevel = {
      sourceItems: analyzed.items.length,
      translatedItems: analyzed.program.length,
      fullDomainTranslatedItems: analyzed.program.filter(item=>!item.conditionalConstructors&&!item.conditionalInputs&&!item.conditionalCaptures&&!item.conditionalCalls).length,
      conditionalPrivateBodyDraftItems: analyzed.program.filter(item=>item.conditionalConstructors||item.conditionalInputs||item.conditionalCaptures||item.conditionalCalls).length,
      unsupportedItems: analyzed.items.filter((item) => item.status === 'unsupported').length,
      items: analyzed.items,
      diagnostics: analyzed.diagnostics,
    };
    if (topLevel.sourceItems !== topLevel.translatedItems + topLevel.unsupportedItems) {
      throw new Error(`incomplete top-level native discovery: ${path}`);
    }
    const stem = path.slice('packages/javascript/native/'.length, -4);
    const outputs = [];
    for (const [scope, program] of [['top-level', analyzed.program], ['scoped', scoped.program]]) {
      const meta = `${program.map(toLino).join('\n')}\n`;
      const decoded = parseMeta(meta,{constructorGraph});
      if (!isDeepStrictEqual(decoded, program)) throw new Error(`native meta roundtrip drift: ${path} ${scope}`);
      const header = `// GENERATED: node scripts/regenerate-js-first.mjs\n// Independently checked ${scope} bodies from ${path}; source sha256=${hash(source)}; IR sha256=${hash(meta)}.\n// Refused enclosing owners remain refused. runtimeParity: false; Rust is an uncompiled projection.\n`;
      for (const [outputPath, content] of [
        [`tools/translation/js-to-rust/generated/native-portable/${scope}/${stem}.lino`, `# GENERATED: checked portable-router-v1 bodies; no source envelopes.\n${meta}`],
        [`tools/translation/js-to-rust/generated/native-portable/${scope}/${stem}.rs.txt`, `${header}${emitRust(decoded)}`],
        [`packages/typescript/native/portable-draft/${scope}/${stem}.ts`, `${header}export {};\n${emitTypeScript(decoded,{outputPath:`packages/typescript/native/portable-draft/${scope}/${stem}.ts`})}`],
      ]) {
        if (artifacts.has(outputPath)) throw new Error(`duplicate native portable output: ${outputPath}`);
        artifacts.set(outputPath, content);
        outputs.push({ path: outputPath, bytes: Buffer.byteLength(content), sha256: hash(content), scope, definitions: decoded.length });
      }
    }
    modules.push({ path, bytes: Buffer.byteLength(source), sha256: hash(source), topLevel,
      scopedFunctions: { complete: true, sourceItems: scoped.sourceItems, translatedItems: scoped.translatedItems,
        fullDomainTranslatedItems: scoped.fullDomainTranslatedItems, conditionalPrivateBodyDraftItems: scoped.conditionalPrivateBodyDraftItems,
        unsupportedItems: scoped.unsupportedItems, items: scoped.items, diagnostics: scoped.diagnostics }, outputs });
  }
  const totals = (field) => modules.reduce((sum, module) => {
    const census = module[field];
    return { sourceItems: sum.sourceItems + census.sourceItems, translatedItems: sum.translatedItems + census.translatedItems,
      unsupportedItems: sum.unsupportedItems + census.unsupportedItems,
        fullDomainTranslatedItems: sum.fullDomainTranslatedItems + census.fullDomainTranslatedItems,
        conditionalPrivateBodyDraftItems: sum.conditionalPrivateBodyDraftItems + census.conditionalPrivateBodyDraftItems };
  }, { sourceItems: 0, translatedItems: 0, unsupportedItems: 0, fullDomainTranslatedItems: 0, conditionalPrivateBodyDraftItems: 0 });
  const manifest = { schema: 'native-portable-body-draft-v1', fragment: 'portable-router-v1',
    contract: { wholeNativeImplementationTranslated: false, runtimeParity: false, rustCompiled: false,
      topLevel: 'Original top-level source items; partial module admission does not admit its refused owners. Source-bound owned-iteration bodies retain explicit conditionalCalls standard-intrinsic obligations. Imported Error construction retains conditionalConstructors; external constructor/global Error/prototype lookup stability remains unproved and Rust exposes only normal/throw projections. Conditional drafts have separate counts.',
      scopedFunctions: 'Additional ArrowFunction, FunctionExpression and FunctionDeclaration bodies, excluding top-level declarations and initializer forms already counted at top level, and excluding method/accessor bodies themselves; privately source-checked lexical environments retain their closed capture contracts. Full-domain helpers and explicitly conditional private producer/captured-container body drafts have separate counts. Conditional drafts require unchanged standard producer/callback/collection intrinsics, with producer effects and lookup stability unproved; parents and public/unqualified callers remain refused.',
      meta: 'Both targets consume the serialized and independently checked meta-language program.',
      targets: 'TypeScript preserves the declared checked fragment; Rust uses explicit payload and host-qualified projections.' },
    topLevel: totals('topLevel'), scopedFunctions: totals('scopedFunctions'), modules };
  artifacts.set('parity/js-native-portable-draft.json', json(manifest));
  const result={artifacts,manifest};
  if(analysisIndex!==corpus.analyses.length)throw Error('corpus ordinary analysis count differs');
  assertPrivateParserExecution();snapshot.requireCurrent();return result;
}
