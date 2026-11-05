// Narrow source-model native compatibility boundary for one Router-owned
// private nominal type. This never claims an observed rustc/sysroot/native run.
import {lstatSync} from 'node:fs';import {captureReadonlySourceProfile} from './ordered-text-map-callers-20261102-source-storage.mjs';
import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {matchesParserFacts,originalMatchesDependencyProof} from './matches-macro-context.mjs';
import {requireOriginalFromNamespaceCallbacks} from './extensions/host-contracts.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from './extensions/external-trait-sources.mjs';
import {planOriginalCargoInvocation,requireOriginalCargoInvocationPlan} from './cargo-invocation-plan.mjs';
import {captureOriginalStandardMacroProviderABI,requireOriginalStandardMacroProviderABI} from './standard-macro-provider-abi.mjs';
import {parsePrivateOriginalOrderedMapAllocCargoToml} from './private-cargo-toml.mjs';
import {selectOriginalOrderedTextMapCore} from './ordered-text-map-20261102-interface.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {requireOriginalOrderedTextMapStandardSources,requireOrderedMapSourceDataIngress,sameOrderedMapSourceData,parseOrderedMapSourceData} from './ordered-text-map-callers-20261102-standard-source.mjs';
import {requireOrderedTextMapNativeSourceContext} from './ordered-text-map-callers-20261102-native-context.mjs';
import {readCompactSparsePhysicalFile,sameCompactPhysicalSourceStamp} from './compact-sparse-git-io-20261102.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation,withSourceFailureOperation} from './source-failure-operations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
const issued=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Ordered-map monomorphic native source ABI: '+message);};
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const words=item=>item.tokens.filter(token=>token.type!=='comment').map(token=>token.text).join('');
const originals=new URL('./source-profiles/ordered-text-map-callers-20261102-standard/ordered-text-map-callers-20261102-native-abi-originals.json.gz',import.meta.url);
const originalPin='0485df04246d0e19f1505a29586361aa94f506f846a58b1d833bbd8d3aa0684e',originalDecodedPin='0035430298bbd2355338fdc5699deadbc2ad682419b465784ed315af954d0532';
const selectedSourceRoots=['./','../../rust/src/','../../rust/tests/'].map(path=>fileURLToPath(new URL(path,import.meta.url))),stableDirectory=(left,right)=>['dev','ino','mode','uid','gid'].every(key=>left[key]===right[key]);
const sameDirectory=(row,next)=>selectedSourceRoots.some(root=>row.path===root.slice(0,-1)||row.path.startsWith(root))?sameCompactPhysicalSourceStamp(row.stat,next):stableDirectory(row.stat,next);
function artifacts(){
 const files=[],directories=[],stored=[];let poisoned=false,primary;
 const close=()=>{let failed=false,error;const check=run=>{try{run();}catch(value){if(!failed){failed=true;error=value;}}};for(const row of stored)check(row.requireCurrent);for(const row of files)check(()=>{if(!readCompactSparsePhysicalFile(row).equals(row.raw))fail('complete original ABI source changed');});for(const row of directories)check(()=>{const next=lstatSync(row.path,{bigint:true});if(!next.isDirectory()||next.isSymbolicLink()||!sameDirectory(row,next))fail('original ABI source ancestor changed');});if(failed){if(!poisoned){poisoned=true;primary=error;}throw error;}if(poisoned)throw primary;};
 const protect=run=>{if(poisoned)throw primary;try{requireOrderedMapSourceDataIngress();const value=withSourceInputValidation(run);requireOrderedMapSourceDataIngress();return value;}catch(error){if(!poisoned){poisoned=true;primary=error;}throw error;}};
 const read=url=>protect(()=>withCompleteSourceClosingFence(()=>{const logical=captureReadonlySourceProfile(url,{maximum:1048576});if(logical){stored.push(logical);return logical.bytes;}const path=fileURLToPath(url);let parent=dirname(path),depth=0;while(true){if(++depth>128)fail('ABI source ancestor bound');const stat=lstatSync(parent,{bigint:true});if(!stat.isDirectory()||stat.isSymbolicLink())fail('ordinary ABI source ancestor required');const prior=directories.find(row=>row.path===parent);if(prior){if(!sameDirectory(prior,stat))fail('ABI source ancestor replaced');}else directories.push({path:parent,stat});const next=dirname(parent);if(next===parent)break;parent=next;}const stat=lstatSync(path,{bigint:true});if(!stat.isFile()||stat.isSymbolicLink()||stat.size>1048576n)fail('bounded ordinary ABI source required');const row={path,stat},raw=readCompactSparsePhysicalFile(row);files.push({...row,raw});return raw;},[close]));
 return protect(()=>withCompleteSourceClosingFence(()=>{const packed=read(originals);if(hash(packed)!==originalPin)fail('complete immutable ABI source archive differs');const decoded=gunzipSync(packed,{maxOutputLength:131072}),text=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(decoded);requireOrderedMapSourceDataIngress();if(hash(decoded)!==originalDecodedPin||hash(text)!==originalDecodedPin)fail('complete decoded source ABI archive differs');const data=parseOrderedMapSourceData(text);if(data.schema!=='ordered-map-fixed-monomorphic-native-abi-originals-20261102-v1'||data.sources.length!==4)fail('fixed complete source ABI originals required');
  const sources=data.sources.map(row=>{if(!['rust/src/translation_ordered_text_map_core.rs','tools/translation/ordered-text-map-20261102-runtime.mjs','tools/translation/ordered-text-map-20261102-runtime.d.mts','rust/tests/ordered-text-map-callers-20261102_test.rs'].includes(row.path)||typeof row.source!=='string'||Buffer.byteLength(row.source)!==row.bytes||hash(row.source)!==row.sha256)fail('fixed complete source ABI member differs');const raw=read(new URL('../../'+row.path,import.meta.url));if(!raw.equals(Buffer.from(row.source)))fail('actual native/runtime/oracle source differs from original ABI');return row;});if(new Set(sources.map(row=>row.path)).size!==4)fail('ABI source census differs');return {data,sources,close:()=>protect(close)};
 },[close]));
}
const signatureRows=[
 ['new','pubfntext_map_new()->OrderedTextMap',[],'map',null],
 ['insert','pubfntext_map_insert(mutmap:OrderedTextMap,key:String,value:String)->OrderedTextMap',['map-owned','String-owned','String-owned'],'map',null],
 ['remove','pubfntext_map_remove(mutmap:OrderedTextMap,key:&str)->OrderedTextMap',['map-owned','str-shared'],'map',null],
 ['get',"pubfntext_map_get<'a>(map:&'aOrderedTextMap,key:&str)->Option<&'astr>",['map-shared','str-shared'],'Option<str-shared>',0],
 ['contains','pubfntext_map_contains(map:&OrderedTextMap,key:&str)->bool',['map-shared','str-shared'],'bool',null],
 ['len','pubfntext_map_len(map:&OrderedTextMap)->u64',['map-shared'],'u64',null],
 ['copy','pubfntext_map_copy(map:&OrderedTextMap)->OrderedTextMap',['map-shared'],'map',null],
 ['keys','pubfntext_map_keys(map:&OrderedTextMap)->Vec<String>',['map-shared'],'Vec<String>-owned',null],
 ['from_pairs','pubfntext_map_from_pairs(pairs:Vec<(String,String)>)->OrderedTextMap',['Vec<(String,String)>-owned'],'map',null],
 ['pairs','pubfntext_map_pairs(map:&OrderedTextMap)->Vec<(String,String)>',['map-shared'],'Vec<(String,String)>-owned',null],
];
function nativeMembers(module,sourceScopes){
 const items=originalSourceModuleItems(module),nominals=items.filter(item=>item.term==='struct'&&item.name==='OrderedTextMap');if(nominals.length!==1||words(nominals[0])!=='#[derive(Debug,Clone,PartialEq,Eq)]pubstructOrderedTextMap(BTreeMap<String,String>);')fail('actual original private nominal representation/derive input differs');
 const scope=sourceScopes.find(scope=>scope.file===module.file&&scope.path.join('::')===module.path.join('::'));
 const bindings=scope?.bindings.filter(binding=>binding.namespace==='type'&&binding.name==='OrderedTextMap'),nominal=nominals[0];if(bindings?.length!==1||bindings[0].status!=='resolved'||bindings[0].kind!=='struct'||bindings[0].via!=='declaration'||bindings[0].source!==module.file||bindings[0].span.start!==nominal.start||bindings[0].span.end!==nominal.end||bindings[0].target.join('::')!=='crate::translation_ordered_text_map_core::OrderedTextMap')fail('actual private nominal source binding differs');
 const operations=signatureRows.map(([operation,signature,parameters,returns,loanRoot])=>{const candidates=items.filter(item=>item.term==='fn'&&item.name==='text_map_'+operation);if(candidates.length!==1)fail('original operation declaration differs');const item=candidates[0],ts=item.tokens.filter(token=>token.type!=='comment'),open=ts.findIndex(token=>token.text==='{'),actual=ts.slice(0,open).map(token=>token.text).join('');if(actual!==signature||ts.at(-1)?.text!=='}')fail('whole original ABI signature/body boundary differs');const bindings=scope?.bindings.filter(binding=>binding.namespace==='value'&&binding.name===item.name);if(bindings?.length!==1||bindings[0].status!=='resolved'||bindings[0].kind!=='fn'||bindings[0].via!=='declaration'||bindings[0].source!==module.file||bindings[0].span.start!==item.start||bindings[0].span.end!==item.end||bindings[0].target.join('::')!=='crate::translation_ordered_text_map_core::'+item.name)fail('actual private native function source binding differs');return {operation,signature,parameters,returns,loanRoot,file:module.file,span:{start:item.start,end:item.end},completeOriginal:module.source.slice(item.start,item.end)};});
 return {nominal:{file:module.file,span:{start:nominals[0].start,end:nominals[0].end},completeOriginal:module.source.slice(nominals[0].start,nominals[0].end)},operations};
}
function build(input){
 const {parser,modules,sourceScopes,compilationProfile,cargoEditionContext,deriveDependencies,standardSources,nativeSourceContext}=input;
 requireOriginalFromNamespaceCallbacks(parser);const frame=matchesParserFacts(parser);if(frame.facts.modules!==modules||frame.facts.evidence.scopes!==sourceScopes||frame.facts.cargoEditionContext!==cargoEditionContext||originalMatchesDependencyProof(frame.facts)!==deriveDependencies)fail('actual original parser/source/Cargo association required');
 requireOriginalOrderedTextMapStandardSources(standardSources);requireOrderedTextMapNativeSourceContext(nativeSourceContext,input);
 const facade=selectOriginalOrderedTextMapCore({modules,sourceScopes,compilationProfile});
 const native=modules.filter(module=>module.path.join('::')==='translation_ordered_text_map_core');if(native.length!==1||facade.source!==native[0].source)fail('one actual complete original native facade required');const selected=nativeMembers(native[0],sourceScopes),assets=artifacts();
 const current=()=>{requireOriginalFromNamespaceCallbacks(parser);if(matchesParserFacts(parser)!==frame)fail('original native/parser frame changed');requireOriginalOrderedTextMapStandardSources(standardSources);requireOrderedTextMapNativeSourceContext(nativeSourceContext,input);nativeMembers(native[0],sourceScopes);};
 return withCompleteSourceClosingFence(()=>createRulePipeline([{phase:'language',rules:[{id:'ordered-map:actual-private-Cargo-standard-unit-and-complete-ABI-source',apply:()=>{
  // The registered package token selects the existing genuine Cargo parser's
  // audited source domain. Its package name supplies no ordered-map authority.
  const packageToken=captureOriginalExternalTraitPackage(deriveDependencies,'base64');originalExternalTraitPackageInputs(packageToken);
  const domain={schema:'modeled-cargo-root-library-invocation-v1',argv:['cargo','check','--package','link-assistant-router','--lib'],configurationFiles:[],environmentOverrides:[],compilerWrappers:[],rustflags:[],rustdocflags:[],profileCompilerFlags:[],extraRustcArguments:[],targetOverride:null,cargoUnstableOptions:[],buildScriptOverrides:[]},options={packageToken,domain},unitToken=planOriginalCargoInvocation(parser,options),unit=requireOriginalCargoInvocationPlan(unitToken,parser,options);
  if(unit.rootMode!=='Check'||unit.root.target.path!=='src/lib.rs'||unit.root.target.kind!=='lib')fail('actual selected root library source unit differs');
  const requests=['Debug','Clone','PartialEq','Eq'].map(name=>({kind:'derive',name})),standard=captureOriginalStandardMacroProviderABI(deriveDependencies,requests);requireOriginalStandardMacroProviderABI(standard,deriveDependencies);
  const std=standard.units.filter(unit=>unit.name==='std'),core=standard.units.filter(unit=>unit.name==='core'),alloc=parsePrivateOriginalOrderedMapAllocCargoToml(standardSources);
  if(std.length!==1||core.length!==1||std[0].procMacro||core[0].procMacro||std[0].parsed.dependencies?.alloc?.path!=='../alloc'||alloc.package?.name!=='alloc'||alloc.package.edition!=='2024'||!alloc.lib||alloc.lib['proc-macro']!==undefined||alloc.lib['crate-type']!==undefined||alloc.dependencies?.core?.path!=='../core')fail('actual canonical std/alloc/core source-unit chain differs');
  const syntax=assets.sources.map(row=>{const language=row.path.endsWith('.rs')?'Rust':row.path.endsWith('.mts')?'TypeScript':'JavaScript',concrete=transportConcreteSyntaxSource(row.source,{language});if(concrete.source!==row.source||transportConcreteSyntaxMeta(concrete.meta).source!==row.source)fail('complete serialized/reparsed ABI source differs');return {path:row.path,meta:concrete.meta};});
  requireOriginalCargoInvocationPlan(unitToken,parser,options);requireOriginalStandardMacroProviderABI(standard,deriveDependencies);
  return {unit,standard,alloc,syntax};
 }}]},{phase:'repository',rules:[{id:'router:private-owned-map-monomorphic-native-compatibility-ABI',apply:source=>{
  const value=freeze({schema:'private-router-ordered-map-source-ABI-v1',sourceModel:'original-rust-1.89-ordinary-canonical-std-router-owned-map',nominal:selected.nominal,operations:selected.operations,originalUnit:source.unit,standardUnits:source.standard.units,allocUnit:source.alloc,originalDeriveSlots:source.standard.slots,sourceSyntax:source.syntax,maxEntries:4096,maxUtf8Bytes:1048576,iteration:'UTF-8-byte-ascending',sourceCompatibilityBoundary:true,nativeInternalsUntranslated:true,wholeStandardNamespaceComplete:false,arbitraryNativeTypeAuthority:false,callerBodyQualified:false,actualInvocationObserved:false,nativeSysrootConformance:false,nativeOracleQualification:'UNRUN',runtimeParity:false});issued.set(value,{input,current,assets});return value;
 }}]}]).run(null).value,[current,assets.close]);
}
export function issueOrderedTextMapNativeSourceABI(input){return withSourceFailureOperation(()=>build(input));}
export function requireOrderedTextMapNativeSourceABI(value,{parser}={}){
 const record=issued.get(value);if(!record||record.input.parser!==parser)fail('copied/foreign original native ABI receipt');return withCompleteSourceClosingFence(()=>{record.current();record.assets.close();const fresh=issueOrderedTextMapNativeSourceABI(record.input);if(!sameOrderedMapSourceData(fresh,value))fail('fresh original native ABI differs');return value;},[record.current,record.assets.close]);
}
