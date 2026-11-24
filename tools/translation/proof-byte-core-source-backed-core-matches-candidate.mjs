// Generated from complete actual vector and formatting corpus producers.

import {itemConfiguration} from './cfg-profile.mjs';
// Generated complete original formatting producers; prepare-source-backed-formatting.mjs owns this file.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {rustTokens,sourceItems} from './rust-structure.mjs';
import {macroProvenance} from './macro-provenance.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {crateModuleSourcePath} from './repository-layout.mjs';
import {resolve,join,dirname,basename,posix} from 'node:path';
import {resolveModuleGraph} from './project.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from './router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-primitives.mjs';
import {createSourceBackedFormattingInspection} from "./proof-byte-core-source-backed-formatting-support-candidate.mjs";

const hash=source=>createHash('sha256').update(source).digest('hex');
const fail=message=>{throw new TypeError('Core formatting migration: '+message);};




const identifiers = token => token?.type === 'ident' && /^[A-Za-z_][A-Za-z0-9_]*!?$/u.test(token.text);
function migrateOriginalProducerMatches(source, {rootSource = '', macroUseSources = {}, compilationProfile = PRODUCTION_PROFILE, inspection} = {}) {
  const scope = captureOwnedMatchesAdoptionBinding(inspection.source, {rootSource: inspection.rootSource, macroUseSources: inspection.macroUseSources, macroName: "matches"});
  const before = transportConcreteSyntaxSource(source, {language: 'Rust'}), edits = [], functions = [], skipped = [];
  const declarations = sourceItems(source);
  for (const item of declarations) {
    if (!inspection.inactiveItemSpans.some(span => item.start >= span[0] && item.end <= span[1]) && item.term === 'opaque' && item.tokens.some(token => token.text === '!' || token.text.endsWith('!'))) fail('unresolved module-level macro producer');
  }
  for (const item of declarations) {
    if (item.term !== 'fn' || inspection.inactiveItemSpans.some(span => item.start >= span[0] && item.end <= span[1])) continue;
    const tokens = item.tokens.filter(token => token.type !== 'comment');
    const candidates = tokens.map((token, at) => ({token, at})).filter(({token, at}) =>
      (token.text === "matches!" || token.text === "matches" && tokens[at + 1]?.text === '!') && !['::', '.', '#'].includes(tokens[at - 1]?.text));
    if (!candidates.length) continue;
    if (!literalMatchesFunctionHeader(tokens) || candidates.some(({at}) => !literalMatchesInput(tokens, at))) { skipped.push({name: item.name, reason: 'requires a scalar-input boolean function and literal scalar patterns at every selected call', span: [item.start, item.end]}); continue; }
    const condition = itemConfiguration(item.tokens, compilationProfile);
    if (condition.status !== 'active') { skipped.push({name: item.name, reason: 'function compilation condition is not active', span: [item.start, item.end]}); continue; }
    // An unknown expression/statement macro or local item can emit a competing
    // textual macro in this function. Keep the complete original function.
    const fn = tokens.findIndex(token => token.text === 'fn');
    let open = -1, parameters = 0;
    for (let at = fn + 2; at < tokens.length; at++) {
      if (tokens[at].text === '(') parameters++; if (tokens[at].text === ')') parameters--;
      if (!parameters && tokens[at].text === '{') { open = at; break; }
    }
    const uncertain = tokens.slice(open + 1).some((token, index, body) =>
      ['#', 'use', 'extern', 'fn', 'mod', 'struct', 'enum', 'union', 'trait', 'impl', 'type', 'macro_rules!', 'macro'].includes(token.text) ||
      token.text !== '!' && token.text.endsWith('!') && token.text !== "matches!" ||
      token.text === '!' && identifiers(body[index - 1]) && body[index - 1].text !== "matches" && ['(', '[', '{'].includes(body[index + 1]?.text));
    if (open < 0 || uncertain || ownedMatchesFunctionBarriers(tokens, open, "matches").length) { skipped.push({name: item.name, reason: 'local item or other macro producer requires original owner closure', span: [item.start, item.end]}); continue; }
    const selected = candidates.map(({token, at}) => {
      // Preserve every byte of whitespace/comments between name and bang.
      return {span: [token.start, token.end], expected: source.slice(token.start, token.end), replacement: 'crate::translation_core::' + token.text};
    });
    edits.push(...selected); functions.push({name: item.name, span: [item.start, item.end], macroCalls: selected.length});
  }
  edits.sort((a, b) => a.span[0] - b.span[0]);
  const applied = applyConcreteSyntaxSubstitutions(before.document, {
    languageRules: [{id: "matches-adoption:retain-complete-expression-source", edits: []}],
    repositoryRules: [{id: "router-core:adopt-owned-literal-matches", edits}],
  });
  const after = transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value)), mapping = [];
  let old = 0, current = 0;
  for (const edit of edits) {
    if (old < edit.span[0]) { const length = edit.span[0] - old; mapping.push({kind: 'unchanged', before: [old, edit.span[0]], after: [current, current + length]}); current += length; }
    mapping.push({kind: 'substitution', before: edit.span, after: [current, current + edit.replacement.length], expected: edit.expected, replacement: edit.replacement});
    old = edit.span[1]; current += edit.replacement.length;
  }
  if (old < source.length) mapping.push({kind: 'unchanged', before: [old, source.length], after: [current, current + source.length - old]});
  const inverse = applyConcreteSyntaxSubstitutions(applied.value, {languageRules: [], repositoryRules: [{id: "router-core:restore-original-literal-matches-source", edits: [{span: [0, after.source.length], expected: after.source, replacement: source}]}]});
  if (transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source !== source) fail('complete source inverse differs');
  return {schema: "owned-literal-matches-source-adoption-v1", before: {source, meta: before.meta, sha256: hash(source)},
    after: {source: after.source, meta: after.meta, sha256: hash(after.source)}, inverse: source, rootSource, scope,
    functions, skipped, edits, mapping, trace: applied.trace, executableAdmission: false,
    migrationSemantics: "explicit-owned-API-adoption; original standard matches ownership/implementation is not an executable verdict",
    libraryImplementation: "untranslated-rust-std-matches"};
}
const samePath=(left,right)=>left.length===right.length&&left.every((word,index)=>word===right[index]);
function inputFiles(files){
  if(!files||typeof files!=='object'||types.isProxy(files)||Array.isArray(files)||![null,Object.prototype].includes(Object.getPrototypeOf(files)))fail('complete own source map required');
  const keys=Reflect.ownKeys(files);if(keys.length>4096)fail('source file count exceeded');
  const result=Object.create(null);let size=0;
  for(const path of keys){
    if(typeof path!=='string'||!path.endsWith('.rs')||path.length>4096||path.includes('\\')||/[\x00-\x1f:]/u.test(path)||posix.isAbsolute(path)||posix.normalize(path)!==path||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('canonical relative Rust source path required');
    const row=Object.getOwnPropertyDescriptor(files,path);if(!row||!Object.hasOwn(row,'value')||typeof row.value!=='string'||row.value.length>2_000_000)fail('source rows require bounded primitive strings');
    size+=row.value.length;if(size>32*1024*1024)fail('complete source corpus budget exceeded');result[path]=row.value;
  }
  return result;
}
function context(module,graph){
  const ancestors=[];
  for(let depth=0;depth<module.path.length;depth++){
    const found=graph.modules.filter(candidate=>samePath(candidate.path,module.path.slice(0,depth)));
    if(found.length!==1||found[0].configurationCondition!=='active')fail('ancestor origin or configuration is ambiguous');
    ancestors.push(found[0]);
  }
  const sources=[],seen=new Set(),macroUseSources=Object.create(null),macroUseOrigins=[];
  for(const ancestor of ancestors){
    if(!seen.has(ancestor.file)){sources.push({path:ancestor.file,source:ancestor.source,sha256:hash(ancestor.source)});seen.add(ancestor.file);}
    for(const item of originalSourceModuleItems(ancestor))if(item.term==='mod'&&item.tokens.some(token=>token.text==='macro_use')){
      const children=graph.modules.filter(candidate=>samePath(candidate.path,[...ancestor.path,item.name]));
      if(children.length!==1||children[0].configurationCondition!=='active')fail('parent macro_use has no unique active complete source');
      const child=children[0];
      if(Object.hasOwn(macroUseSources,item.name)&&macroUseSources[item.name]!==child.source)fail('same-name parent macro imports have different source origins');
      macroUseSources[item.name]=child.source;macroUseOrigins.push({name:item.name,path:child.file,module:[...child.path],source:child.source,sha256:hash(child.source)});
    }
  }
  return {ancestors:sources,macroUseOrigins,rootSource:sources.map(row=>row.source).join('\n'),macroUseSources};
}
export function proposeSourceBackedCoreLiteralMatchesCorpus({entry='src/lib.rs',files,compilationProfile=PRODUCTION_PROFILE,dependencyInputs}={}){
  const original=inputFiles(files);if(typeof entry!=='string'||!Object.hasOwn(original,entry))fail('actual tracked entry source required');
  const paths=Object.keys(original).sort(),graph=resolveModuleGraph({entry,paths,readSource:path=>original[path],compilationProfile}),rows=[],inspection=createSourceBackedFormattingInspection(graph,dependencyInputs);
  const roots=graph.modules.filter(module=>module.path.length===0),cores=graph.modules.filter(module=>samePath(module.path,['translation_core'])),leaves=graph.modules.filter(module=>samePath(module.path,['translation_core','primitives']));
  if(roots.length!==1||cores.length!==1||leaves.length!==1||cores[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core.rs')||cores[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaves[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core/primitives.rs')||leaves[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||cores[0].configurationCondition!=='active'||leaves[0].configurationCondition!=='active')fail('actual complete owned facade and primitive leaf must be present before corpus adoption');
  const declarations=originalSourceModuleItems(roots[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');
  if(declarations.length!==1||roots[0].source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_core;')fail('actual unadorned public core declaration required');
  if(originalSourceModuleItems(roots[0]).some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_core')))fail('competing root core alias is unsupported');
  for(const path of paths){
    // Inline views are retained by the graph, but the existing per-file rule
    // selects only free functions in the physical module's top-level body.
    const origins=graph.modules.filter(module=>module.file===path&&module.sourceView?.modulePath.length===0),originFacts=origins.map(module=>({module:[...module.path],condition:module.configurationCondition,sourceViewDigest:module.sourceView.digest}));
    if(origins.length!==1){rows.push({path,status:'skipped',reason:origins.length?'multiple physical module origins':'not in the actual entry module graph',origins:originFacts});continue;}
    const module=origins[0];
    if(module.configurationCondition!=='active'){rows.push({path,status:'skipped',reason:'module configuration is not active',origins:originFacts});continue;}
    const candidates=originalSourceModuleItems(module).filter(item=>item.term==='fn').some(item=>{
      const tokens=item.tokens.filter(token=>token.type!=='comment');
      return tokens.some((token,index)=>(token.text==="matches!"||token.text==="matches"&&tokens[index+1]?.text==='!')&&!['::','#'].includes(tokens[index-1]?.text));
    });
    if(!candidates){rows.push({path,status:'unchanged',reason:"no bare matches macro in the supported top-level function domain",origins:originFacts});continue;}
    let scope,proposal;
    try{scope=context(module,graph);proposal=migrateOriginalProducerMatches(original[path],{rootSource:scope.rootSource,macroUseSources:scope.macroUseSources,compilationProfile:graph.compilationProfile,inspection:inspection.forModule(path,scope)});}
    catch(error){if(!(error instanceof TypeError))throw error;rows.push({path,status:'skipped',reason:error.message,origins:originFacts,...(scope?{scope}:{} )});continue;}
    if(proposal.before.source!==original[path])fail('complete original source association changed');
    rows.push({path,status:proposal.edits.length?'proposed':'unchanged',origins:originFacts,scope,proposal,
      untouchedInlineModules:graph.modules.filter(candidate=>candidate.file===path&&candidate.sourceView?.modulePath.length).map(candidate=>({module:[...candidate.path],bodySpan:candidate.sourceView.bodySpan,reason:'inline module function traversal is outside this initial per-file rule'}))});
  }
  const inputs=paths.map(path=>({path,source:original[path],sha256:hash(original[path])})),summary={files:paths.length,proposed:rows.filter(row=>row.status==='proposed').length,unchanged:rows.filter(row=>row.status==='unchanged').length,skipped:rows.filter(row=>row.status==='skipped').length,selectedFunctions:rows.reduce((total,row)=>total+(row.proposal?.functions.length??0),0)};
  return {schema:"router-owned-source-backed-matches-corpus-proposal-v1",...inspection.finish(),entry,compilationProfile:graph.compilationProfile,inputs,rows,summary,moduleEdges:graph.edges,moduleDiagnostics:graph.diagnostics,
    semanticAdmission:false,migrationSemantics:'maintainer-authorized source adoption; all checked source/meta/target obligations remain',libraryImplementation:"untranslated-rust-std-matches"};
}

const attributeNames=new Set(['doc','must_use','cfg','allow','warn','deny','forbid','inline','cold','test']);
function attributes(tokens,{macroUse=false}={}){
  for(let at=0;at<tokens.length;at++)if(tokens[at].text==='#'&&(tokens[at+1]?.text==='['||tokens[at+1]?.text==='!')){
    const open=at+(tokens[at+1].text==='!'?2:1),name=tokens[open+1]?.text;
    if(!attributeNames.has(name)&&!(macroUse&&name==='macro_use'))fail('unknown attribute producer '+name);
    let depth=1;at=open+1;for(;at<tokens.length&&depth;at++){if(tokens[at].text==='[')depth++;if(tokens[at].text===']')depth--;}
    if(depth)fail('unclosed attribute');at--;
  }
}
function sourceMap(value){
  if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![null,Object.prototype].includes(Object.getPrototypeOf(value)))fail('macro sources require own primitive data');
  const result=Object.create(null),keys=Reflect.ownKeys(value);let size=0;
  if(keys.length>64)fail('too many imported macro source modules');
  for(const key of keys){
    if(typeof key!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key))fail('invalid macro module name');
    const row=Object.getOwnPropertyDescriptor(value,key);if(!row||!Object.hasOwn(row,'value')||typeof row.value!=='string')fail('macro sources require own primitive data');size+=row.value.length;if(size>2_000_000)fail('imported macro source budget exceeded');result[key]=row.value;
  }
  return result;
}
function binding(source,rootSource,macroSources,macroName='format'){
  attributes(rustTokens(source));
  const evidence=macroProvenance(source);
  if(evidence.unresolvedImportScope||evidence.shadowedNames.includes(macroName)||evidence.importedNames.includes(macroName))fail(macroName+' binding is ambiguous in the complete module');
  // A textual macro_use parent is resolved from its actual complete source.
  // Unknown producer attributes/globs remain refusals instead of a spelling grant.
  let root=rootSource;
  const imports=[];
  for(const item of sourceItems(rootSource)){
    const tokens=item.tokens.filter(token=>token.type!=='comment');attributes(tokens,{macroUse:true});
    if(tokens.some(token=>token.text==='macro_use')){
      if(tokens.map(token=>token.text).join('')!=='#[macro_use]mod'+item.name+';'||!Object.hasOwn(macroSources,item.name))fail('unresolved parent macro_use producer');
      const original=macroSources[item.name],facts=macroProvenance(original);attributes(rustTokens(original));
      if(facts.unresolvedImportScope||facts.shadowedNames.includes(macroName)||facts.importedNames.includes(macroName))fail('parent imports a competing '+macroName+' macro');
      for(const producer of sourceItems(original))if(!['comment','macro_rules!','fn','struct','impl','use','type','enum','const','static'].includes(producer.term))fail('unknown imported macro producer');
      imports.push({name:item.name,source:original,sha256:hash(original)});
      root=root.slice(0,item.start)+' '.repeat(item.end-item.start)+root.slice(item.end);
    }else if(item.term==='opaque'&&tokens.some(token=>token.text==='!'||token.text.endsWith('!')))fail('unknown parent macro producer');
  }
  const parent=macroProvenance(root);
  if(parent.unresolvedImportScope||parent.shadowedNames.includes(macroName)||parent.importedNames.includes(macroName))fail('parent '+macroName+' binding is ambiguous');
  return {module:evidence,parent,imports};
}
function captureOwnedMatchesAdoptionBinding(source,{rootSource='',macroUseSources={},macroName='format'}={}){
  if(typeof source!=='string'||typeof rootSource!=='string'||source.length>2_000_000||rootSource.length>2_000_000||macroName !== 'matches')fail('bounded complete source and supported macro family required');
  return binding(source,rootSource,sourceMap(macroUseSources),macroName);
}
function ownedMatchesFunctionBarriers(tokens, bodyStart, family) {
  if (!Array.isArray(tokens) || !Number.isSafeInteger(bodyStart) || bodyStart < 0 ||
      bodyStart >= tokens.length || family !== 'matches') {
    throw new TypeError('Complete function tokens, body boundary and macro family required');
  }
  const barriers = [];
  const identifier = token => token?.type === 'ident' && /^(?:\p{ID_Start}|_)\p{ID_Continue}*$/u.test(token.text);
  for (let at = bodyStart + 1; at < tokens.length; at++) {
    const token = tokens[at];
    if (['comment', 'string', 'char'].includes(token.type)) continue;
    if (['#', 'use', 'extern', 'mod', 'macro', 'macro_rules!'].includes(token.text)) {
      barriers.push({kind: 'unclosed-local-source-producer', name: token.text, span: [token.start, token.end]});
      continue;
    }
    const combined = token.text.endsWith('!') && identifier({...token, text: token.text.slice(0, -1)});
    const separated = identifier(token) && tokens[at + 1]?.text === '!' &&
      ['(', '[', '{'].includes(tokens[at + 2]?.text);
    if (!combined && !separated) continue;
    const name = combined ? token.text.slice(0, -1) : token.text;
    const owned = at >= 4 && tokens.slice(at - 4, at).map(part => part.text).join('') === 'crate::translation_core::';
    if (name !== family || tokens[at - 1]?.text === '::' && !owned) {
      barriers.push({kind: 'unclosed-body-macro', name, span: [token.start, combined ? token.end : tokens[at + 1].end]});
    }
  }
  return barriers;
}

function literalMatchesFunctionHeader(tokens) {
  const fn = tokens.findIndex(token => token.text === 'fn');
  if (fn < 0 || tokens.slice(0, fn).some(token => ['async', 'unsafe', 'const', 'extern'].includes(token.text)) || tokens[fn + 2]?.text !== '(') return false;
  const scalar = new Set(['bool', 'i8', 'u8', 'i16', 'u16', 'i32', 'u32', 'i64', 'u64', 'i128', 'u128']);
  let at = fn + 3;
  while (tokens[at]?.text !== ')') {
    if (tokens[at]?.type !== 'ident' || tokens[at + 1]?.text !== ':') return false;
    at += 2;
    if (scalar.has(tokens[at]?.text)) at++;
    else {
      const borrowed = ['&', 'crate', '::', 'translation_core', '::', 'Str'];
      if (!borrowed.every((word, index) => tokens[at + index]?.text === word)) return false;
      at += borrowed.length;
    }
    if (tokens[at]?.text !== ')') { if (tokens[at++]?.text !== ',') return false; }
    if (at >= tokens.length) return false;
  }
  return tokens[at + 1]?.text === '->' && tokens[at + 2]?.text === 'bool' && tokens[at + 3]?.text === '{';
}
function literalMatchesInput(tokens, at) {
  const open = at + (tokens[at].text === 'matches!' ? 1 : 2), pairs = {'(': ')', '[': ']', '{': '}'};
  if (!Object.hasOwn(pairs, tokens[open]?.text)) return false;
  const stack = [pairs[tokens[open].text]]; let comma = -1, end = -1;
  for (let index = open + 1; index < tokens.length; index++) {
    const token = tokens[index];
    if (token.type === 'string' || token.type === 'char') continue;
    if (Object.hasOwn(pairs, token.text)) stack.push(pairs[token.text]);
    else if ([')', ']', '}'].includes(token.text)) { if (stack.pop() !== token.text) return false; if (!stack.length) { end = index; break; } }
    else if (token.text === ',' && stack.length === 1 && comma < 0) comma = index;
  }
  if (comma <= open + 1 || end < 0) return false;
  let index = comma + 1, alternatives = 0;
  if (tokens[index]?.text === '|') index++;
  while (index < end) {
    const negative = tokens[index]?.text === '-'; if (negative) index++;
    const token = tokens[index++];
    if (!token || negative && token.type !== 'number' || !(token.type === 'string' || token.type === 'number' && /^[0-9][0-9_A-Za-z]*$/u.test(token.text) || ['true', 'false'].includes(token.text))) return false;
    if (++alternatives > 256) return false;
    if (index === end || tokens[index]?.text === ',' && index + 1 === end) return true;
    if (tokens[index++]?.text !== '|') return false;
  }
  return false;
}
