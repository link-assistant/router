// JavaScript -> concrete syntax meta -> checked Links IR -> Rust / TypeScript.
// Frontend/checker adapted from the pinned public-domain formal-ai translator;
// see provenance.json. Unsupported source is reported, never put in envelopes.
import { lex, topLevelItems } from './vendor/lexer.mjs';
import { parseJavaScriptItem } from './vendor/frontends.mjs';
import { check, signatures, toLino, fromLino, FRAGMENT } from './vendor/ir.mjs';
import { isRefusal } from './vendor/constructs.mjs';
import { emitRust, emitTypeScript } from './targets.mjs';
import { parseLinks } from './vendor/lino.mjs';
import { splitConstantItems } from './vendor/constants.mjs';
import { shadowedBuiltins } from './vendor/builtin-ownership.mjs';
import { tableOwnership } from './vendor/static-tables.mjs';
import { privateErrorContracts } from './vendor/private-contracts.mjs';
import { jsonResponseOwnership } from './vendor/json-responses.mjs';
import {callbackInputsFor} from './vendor/callback-inputs.mjs';
import { discoverScopedHelpers,collectScopedWrapperSources } from './vendor/scoped-helpers.mjs';
import {createSourceCallIssuer,issueTopLevelSourceCallsFrom,lowerSourceCalls} from './vendor/source-calls.mjs';
import {issueOriginalConstructorBody,lowerOriginalConstructorBody,sourceConstructorItem,assertOriginalConstructorGraph} from './vendor/constructor-bodies.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
import {prepareReverseConcreteSource,parseReverseConcreteSource,prepareReverseConcreteSources,assertReverseConcreteSourceHost} from './concrete-source.mjs';
import {ownershipCompiler} from './vendor/module-syntax.mjs';
import {assertPrivateParserExecution} from '../private-parser-execution.mjs';

export class TranslationError extends Error {
  constructor(diagnostic) {
    super(`${diagnostic.kind}: ${diagnostic.message}`);
    this.name = 'TranslationError';
    this.diagnostic = diagnostic;
  }
}

const diagnostic = (error, item, source) => ({
  kind: error.slug ?? 'syntax',
  message: error.message,
  span: { start: item.start, end: item.end, encoding: 'utf16' },
  example: source.slice(item.start, item.end).split('\n').map((line) => line.trim()).filter(Boolean).join(' ').slice(0, 180),
});

function returns(body) {
  return body.some((statement) => ['return','throw'].includes(statement.kind) || statement.kind === 'if' && statement.else !== null && returns(statement.then) && returns(statement.else));
}

