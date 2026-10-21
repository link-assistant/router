import {composeCoreUnitMatches} from './prepare-core-unit-matches.mjs';
// Fixed source equations after the complete matches/vector owned-core facade.
// These copies and CST stages are DATA, never checked operand or owner permits.
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Owned ASCII source preparation: '+message);};
const RUST=`
/// Test every UTF-8 byte against an ASCII alphabet, including vacuous empty input.
/// Non-ASCII alphabet characters never permit a non-ASCII input byte.
/// Both arguments evaluate once, left to right; native iterator internals stay untranslated.
#[must_use]
pub fn ascii_chars_in(value: &Str, alphabet: &Str) -> bool {
    value.bytes().all(|byte| byte.is_ascii() && alphabet.as_bytes().contains(&byte))
}
`;
const RUNTIME=`
// Explicit owned ASCII membership; no generic iterator or coercion boundary.
export function router_core_ascii_chars_in(value, alphabet) {
  requireScalarString(value);
  requireScalarString(alphabet);
  for(let at=0;at<value.length;at++) {
    const byte=codeUnit(value,at);
    if(byte>127||!asciiIncludes(alphabet,slice(value,at,at+1)))return false;
  }
  return true;
}
`;
const CONTRACT=`
export const ROUTER_CORE_ASCII_CONTRACT=freeze({
  id:'router_core_ascii_chars_in',jsExport:'router_core_ascii_chars_in',
  rustPath:['crate','translation_core','ascii_chars_in'],kind:'function',family:'string-iterator',
  params:[SOURCE_STR,SOURCE_STR],ret:{kind:'bool'},async:false,pure:true,constEligible:false,
  requiresRefinement:'genuine-router-core-ascii-call',profile:'router-owned-ascii-chars-in-v1',
  assumptions:['Complete owned facade and primitives leaf select the exact qualified operation.',
    'Two checked borrowed scalar-text arguments evaluate once, left to right.',
    'Every input UTF-8 byte must be ASCII and occur in the alphabet; empty input is true.',
    'Non-ASCII alphabet characters do not admit non-ASCII input.',
    'Native iterators and Pattern dispatch remain intentionally untranslated.'],
});
`;
function originals(){
 const packed=readFileSync(new URL('./source-profiles/core-ascii/originals.json.gz',import.meta.url));
 if(packed.length!==38612||hash(packed)!=='1859ec1b0cf4939b71c39ddd288848cbe8353035078e85d4584944a48103d58a')fail('original archive changed');
 const raw=gunzipSync(packed,{maxOutputLength:300000});if(raw.length!==177299||hash(raw)!=='1ee80ce7dc47123f72e685ec7a09b8aa64d4442936c7ccae61cffff81655f62b')fail('complete originals changed');
 const packet=JSON.parse(raw.toString('utf8'));for(const row of packet.files)if(hash(row.source)!==row.sha256)fail('complete original source changed');return packet.files;
}
function replace(source,before,after){if(source.split(before).length!==2)fail('exact original source equation is not unique');return source.replace(before,()=>after);}
function afterSources(rows){
 const before=Object.fromEntries(rows.map(row=>[row.path,row.source])),after={...before};
 const facade='rust/src/translation_core.rs',leaf='rust/src/translation_core/primitives.rs',scalars='tools/translation/router-core-scalars.mjs',runtime='tools/translation/extensions/string-iterator-runtime.mjs',assets='tools/translation/host-assets.mjs',data='tools/translation/router-core-source-data.mjs';
 after[facade]=replace(before[facade],'pub use self::primitives::unicode_scalar_count;','pub use self::primitives::{unicode_scalar_count, ascii_chars_in};');
 after[leaf]=before[leaf]+RUST;
 after[runtime]=replace(before[runtime],"const slice=Function.call.bind(String.prototype.slice);","const slice=Function.call.bind(String.prototype.slice);\nconst asciiIncludes=Function.call.bind(String.prototype.includes);")+RUNTIME;
 let source=before[scalars];
 source=replace(source,'const calls=new WeakMap(),checkedCalls=new WeakMap();',CONTRACT+'const calls=new WeakMap(),checkedCalls=new WeakMap();');
 source=replace(source,"const c=parser.cursor,words=['crate','::','translation_core','::','unicode_scalar_count'];","const c=parser.cursor,ascii=c.is('ascii_chars_in',4),words=['crate','::','translation_core','::',ascii?'ascii_chars_in':'unicode_scalar_count'];");
 source=replace(source,'syntax:copyMetadata(node),trace:stage.trace','syntax:copyMetadata(node),trace:stage.trace,contract:ascii?ROUTER_CORE_ASCII_CONTRACT:ROUTER_CORE_SCALAR_CONTRACT');
 source=replace(source,'checker.hostCall([ROUTER_CORE_SCALAR_CONTRACT],','checker.hostCall([receipt.contract],');
 source=replace(source,"id:'router-owned-unicode-scalar-count-v1',symbol:'crate::translation_core::unicode_scalar_count'","id:receipt.contract.profile,symbol:receipt.contract.rustPath.join('::')");
 after[scalars]=source;
 const host='tools/translation/extensions/host-contracts.mjs';
 after[host]=replace(before[host],'captureRouterCoreScalarCalls,ROUTER_CORE_SCALAR_CONTRACT}','captureRouterCoreScalarCalls,ROUTER_CORE_SCALAR_CONTRACT,ROUTER_CORE_ASCII_CONTRACT}');
 after[host]=replace(after[host],'ROUTER_CORE_SCALAR_CONTRACT,ROUTER_CORE_RANGE_CONTRACT','ROUTER_CORE_SCALAR_CONTRACT,ROUTER_CORE_ASCII_CONTRACT,ROUTER_CORE_RANGE_CONTRACT');
 const declaration='export declare function router_core_unicode_scalar_count(value: string): bigint;\\n';
 if(before[assets].split(declaration).length!==3)fail('both complete runtime declarations required');
 after[assets]=before[assets].replaceAll(declaration,declaration+'export declare function router_core_ascii_chars_in(value: string, alphabet: string): boolean;\\n');
 for(const [name,path]of [['ROUTER_FORMATTING_FACADE',facade],['ROUTER_CORE_PRIMITIVES',leaf]])for(const suffix of ['SOURCE','SHA256']){
  const value=text=>suffix==='SOURCE'?text:hash(text),old='export const '+name+'_'+suffix+'='+JSON.stringify(value(before[path]))+';',next='export const '+name+'_'+suffix+'='+JSON.stringify(value(after[path]))+';';after[data]=replace(after[data],old,next);
 }
 return after;
}
function nativeCopy(ts,path,source){
 const parse=text=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs: '+path);return file;},file=parse(source),copies=file.statements.map(node=>ts.getSynthesizedDeepClone(node));
 const detach=node=>{ts.setTextRange(node,{pos:-1,end:-1});ts.setOriginalNode(node,undefined);ts.forEachChild(node,detach);};copies.forEach(detach);
 const copy=ts.createPrinter({newLine:ts.NewLineKind.LineFeed,removeComments:true}).printFile(ts.factory.updateSourceFile(file,copies));
 const shape=node=>{const children=[];ts.forEachChild(node,child=>{children.push(shape(child));});return [node.kind,ts.isIdentifier(node)?node.escapedText:ts.isLiteralExpression(node)?node.text:null,children];};
 if(JSON.stringify(shape(parse(copy)))!==JSON.stringify(shape(file)))fail('complete native AST copy differs');return {source,copy,completeNativeAstCopy:true};
}
function prepare(row,after,root,ts){
 const before=row.source,language=row.path.endsWith('.rs')?'Rust':'JavaScript',rule=(left,right,id)=>({id,edits:[{span:[0,left.length],expected:left,replacement:right}]}),stages=[];
 const first=transportConcreteSyntaxSource(before,{language}),beforeMeta=serializeConcreteSyntaxMeta(first.document);let document=transportConcreteSyntaxMeta(beforeMeta).document;
 for(const phase of ['language','repository']){
  const target=phase==='language'?before:after,wire=serializeConcreteSyntaxMeta(document),fresh=transportConcreteSyntaxMeta(wire);if(fresh.source!==before)fail('complete stage parent differs');
  const run=applyConcreteSyntaxSubstitutions(fresh.document,{languageRules:phase==='language'?[rule(before,before,'owned-ascii:retain-complete-inputs')]:[],repositoryRules:phase==='repository'?[rule(before,after,'router-core:explicit-ascii-membership')]:[]}),encoded=serializeConcreteSyntaxMeta(run.value),reparsed=transportConcreteSyntaxMeta(encoded);
  if(reparsed.source!==target)fail('complete source substitution differs');const undo=applyConcreteSyntaxSubstitutions(reparsed.document,{languageRules:phase==='language'?[rule(target,before,'owned-ascii:restore-language-input')]:[],repositoryRules:phase==='repository'?[rule(target,before,'router-core:restore-complete-before-ascii')]:[]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(undo.value)).source!==before)fail('complete inverse differs');stages.push({phase,before,after:target,beforeMeta:wire,afterMeta:encoded,trace:run.trace,completeInverse:true});document=reparsed.document;
 }
 let current=null;try{current=readFileSync(resolve(root,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 return {path:row.path,before,language:before,after,current,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta,afterMeta:serializeConcreteSyntaxMeta(document),inverse:before,stages,trace:stages.flatMap(stage=>stage.trace),nativeCopies:language==='JavaScript'?[nativeCopy(ts,row.path,before),nativeCopy(ts,row.path,after)]:[],completeNativeAstCopy:language==='JavaScript',sourceLanguage:language};
}
export function prepareCoreAsciiSources({root=ROOT}={}){const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');const rows=originals(),after=afterSources(rows);return {schema:'router-owned-ascii-sources-v1',typescriptVersion:ts.version,files:rows.map(row=>prepare(row,after[row.path],root,ts)),nativeRustExecuted:false,semanticAuthority:false};}
export function composeCoreAscii(prior,options={}){const plan=prepareCoreAsciiSources(options),sources={...prior};for(const row of plan.files){if(sources[row.path]&&sources[row.path].after!==row.before)fail('preceding complete source equation differs: '+row.path);sources[row.path]=row;}return {sources,layers:[plan],historicalSources:prior};}
export function prepareCurrentCoreAsciiSources(options={}){const birth=prepareCoreAsciiSources(options),unit=composeCoreUnitMatches(Object.fromEntries(birth.files.map(row=>[row.path,row])),options);return {schema:'current-owned-ascii-unit-source-v1',birth,layers:[birth,...unit.layers],files:Object.values(unit.sources),semanticAuthority:false};}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const args=process.argv.slice(2);if(args.length!==1||!['--check','--write'].includes(args[0]))fail('usage: --check|--write');const plan=prepareCurrentCoreAsciiSources();if(args[0]==='--write'){for(const row of plan.files){if(!plan.layers.flatMap(layer=>layer.files.filter(part=>part.path===row.path).flatMap(part=>[part.before,part.after])).includes(row.current))fail('physical complete parent differs: '+row.path);}for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);}else if(plan.files.some(row=>row.current!==row.after))fail('generated source is stale');console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>row.path),semanticAuthority:false}));}
