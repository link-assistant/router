// Additive owned Unicode operations, after the ASCII/matches/vector source layers.
// Original native Rust implementations and complete source equations are retained.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {unicodePredicateSourceArtifacts} from './unicode-predicates-source.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Owned Unicode source preparation: '+message);};
const RUST=`
/// Remove exactly Rust Unicode White_Space scalars, retaining all other scalars.
/// Native iterator and String collection internals remain untranslated.
#[must_use]
pub fn strip_unicode_whitespace(value: &Str) -> String {
    value.chars().filter(|ch| !ch.is_whitespace()).collect()
}

/// Detect Rust Unicode General_Category=Cc without exposing a char iterator.
#[must_use]
pub fn has_unicode_control(value: &Str) -> bool {
    value.chars().any(char::is_control)
}
`;
const RUNTIME=`
// Owned Unicode predicates: validate the complete scalar input before use.
export function router_core_strip_unicode_whitespace(value) {
  requireScalarString(value);
  let result='';
  for(let at=0;at<value.length;at++) {
    const unit=codeUnit(value,at);
    if(!isRustWhitespaceCodeUnit(unit))result+=slice(value,at,at+1);
  }
  return result;
}
export function router_core_has_unicode_control(value) {
  requireScalarString(value);
  for(let at=0;at<value.length;at++) {
    const unit=codeUnit(value,at);
    if(unit<=31||unit>=127&&unit<=159)return true;
  }
  return false;
}
`;
const CONTRACTS=`
export const ROUTER_CORE_UNICODE_PREDICATE_CONTRACTS=freeze([
  {id:'router_core_strip_unicode_whitespace',jsExport:'router_core_strip_unicode_whitespace',
   rustPath:['crate','translation_core','strip_unicode_whitespace'],kind:'function',family:'string-iterator',
   params:[SOURCE_STR],ret:SOURCE_STRING,async:false,pure:true,constEligible:false,
   requiresRefinement:'genuine-router-core-unicode-predicate-call',profile:'router-owned-strip-unicode-whitespace-v1',
   assumptions:['One checked borrowed scalar string evaluates once; output is fresh owned text.',
    'Use the pinned Rust White_Space property, not JavaScript trim or regular expressions.',
    'Retain non-whitespace scalars, including FEFF, combining marks, NUL and ZWJ.',
    'Native char iterator and collection implementations remain untranslated.']},
  {id:'router_core_has_unicode_control',jsExport:'router_core_has_unicode_control',
   rustPath:['crate','translation_core','has_unicode_control'],kind:'function',family:'string-iterator',
   params:[SOURCE_STR],ret:{kind:'bool'},async:false,pure:true,constEligible:false,
   requiresRefinement:'genuine-router-core-unicode-predicate-call',profile:'router-owned-has-unicode-control-v1',
   assumptions:['One checked borrowed scalar string evaluates once and is completely validated.',
    'The source-derived Rust Cc property contains exactly U+0000..001F and U+007F..009F.',
    'Native char iterator and predicate implementations remain untranslated.']},
]);
`;
const ORACLE=`// Independent native oracle; local Rust execution is prohibited for issue #759.
use link_assistant_router::translation_core::{has_unicode_control, strip_unicode_whitespace};

#[test]
fn unicode_predicate_boundaries() {
    let whitespace = [9_u32,10,11,12,13,32,133,160,5760,8192,8193,8194,8195,8196,
        8197,8198,8199,8200,8201,8202,8232,8233,8239,8287,12288];
    for scalar in 0..=0x10ffff {
        let Some(ch) = char::from_u32(scalar) else { continue };
        let value = ch.to_string();
        assert_eq!(has_unicode_control(&value), ch.is_control(), "control {scalar:x}");
        assert_eq!(has_unicode_control(&value), scalar <= 31 || (127..=159).contains(&scalar));
        let expected = if whitespace.contains(&scalar) { String::new() } else { value.clone() };
        assert_eq!(strip_unicode_whitespace(&value), expected, "whitespace {scalar:x}");
    }
    assert_eq!(strip_unicode_whitespace(" \\t猫😀e\\u{301}\\u{200d}\\0\\u{feff}\\n"), "猫😀e\\u{301}\\u{200d}\\0\\u{feff}");
    assert!(!has_unicode_control("😀e\\u{301}\\u{200d}\\u{feff}\\u{2028}"));
    assert!(has_unicode_control("before\\u{85}after"));
}
`;
function originals(){
 const packed=readFileSync(new URL('./source-profiles/core-unicode-predicates/originals.json.gz',import.meta.url));
 if(packed.length!==38722||hash(packed)!=='0f0f0680545ebd444146e5d2d888e8c923a8840581878670e517b67b58acae00')fail('original archive changed');
 const raw=gunzipSync(packed,{maxOutputLength:300000});if(raw.length!==180112||hash(raw)!=='3c7df0a94ef11b3b9bc837539a3846ca24933f64cbb843ab0d70aa9eacad4bbf')fail('complete originals changed');
 const packet=JSON.parse(raw.toString('utf8'));if(packet.files.length!==8||new Set(packet.files.map(row=>row.path)).size!==8)fail('complete original path set differs');
 for(const row of packet.files)if(hash(row.source)!==row.sha256)fail('complete original source changed');return packet.files;
}
function replace(source,before,after){if(source.split(before).length!==2)fail('exact original source equation is not unique');return source.replace(before,()=>after);}
function afterSources(rows){
 const before=Object.fromEntries(rows.map(row=>[row.path,row.source])),after={...before};
 const facade='rust/src/translation_core.rs',leaf='rust/src/translation_core/primitives.rs',scalars='tools/translation/router-core-scalars.mjs',runtime='tools/translation/extensions/string-iterator-runtime.mjs',assets='tools/translation/host-assets.mjs',data='tools/translation/router-core-source-data.mjs',host='tools/translation/extensions/host-contracts.mjs';
 // Preserve the historical scalar/ASCII export equation verbatim.
 after[facade]=replace(before[facade],'pub use self::primitives::{unicode_scalar_count, ascii_chars_in};','pub use self::primitives::{unicode_scalar_count, ascii_chars_in};\npub use self::primitives::{strip_unicode_whitespace, has_unicode_control};');
 after[leaf]=before[leaf]+RUST;after[runtime]=before[runtime]+RUNTIME;
 let source=replace(before[scalars],"import {SOURCE_STR}","import {SOURCE_STR,SOURCE_STRING}");
 source=replace(source,'const calls=new WeakMap(),checkedCalls=new WeakMap();',CONTRACTS+'const calls=new WeakMap(),checkedCalls=new WeakMap();');
 source=replace(source,"const c=parser.cursor,ascii=c.is('ascii_chars_in',4),words=['crate','::','translation_core','::',ascii?'ascii_chars_in':'unicode_scalar_count'];","const c=parser.cursor,unicode=ROUTER_CORE_UNICODE_PREDICATE_CONTRACTS.find(contract=>c.is(contract.rustPath[2],4)),ascii=c.is('ascii_chars_in',4),words=['crate','::','translation_core','::',unicode?unicode.rustPath[2]:ascii?'ascii_chars_in':'unicode_scalar_count'];");
 source=replace(source,'contract:ascii?ROUTER_CORE_ASCII_CONTRACT:ROUTER_CORE_SCALAR_CONTRACT','contract:unicode??(ascii?ROUTER_CORE_ASCII_CONTRACT:ROUTER_CORE_SCALAR_CONTRACT)');after[scalars]=source;
 after[host]=replace(before[host],'captureRouterCoreScalarCalls,ROUTER_CORE_SCALAR_CONTRACT,ROUTER_CORE_ASCII_CONTRACT}','captureRouterCoreScalarCalls,ROUTER_CORE_SCALAR_CONTRACT,ROUTER_CORE_ASCII_CONTRACT,ROUTER_CORE_UNICODE_PREDICATE_CONTRACTS}');
 after[host]=replace(after[host],'ROUTER_CORE_SCALAR_CONTRACT,ROUTER_CORE_ASCII_CONTRACT,ROUTER_CORE_RANGE_CONTRACT','ROUTER_CORE_SCALAR_CONTRACT,ROUTER_CORE_ASCII_CONTRACT,...ROUTER_CORE_UNICODE_PREDICATE_CONTRACTS,ROUTER_CORE_RANGE_CONTRACT');
 if(after[host].split('\n').length-1>999)fail('Host line bound');
 const declaration='export declare function router_core_ascii_chars_in(value: string, alphabet: string): boolean;\\n';
 if(before[assets].split(declaration).length!==3)fail('both complete runtime declarations required');
 after[assets]=before[assets].replaceAll(declaration,declaration+'export declare function router_core_strip_unicode_whitespace(value: string): string;\\nexport declare function router_core_has_unicode_control(value: string): boolean;\\n');
 for(const [name,path]of [['ROUTER_FORMATTING_FACADE',facade],['ROUTER_CORE_PRIMITIVES',leaf]])for(const suffix of ['SOURCE','SHA256']){
  const value=text=>suffix==='SOURCE'?text:hash(text),old='export const '+name+'_'+suffix+'='+JSON.stringify(value(before[path]))+';',next='export const '+name+'_'+suffix+'='+JSON.stringify(value(after[path]))+';';after[data]=replace(after[data],old,next);
 }
 after['rust/tests/translation_core_unicode_predicates_oracle.rs']=ORACLE;return after;
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
  const run=applyConcreteSyntaxSubstitutions(fresh.document,{languageRules:phase==='language'?[rule(before,before,'owned-unicode-predicates:retain-complete-inputs')]:[],repositoryRules:phase==='repository'?[rule(before,after,'router-core:explicit-unicode-predicates')]:[]}),encoded=serializeConcreteSyntaxMeta(run.value),reparsed=transportConcreteSyntaxMeta(encoded);
  if(reparsed.source!==target)fail('complete source substitution differs');const undo=applyConcreteSyntaxSubstitutions(reparsed.document,{languageRules:phase==='language'?[rule(target,before,'owned-unicode-predicates:restore-language-input')]:[],repositoryRules:phase==='repository'?[rule(target,before,'router-core:restore-complete-before-unicode-predicates')]:[]});
  if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(undo.value)).source!==before)fail('complete inverse differs');stages.push({phase,before,after:target,beforeMeta:wire,afterMeta:encoded,trace:run.trace,completeInverse:true});document=reparsed.document;
 }
 let current=null;try{current=readFileSync(resolve(root,row.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 return {path:row.path,before,language:before,after,current,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta,afterMeta:serializeConcreteSyntaxMeta(document),inverse:before,stages,trace:stages.flatMap(stage=>stage.trace),nativeCopies:language==='JavaScript'?[nativeCopy(ts,row.path,before),nativeCopy(ts,row.path,after)]:[],completeNativeAstCopy:language==='JavaScript',sourceLanguage:language};
}
export function prepareCoreUnicodePredicates({root=ROOT}={}){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');
 const property=unicodePredicateSourceArtifacts(),rows=originals(),after=afterSources(rows);
 const plan={schema:'router-owned-unicode-predicate-sources-v1',typescriptVersion:ts.version,property,
  files:rows.map(row=>prepare(row,after[row.path],root,ts)),nativeRustExecuted:false,runtimeExecuted:false,semanticAuthority:false};
 // Rejoin the complete original property source after every native/CST callback.
 if(JSON.stringify(unicodePredicateSourceArtifacts())!==JSON.stringify(property))fail('property source changed during preparation');return plan;
}
export function composeCoreUnicodePredicates(prior,options={}){
 const plan=prepareCoreUnicodePredicates(options),sources={...prior};
 for(const row of plan.files){if(Object.hasOwn(sources,row.path)&&sources[row.path].after!==row.before)fail('preceding complete source equation differs: '+row.path);sources[row.path]=row;}
 return {sources,layers:[plan],historicalSources:prior};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--check','--write'].includes(args[0]))fail('usage: --check|--write');const plan=prepareCoreUnicodePredicates();
 if(args[0]==='--write'){
  for(const row of plan.files)if(![row.before,row.after].includes(row.current)&&!(row.before===''&&row.current===null))fail('physical complete parent differs: '+row.path);
  for(const row of plan.files){const path=resolve(ROOT,row.path);mkdirSync(dirname(path),{recursive:true});writeFileSync(path,row.after);}
 }else if(plan.files.some(row=>row.current!==row.after))fail('generated source is stale');
 console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>row.path),semanticAuthority:false}));
}