// Resolve the original four analysis options before any added source work.
// Later emission options still read the caller at their original phases.
function readAnalysisOptions({includeScoped=true,sourcePath=null,lossless=false,constructorGraph}={}){
  return {includeScoped,sourcePath,lossless,constructorGraph};
}
/** Discover source items only after consuming the concrete meta roundtrip. */
export function analyzeJavaScript(source,options) {
  const resolved=readAnalysisOptions(options);
  return analyzeReconstructedSource(prepareReverseConcreteSource(source),resolved);
}
function analyzeReconstructedSource(stage,options,scopedAnalyze=analyzeJavaScript){
  const source=stage.source;
  // Lexical CST classification is neither a grammar success nor a refusal.
  // The installed native parser still decides complete JS syntax and ASI.
  // Loading failures are environment failures, not source-syntax diagnostics.
  // Allocate a fresh source file here; the existing ownership AST cache is not
  // a grammar verdict or a new source/owner capability for this entry.
  const ts=ownershipCompiler(),file=ts.createSourceFile('reverse-input.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length){const error={message:'invalid authoritative JavaScript syntax: '+ts.flattenDiagnosticMessageText(file.parseDiagnostics[0].messageText,'\n')};return {fragment:FRAGMENT,program:[],items:[],diagnostics:[diagnostic(error,{start:0,end:source.length},source)]};}
  // TypeScript's AST also represents declaration signatures with no body.
  // They are not executable JavaScript, even when parseDiagnostics is empty.
  const bodyless=(function find(node){
    if(ts.isFunctionDeclaration(node)&&node.body===undefined)return node;
    return ts.forEachChild(node,find);
  })(file);
  if(bodyless){const error={message:'invalid authoritative JavaScript syntax: function declaration requires a body'};return {fragment:FRAGMENT,program:[],items:[],diagnostics:[diagnostic(error,{start:bodyless.getStart(file),end:bodyless.end},source)]};}
  return analyzeJavaScriptSource(source,options,scopedAnalyze);
}
function analyzeJavaScriptSource(source,{includeScoped=true,sourcePath=null,lossless=false,constructorGraph}={},scopedAnalyze=analyzeJavaScript) {
  let raw,tokens;
  try {
    tokens=lex(source,'JavaScript');
    raw = topLevelItems(tokens).flatMap(splitConstantItems);
  } catch (error) {
    return { fragment: FRAGMENT, program: [], items: [], diagnostics: [diagnostic(error, { start: 0, end: source.length }, source)] };
  }
  const items = [];
  const callbackInputs=callbackInputsFor(source);
  const shadowed = shadowedBuiltins(raw);
  const tables=tableOwnership(tokens,raw,shadowed,source);
  const errors=privateErrorContracts(source);
  const responses=jsonResponseOwnership(source);
  let doc = '';
  let sourceCallIssuer;
  for (const item of raw) {
    if (item.comment) {
      doc += `${item.tokens[0].text}\n`;
      continue;
    }
    const row = { start: item.start, end: item.end, status: 'unsupported' };
    try {
      row.parsed = parseJavaScriptItem(item.tokens, doc, { shadowedBuiltins: shadowed,readOnlyTables:tables,errorContracts:errors,jsonResponses:responses,callbackInputs,source });
      if(lossless&&row.parsed.kind==='function')row.parsed.lossless=true;
      if (row.parsed.kind === 'function' && !returns(row.parsed.body)) {
        throw Object.assign(new Error('a path ends without a return'), { slug: 'missing-return' });
      }
      row.name = row.parsed.name;
      row.status = 'parsed';
    } catch (error) {
      if (!isRefusal(error) && !error.slug) throw error;
      row.diagnostic = diagnostic(error, item, source);
      if(constructorGraph&&item.tokens.some(token=>token.text==='throw')&&item.tokens.some(token=>token.text==='new'))try {
        const checked=lowerOriginalConstructorBody(issueOriginalConstructorBody(constructorGraph,sourcePath,item.start,item.end));
        row.parsed=checked;row.name=checked.name;row.status='parsed';row.coverageContract='conditional-original-constructor-body-draft';delete row.diagnostic;
      }catch{ /* original source refusal remains authoritative */ }
      // This fallback checks the complete original owner and every callable
      // creation/use; isolated child admission never promotes its parent.
      if(row.status!=='parsed')try {
        if(error.slug==='async'||!item.tokens.some(token=>token.text==='=>'))throw error;
        sourceCallIssuer??=createSourceCallIssuer(source,sourcePath);
        const checked=lowerSourceCalls(issueTopLevelSourceCallsFrom(sourceCallIssuer,item.start,item.end));row.parsed=checked;row.name=checked.name;row.status='parsed';row.coverageContract=checked.conditionalCalls?'conditional-original-body-draft':'full-domain-body';delete row.diagnostic;
      }catch{ /* retain the complete original unsupported diagnostic */ }
    }
    items.push(row);
    doc = '';
  }
  // Remove failed definitions before checking their dependants. A call to a
  // refused function cannot accidentally count as executable translation.
  let changed = true;
  while (changed) {
    changed = false;
    const candidates = items.filter((item) => ['parsed', 'translated'].includes(item.status));
    const names = new Set();
    const table = signatures(candidates.map((item) => item.parsed));
    for (const item of candidates) {
      try {
        if (names.has(item.name)) throw Object.assign(new Error(`duplicate definition ${item.name}`), { slug: 'name' });
        names.add(item.name);
        item.checked = check(item.parsed, table);
        table.set(item.name, item.checked);
        item.status = 'translated';
      } catch (error) {
        if (!isRefusal(error) && !error.slug) throw error;
        item.status = 'unsupported';
        item.diagnostic = diagnostic(error, item, source);
        changed = true;
      }
    }
    if(!changed) {
      const completed=signatures(candidates.map(item=>item.checked));
      for(const item of candidates)try{item.checked=check(item.checked,completed);}catch(error){if(!isRefusal(error)&&!error.slug)throw error;item.status='unsupported';item.diagnostic=diagnostic(error,item,source);changed=true;}
    }
  }
  const censusItems=items.map(({parsed,checked,...item})=>{if(item.status!=='translated')delete item.coverageContract;return item;});
  const scopedFunctions=includeScoped?discoverScopedHelpers(source,censusItems,scopedAnalyze,sourcePath):undefined;
  return {
    fragment: FRAGMENT,
    program: items.filter((item) => item.status === 'translated').map((item) => item.checked),
    items: censusItems,
    ...(scopedFunctions?{scopedFunctions}:{}),
    diagnostics: items.filter((item) => item.diagnostic).map((item) => item.diagnostic),
  };
}

/** Strict source translation; the checked semantic boundary remains mandatory. */
export function translateJavaScript(source,options) {
  return translateConcreteInput(source,options,false);
}

/** Independently translate the source reconstructed from canonical JS/TS CST. */
export function translateConcreteSyntaxMeta(text,options){
  return translateConcreteInput(text,options,true);
}
function translateConcreteInput(input,options,serialized){
  let stage,analysisOptions;const pipeline=createRulePipeline([
    {phase:'language',rules:[
      {id:'javascript:concrete-source',apply:value=>{analysisOptions=readAnalysisOptions(options);stage=serialized?parseReverseConcreteSource(value):prepareReverseConcreteSource(value);return stage;}},
      {id:'javascript:analyze',apply:input=>{
        const analyzed=analyzeReconstructedSource(input,analysisOptions);
        if(analyzed.diagnostics.length)throw new TranslationError({...analyzed.diagnostics[0],concreteSyntax:input.concreteSyntax});
        return analyzed;
      }},
      {id:'javascript:checked-meta-roundtrip',apply:analyzed=>{
        const meta=`${analyzed.program.map(toLino).join('\n')}\n`;
        // Both targets consume the serialized/reparsed semantic document.
        const program=parseMeta(meta,{constructorGraph:options?.constructorGraph});
        return {analyzed,meta,program};
      }},
      {id:'javascript:emit-targets',apply:({analyzed,meta,program})=>({analyzed,meta,rust:emitRust(program),typescript:emitTypeScript(program,{outputPath:options?.typescriptOutputPath})})},
    ]},
    {phase:'repository',rules:[{id:'javascript:package-artifacts',apply:({analyzed,meta,rust,typescript})=>({ ...analyzed,meta,rust,typescript,concreteSyntax:stage.concreteSyntax })}]},
  ]);
  return pipeline.run(input).value;
}

export function parseMeta(text,{constructorGraph}={}) {
  const links = parseLinks(text);
  if (links.some((link) => !['function', 'constant','closure'].includes(link[0]))) throw new Error('unsupported top-level meta-language link');
  const items = fromLino(text);
  if (JSON.stringify(links) !== JSON.stringify(parseLinks(items.map(toLino).join('\n')))) throw new Error('noncanonical or malformed meta-language fields');
  const names = new Set();
  for (const item of items) {
    if (names.has(item.name)) throw new Error(`duplicate meta-language definition ${item.name}`);
    names.add(item.name);
    if (['function','closure'].includes(item.kind) && !returns(item.body)) throw new Error(`meta-language function ${item.name} has a path without a return`);
  }
  const table = signatures(items);
  for(const item of items)if(sourceConstructorItem(item))assertOriginalConstructorGraph(item,constructorGraph);
  const checked=items.map(item=>check(item,table)),completed=signatures(checked);
  return checked.map(item=>check(item,completed));
}

export { emitRust, emitTypeScript };

/**
 * Explicit repository batch contract. Old analyzeJavaScript stays single-call.
 * The delegated rule runner retains its existing IteratorClose/reflection host
 * limitation; only the separate indexed raw batch claims its own hook guards.
 */
export function analyzeJavaScriptBatched(source,options){
  const resolved=readAnalysisOptions(options);assertPrivateParserExecution();assertReverseConcreteSourceHost();let live=true,plan,batch,analysis;
  const consume=(wrapper,attemptOptions)=>{
    const selected=readAnalysisOptions(attemptOptions);
    if(!live||!plan||!batch||typeof wrapper!=='string')throw Error('private same-call bulk stage unavailable');
    let occurrence=null;
    for(let at=0;at<plan.occurrences.length;at++){const row=plan.occurrences[at];if(row.source===wrapper){if(occurrence)throw Error('ambiguous bulk wrapper occurrence');occurrence=row;}}
    if(!occurrence||occurrence.language!=='JavaScript'||plan.source!==source||plan.sourcePath!==resolved.sourcePath)throw Error('original bulk wrapper association differs');
    const stage=batch.stages[occurrence.row];if(stage.source!==wrapper||stage.concreteSyntax.language!==occurrence.language)throw Error('bulk stage source/language differs');
    // Discovery/producer hashes can change the native host after CST batching.
    // Fidelity reuse never reuses a host epoch or an authoritative grammar.
    assertPrivateParserExecution();assertReverseConcreteSourceHost();const result=analyzeReconstructedSource(stage,selected);assertPrivateParserExecution();assertReverseConcreteSourceHost();
    if(!live||batch.stages[occurrence.row]!==stage||stage.source!==wrapper||stage.concreteSyntax.language!==occurrence.language||plan.source!==source||plan.sourcePath!==resolved.sourcePath)throw Error('bulk final wrapper association differs');
    assertReverseConcreteSourceHost();return result;
  };
  const pipeline=createRulePipeline([
    {phase:'language',rules:[
      {id:'native-bulk:plan-original-scoped-cst',apply:value=>{
        plan=collectScopedWrapperSources(value,resolved.sourcePath);return plan;
      }},
      {id:'native-bulk:checked-concrete-batch',apply:value=>{
        batch=prepareReverseConcreteSources(value.rows);if(batch.stages[0].source!==source)throw Error('bulk module reconstruction differs');return batch;
      }},
      {id:'native-bulk:fresh-authoritative-analysis',apply:value=>{
        assertPrivateParserExecution();assertReverseConcreteSourceHost();analysis=analyzeReconstructedSource(value.stages[0],resolved,consume);assertPrivateParserExecution();assertReverseConcreteSourceHost();return analysis;
      }},
    ]},
    {phase:'repository',rules:[{id:'native-bulk:package-source-analysis',apply:value=>({analysis:value,concreteSyntaxBatch:{schema:'native-portable-bulk-cst-v1',sourcePath:resolved.sourcePath,totals:batch.totals,occurrences:plan.occurrences.map(({row,start,end,kind,temporary,language})=>({row,start,end,kind,temporary,language})),authority:{type:false,owner:false,executable:false}}})}]},
  ]);
  try{const result=pipeline.run(source);assertPrivateParserExecution();assertReverseConcreteSourceHost();Object.defineProperty(result.value.concreteSyntaxBatch,'trace',{__proto__:null,value:result.trace,enumerable:true,writable:true,configurable:true});return result.value;}
  finally{live=false;plan=null;batch=null;analysis=null;}
}


import {prepareReverseConcreteSourceChunks} from './concrete-source.mjs';
import {captureNativeCorpusSources} from './native-corpus-sources.mjs';
/** New explicit corpus observer contract; every actual attempt is still fresh. */
export function analyzeJavaScriptCorpusBatched(input,options){
  const snapshot=captureNativeCorpusSources(input,options),sources=[...snapshot.sources].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  let live=true,plans=[],coordinates=[],chunks=[],batch=null,pool=[],analyses=[],currentModule=-1;
  function associated(globalRow,source,moduleIndex){
    const coordinate=coordinates[globalRow],stage=pool[globalRow],plan=plans[moduleIndex];
    if(!live||!coordinate||!stage||!plan||coordinate.module!==moduleIndex||coordinate.source!==source||coordinate.language!=='JavaScript'||stage.source!==source||stage.concreteSyntax.language!==coordinate.language||plan.source!==sources[moduleIndex].source||plan.sourcePath!==sources[moduleIndex].path)throw Error('private corpus source/occurrence association differs');
    return stage;
  }
  const consume=(wrapper,attemptOptions)=>{
    const resolved=readAnalysisOptions(attemptOptions),moduleIndex=currentModule,plan=plans[moduleIndex];
    if(!live||!plan||typeof wrapper!=='string')throw Error('private same-call corpus stage unavailable');
    let occurrence=null;
    for(let at=0;at<plan.occurrences.length;at++){const row=plan.occurrences[at];if(row.source===wrapper){if(occurrence)throw Error('ambiguous corpus wrapper occurrence');occurrence=row;}}
    if(!occurrence)throw Error('unplanned corpus wrapper occurrence');
    const globalRow=plan.globalStart+occurrence.row,stage=associated(globalRow,wrapper,moduleIndex);
    assertPrivateParserExecution();assertReverseConcreteSourceHost();const result=analyzeReconstructedSource(stage,resolved);assertPrivateParserExecution();assertReverseConcreteSourceHost();
    if(currentModule!==moduleIndex||plans[moduleIndex]!==plan||associated(globalRow,wrapper,moduleIndex)!==stage)throw Error('corpus final wrapper association differs');
    assertReverseConcreteSourceHost();return result;
  };
  const pipeline=createRulePipeline([
    {phase:'language',rules:[
      {id:'native-corpus:plan-original-scoped-cst',apply:()=>{
        let units=0;
        for(let mi=0;mi<sources.length;mi++){
          if(mi&&sources[mi-1].path===sources[mi].path)throw Error('duplicate corpus source path');
          assertPrivateParserExecution();assertReverseConcreteSourceHost();const row=sources[mi],plan=collectScopedWrapperSources(row.source,row.path);assertPrivateParserExecution();assertReverseConcreteSourceHost();
          plan.globalStart=coordinates.length;plans.push(plan);
          for(let at=0;at<plan.rows.length;at++){
            const value=plan.rows[at];units+=value.source.length;if(units>2097152||coordinates.length>=768)throw Error('corpus planned row/source budget');
            if(coordinates.length%256===0)chunks.push([]);chunks[chunks.length-1].push({source:value.source,language:value.language});
            coordinates.push({module:mi,row:at,source:value.source,language:value.language});
          }
        }
        return chunks;
      }},
      {id:'native-corpus:checked-concrete-chunks',apply:value=>{
        batch=prepareReverseConcreteSourceChunks(value);
        for(let ci=0;ci<batch.chunks.length;ci++){const chunk=batch.chunks[ci];for(let at=0;at<chunk.stages.length;at++)pool.push(chunk.stages[at]);}
        if(pool.length!==coordinates.length||batch.totals.rows!==pool.length)throw Error('corpus reconstructed row census differs');
        for(let at=0;at<pool.length;at++)associated(at,coordinates[at].source,coordinates[at].module);
        return batch;
      }},
      {id:'native-corpus:fresh-authoritative-analysis',apply:()=>{
        for(let mi=0;mi<sources.length;mi++){
          currentModule=mi;const row=sources[mi],plan=plans[mi],stage=associated(plan.globalStart,row.source,mi),resolved={includeScoped:true,sourcePath:row.path,lossless:false,constructorGraph:snapshot.constructorGraph};
          assertPrivateParserExecution();assertReverseConcreteSourceHost();const analysis=analyzeReconstructedSource(stage,resolved,consume);assertPrivateParserExecution();assertReverseConcreteSourceHost();
          if(currentModule!==mi||plans[mi]!==plan||associated(plan.globalStart,row.source,mi)!==stage)throw Error('corpus final module association differs');
          analyses.push({path:row.path,source:row.source,analysis});
        }
        currentModule=-1;return analyses;
      }},
    ]},
    {phase:'repository',rules:[{id:'native-corpus:package-source-analyses',apply:value=>({analyses:value,concreteSyntaxCorpus:{schema:'native-portable-corpus-cst-v1',totals:batch.totals,chunks:batch.chunks.map(chunk=>chunk.totals),modules:plans.map((plan,index)=>({path:sources[index].path,sourceSha256:plan.sourceSha256,namespace:plan.namespace,globalStart:plan.globalStart,rows:plan.rows.length,occurrences:plan.occurrences.map(({row,start,end,kind,temporary,language})=>({row,globalRow:plan.globalStart+row,start,end,kind,temporary,language}))})),authority:{type:false,owner:false,executable:false}}})}]},
  ]);
  try{
    const result=pipeline.run(undefined);assertPrivateParserExecution();assertReverseConcreteSourceHost();
    for(let at=0;at<coordinates.length;at++)associated(at,coordinates[at].source,coordinates[at].module);
    Object.defineProperty(result.value.concreteSyntaxCorpus,'trace',{__proto__:null,value:result.trace,enumerable:true,writable:true,configurable:true});
    snapshot.requireCurrent();return result.value;
  }finally{live=false;plans=null;coordinates=null;chunks=null;batch=null;pool=null;analyses=null;currentModule=-1;}
}
