// Candidate source inputs only. A written include-like path does not prove the
// macro's owner, expansion, visibility, cfg availability or executable output.
import {types} from 'node:util';
import {posix} from 'node:path';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createRulePipeline} from './rule-pipeline.mjs';
import {compilationProfile,itemConfiguration} from './cfg-profile.mjs';
import {captureSourceModuleViews,originalSourceModuleItems} from './source-module-views.mjs';
import {originalMacroInvocation,originalTopLevelMacroInvocations} from './macro-token-trees.mjs';
import {sourceItems,rustTokens} from './rust-structure.mjs';
import {tokenizeRust} from './extensions/lexical.mjs';
import {macroProvenance} from './macro-provenance.mjs';
import {copyMetadata} from './extensions/source-links.mjs';
const contexts=new WeakMap(),modules=new WeakMap(),edges=new WeakMap(),graphs=new WeakMap();
const hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original literal source inputs: '+message);};
const limits=freeze({files:20000,fileBytes:8000000,totalBytes:32000000,pathBytes:4096,edges:4096,modules:4096,items:20000,depth:64});
const boundaries=freeze({macroOwnerResolved:false,compilerCallbackExecuted:false,expansionAuthority:false,namespaceAuthority:false,itemOutputComplete:false,availabilitySelected:false,filesystemIdentityProved:false,runtimeAuthority:false,runtimeParity:false});
function own(value,key,optional=false){if(!value||types.isProxy(value)||typeof value!=='object')fail('ordinary own-data fields required');const field=Object.getOwnPropertyDescriptor(value,key);if(!field&&optional)return undefined;if(!field||!Object.hasOwn(field,'value'))fail('own data field required: '+key);return field.value;}
function options(value,keys){if(!value||types.isProxy(value)||Object.getPrototypeOf(value)!==Object.prototype||Reflect.ownKeys(value).some(key=>typeof key!=='string'||!keys.includes(key)))fail('ordinary bounded options required');for(const key of Reflect.ownKeys(value))own(value,key);return value;}
function list(value,max){if(!value||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary dense array required');const length=own(value,'length');if(!Number.isSafeInteger(length)||length>max||Reflect.ownKeys(value).length!==length+1)fail('bounded dense array required');return Array.from({length},(_,at)=>own(value,String(at)));}
function path(value){if(typeof value!=='string'||!value||Buffer.byteLength(value)>limits.pathBytes||value.includes('\\')|| /[\u0000-\u001f\u007f]/u.test(value)||value.includes(':')||posix.isAbsolute(value)||value.split('/').some(part=>!part||part==='.'||part==='..'))fail('canonical repository-relative path required');return value;}
function source(value){if(typeof value!=='string'||Buffer.byteLength(value)>limits.fileBytes||Buffer.from(value,'utf8').toString('utf8')!==value)fail('complete well-formed UTF-8 source string required');return value;}
function context(value){const state=contexts.get(value);if(!state)fail('copied foreign or unissued input context');return state;}

// Existing full licensed compiler sources are referenced in place; no new
// source copy or handwritten include implementation is introduced here.
const compilerPins=[
 ['library/core/src/macros/mod.rs','derive/rust-core-macros-1.89.0.rs.gz',65222,'9a950cfa3735eef653b7f9a6a4701e7b218f9876141701dac72ccb8b8e8d3862','8506fde0d40b33c2336337b7282358b44f09a010434807b6e0e06d7a896ab49e'],
 ['compiler/rustc_builtin_macros/src/lib.rs','builtin-derive-bang/rust-1.89-compiler_rustc_builtin_macros_src_lib.rs.gz',5277,'7af7c77b36351c3ea41e1ebb62605c2f74aeee3ee76ba9ea0b1f511356f85f07','87b25549db475e3644a4f89b27348d0a15fba8dfd72338ae37d97e2095ebae0d'],
 ['compiler/rustc_builtin_macros/src/source_util.rs','schemars-namespace/rust-1.89-source_util.rs.gz',12434,'cc9562c65f756463f1aaced793f7939ad2dc1da8fb5a4a188f7dab5d27d86dc5','33823fb9c9d18e8b5c49fbb7fc121b9da5864b38b3c9e85634e827ab00a2ce86'],
];
let compiler;
function originalCompilerInputs(){
 if(compiler)return compiler;
 const inputs=compilerPins.map(([path,archive,bytes,sha256,archiveSha256])=>{const packed=readFileSync(new URL('./source-profiles/'+archive,import.meta.url));if(hash(packed)!==archiveSha256)fail('complete compiler archive changed');const raw=gunzipSync(packed,{maxOutputLength:128000});if(raw.length!==bytes||hash(raw)!==sha256)fail('complete compiler source changed');return freeze({path,url:'https://raw.githubusercontent.com/rust-lang/rust/1.89.0/'+path,archive,bytes,sha256,archiveSha256,source:raw.toString('utf8')});});
 const utility=inputs[2],selected=['expand_include','expand_include_str','load_binary_file'].map(name=>{const rows=sourceItems(utility.source).filter(item=>item.term==='fn'&&item.name===name);if(rows.length!==1)fail('original compiler callback absent or ambiguous');const row=rows[0];return {path:utility.path,sourceSha256:utility.sha256,name,span:{start:row.start,end:row.end},original:utility.source.slice(row.start,row.end)};});
 const core=inputs[0],owners=sourceItems(core.source).filter(item=>item.term==='mod'&&item.name==='builtin');if(owners.length!==1)fail('original core builtin declaration module absent or ambiguous');const ownerTokens=owners[0].tokens.filter(token=>token.type!=='comment'),open=ownerTokens.find(token=>token.text==='{'),close=ownerTokens.at(-1);if(!open||close?.text!=='}')fail('complete original core builtin module required');
 const declarations=['include','include_str'].map(name=>{const rows=sourceItems(core.source.slice(open.end,close.start)).filter(item=>item.term==='macro_rules!'&&item.name===name);if(rows.length!==1)fail('original include declaration absent or ambiguous');const row=rows[0],span={start:row.start+open.end,end:row.end+open.end};return {path:core.path,sourceSha256:core.sha256,name,span,original:core.source.slice(span.start,span.end)};});
 const registry=inputs[1],registrations=sourceItems(registry.source).filter(item=>item.term==='fn'&&item.name==='register_builtin_macros');if(registrations.length!==1)fail('original builtin registry absent or ambiguous');const registration=registrations[0],written=registration.tokens.filter(token=>token.type!=='comment'),routes=['include','include_str'].map(name=>{const sequence=[name,':','source_util','::','expand_'+name,','],matches=[];for(let at=0;at<written.length;at++)if(sequence.every((word,index)=>written[at+index]?.text===word))matches.push(at);if(matches.length!==1)fail('original include registry route absent or ambiguous');const at=matches[0],span={start:written[at].start,end:written[at+sequence.length-1].end};return {name,callback:['source_util','expand_'+name],span,original:registry.source.slice(span.start,span.end)};});
 compiler=freeze({rustVersion:'1.89.0',inputs,selected,declarations,registration:{path:registry.path,sourceSha256:registry.sha256,span:{start:registration.start,end:registration.end},original:registry.source.slice(registration.start,registration.end),routes},licenseReferences:['source-profiles/schemars-namespace/LICENSE-MIT','source-profiles/schemars-namespace/LICENSE-APACHE'],boundaries,unclosed:['original callsite macro namespace including imports and shadows','argument expansion and retries','compiler AST parsing, hygiene and complete MacResult slots','included item/import/attribute/nested-macro output closure','source-map file identity and loader diagnostics']});return compiler;
}
export function captureLiteralSourceInputs(input){
 options(input,['paths','readSource','compilationProfile']);const paths=list(own(input,'paths'),limits.files).map(path),readSource=own(input,'readSource'),profile=compilationProfile(copyMetadata(own(input,'compilationProfile',true)??null));
 if(typeof readSource!=='function'||types.isProxy(readSource)||types.isAsyncFunction(readSource)||new Set(paths).size!==paths.length)fail('unique tracked inputs and synchronous source reader required');
 // Validate the complete path vector before any reader callback. The captured
 // snapshot is immutable; it is not a claim about a later filesystem state.
 const files=new Map();let bytes=0;
 for(const file of [...paths].sort()){const text=source(readSource(file)),length=Buffer.byteLength(text);bytes+=length;if(bytes>limits.totalBytes)fail('complete input snapshot byte bound exceeded');files.set(file,freeze({path:file,source:text,bytes:length,sha256:hash(text)}));}
 const token=Object.freeze({schema:'private-literal-source-input-context-v1'});contexts.set(token,{files,profile,modules:new Map(),bytes});return token;
}
export function originalLiteralInputModules(token,file){
 const state=context(token);path(file);if(!file.endsWith('.rs')||!state.files.has(file))fail('tracked original Rust parent required');if(state.modules.has(file))return state.modules.get(file);
 const origin=state.files.get(file),capture=captureSourceModuleViews({source:origin.source,sourcePath:file,compilationProfile:state.profile});
 const result=Object.freeze(capture.views.map(sourceView=>{const module=freeze({file,path:[...sourceView.modulePath],source:origin.source,sourceView,compilationProfile:state.profile,configurationCondition:sourceView.configurationCondition});modules.set(module,{token,origin,capture});return module;}));state.modules.set(file,result);return result;
}
const pipeline=createRulePipeline([
 {phase:'language',rules:[{id:'rust.original-literal-macro-argument.v1',apply(value){
  const invocation=originalMacroInvocation(value.original),kind=invocation.path.at(-1),trees=invocation.trees;
  if(!['include','include_str'].includes(kind)||trees.length<1||trees.length>2||trees[0].kind!=='token'||trees[0].type!=='string'||trees.length===2&&trees[1].text!==',')fail('one complete original literal argument required; nested macros remain unexpanded');
  const decoded=tokenizeRust(trees[0].text).filter(token=>token.kind!=='eof');if(decoded.length!==1||decoded[0].kind!=='string')fail('original Rust string literal required');
  return {...value,kind,writtenSegments:invocation.path,literal:trees[0],relativePath:decoded[0].value};
 }}]},
 {phase:'repository',rules:[{id:'repository.tracked-relative-input-selection.v1',apply(value,state){
  const relative=value.relativePath;if(typeof relative!=='string'||!relative||Buffer.byteLength(relative)>limits.pathBytes||relative.includes('\\')|| /[\u0000-\u001f\u007f]/u.test(relative)||relative.includes(':')||posix.isAbsolute(relative))fail('literal path exceeds the repository-relative profile');
  const target=path(posix.normalize(posix.join(posix.dirname(value.parent.file),relative))),origin=state.files.get(target);if(!origin)fail('literal target is missing from complete tracked inputs');if(value.kind==='include'&&!target.endsWith('.rs'))fail('Rust item input candidate requires a tracked Rust file');return {...value,target,origin};
 }}]},
]);
export function planOriginalLiteralInput(token,input){
 const state=context(token);options(input,['module','span']);const module=own(input,'module'),membership=modules.get(module);if(!membership||membership.token!==token)fail('exact private original parent module required');
 const rawSpan=options(own(input,'span'),['start','end']),span={start:own(rawSpan,'start'),end:own(rawSpan,'end')};
 if(!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<module.sourceView.bodySpan.start||span.end>module.sourceView.bodySpan.end||span.end<=span.start)fail('invocation escapes its exact original source view');
 const enclosing=originalSourceModuleItems(module).filter(item=>item.start<=span.start&&item.end>=span.end);if(enclosing.length!==1)fail('invocation requires one complete enclosing original item');
 const item=enclosing[0],first=item.tokens.find(token=>token.start===span.start),last=item.tokens.find(token=>token.end===span.end);if(first?.type!=='ident'||last?.type!=='punct'||![')',']','}'].includes(last.text))fail('invocation is not bounded by actual original lexical tokens');
 const condition=itemConfiguration(item.tokens,state.profile),original=module.source.slice(span.start,span.end),run=pipeline.run({parent:module,span,original},state),value=run.value;
 const facts=freeze({schema:'original-literal-input-edge-v1',kind:value.kind,parent:module.file,parentModulePath:module.path,parentSha256:membership.origin.sha256,parentViewDigest:module.sourceView.digest,span,originalInvocation:original,writtenSegments:value.writtenSegments,relativePath:value.relativePath,target:value.target,targetSha256:value.origin.sha256,targetBytes:value.origin.bytes,compilationProfile:state.profile,configurationCondition:condition.status,parentConfigurationCondition:module.configurationCondition,attributes:condition.attributes,enclosingItem:{term:item.term,name:item.name,span:{start:item.start,end:item.end},sha256:hash(module.source.slice(item.start,item.end))},macroFootprints:macroProvenance(module.source),targetObligations:{rustItemParsingRequired:value.kind==='include',macroFootprints:value.kind==='include'?macroProvenance(value.origin.source):null,lexicalBangTokens:value.kind==='include'?rustTokens(value.origin.source).filter(token=>token.type==='ident'&&token.text.endsWith('!')).map(token=>({written:token.text,span:{start:token.start,end:token.end}})):[],allAttributesImportsAndNestedOutputsRemainUnproved:true},ruleTrace:run.trace,...boundaries});
 const proof=Object.freeze({schema:'private-original-literal-input-edge-v1'});edges.set(proof,{token,module,origin:value.origin,facts,compiler:originalCompilerInputs()});return proof;
}
function edgeState(proof,input){
 const state=edges.get(proof);if(!state)fail('copied foreign or unissued input edge');options(input,['context','parentSource','targetSource']);if(own(input,'context')!==state.token)fail('edge belongs to another original input snapshot');context(state.token);
 if(own(input,'parentSource')!==state.module.source||own(input,'targetSource')!==state.origin.source)fail('complete original parent or target source changed');originalSourceModuleItems(state.module);return state;
}
export function originalLiteralInputFacts(proof,input){return edgeState(proof,input).facts;}
export function originalLiteralInputEvidence(proof,input){const state=edgeState(proof,input);return freeze({facts:state.facts,parent:{path:state.module.file,source:state.module.source},target:state.origin,compiler:state.compiler});}
export function literalInputSource(token,file){return context(token).files.get(path(file))?.source??fail('source outside original snapshot');}
export function planOriginalLiteralInputGraph(token,input){
 const state=context(token);options(input,['entry']);const entry=path(own(input,'entry'));if(!state.files.has(entry))fail('untracked graph entry');const proofEdges=[],records=[],visited=new Set(),used=new Set([entry]);let itemCount=0;
 function visit(file,ancestors){
  if(ancestors.includes(file))fail('circular candidate source inputs: '+[...ancestors,file].join(' -> '));if(ancestors.length>=limits.depth)fail('candidate input depth bound exceeded');if(visited.has(file))return;visited.add(file);
  for(const module of originalLiteralInputModules(token,file)){
   const items=originalSourceModuleItems(module);itemCount+=items.length;if(records.length>=limits.modules||itemCount>limits.items)fail('candidate input module/item bound exceeded');records.push({file,modulePath:module.path,viewDigest:module.sourceView.digest,fileLocalConfigurationCondition:module.configurationCondition,unresolvedModuleHeaders:modules.get(module).capture.diagnostics,items:items.map(item=>({term:item.term,name:item.name,span:{start:item.start,end:item.end},configuration:itemConfiguration(item.tokens,state.profile)}))});
   if(module.configurationCondition==='inactive')continue;
   for(const item of items){if(itemConfiguration(item.tokens,state.profile).status==='inactive')continue;
    for(const call of originalTopLevelMacroInvocations(module.source.slice(item.start,item.end))){if(!['include','include_str'].includes(call.path.at(-1)))continue;if(proofEdges.length>=limits.edges)fail('candidate input edge bound exceeded');const edge=planOriginalLiteralInput(token,{module,span:{start:item.start+call.sourceSpan.start,end:item.start+call.sourceSpan.end}});proofEdges.push(edge);const facts=edges.get(edge).facts;used.add(facts.target);if(facts.kind==='include')visit(facts.target,[...ancestors,file]);}
   }
  }
 }
 visit(entry,[]);const facts=freeze({schema:'original-literal-input-graph-v1',entry,inputs:[...used].map(file=>{const row=state.files.get(file);return {path:file,bytes:row.bytes,sha256:row.sha256};}),edges:proofEdges.map(edge=>edges.get(edge).facts),records,discovery:'source-local original top-level item token candidates only; expression/body/expanded candidates require independent source selection',retainedObligations:['every original macro owner and transitive output','mod edges require the independent existing module graph','include item parsing, hygiene and source-map directories','all incoming cfg conditions remain on edges; no child availability is inferred'],...boundaries});const graph=Object.freeze({schema:'private-original-literal-input-graph-v1'});graphs.set(graph,{token,facts,proofEdges});return graph;
}
export function originalLiteralInputGraphFacts(graph,token){const state=graphs.get(graph);if(!state||state.token!==token)fail('copied foreign or unissued input graph');context(token);return state.facts;}
