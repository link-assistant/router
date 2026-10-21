// Source proposal only. No mutable Rust type, owner or executable authority.
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {captureSourceModuleViews,originalModuleViewItems} from './source-module-views.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
const PIN='2b685c52df36899f287ff2577dff267c0007f1b7e11d4f7f3fbda27533b07547';
const PATH='rust/src/thinking/apply.rs',LANGUAGE_CALL='__router_owned_json_remove_if_object',CORE='crate::translation_core::json_edit_candidate::remove_if_object';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('JSON edit leaf candidate: '+message);};
export function jsonEditFrontierSourceData(){
 const packed=readFileSync(new URL('./source-profiles/mutable-json-frontier/complete49-source-DATA.json.gz',import.meta.url));if(hash(packed)!==PIN)fail('complete source packet differs');
 const data=JSON.parse(gunzipSync(packed,{maxOutputLength:2*1024*1024}));if(data.selection.functionCount!==49||data.functions.length!==49||data.selection.wholeParentCount!==30||data.semanticAuthority!==false)fail('complete historical membership differs');return data;
}
const one=(rows,label)=>{if(rows.length!==1)fail('one exact '+label+' required');return rows[0];};
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
function phase(source,after,name,id){
 const before=transportConcreteSyntaxSource(source,{language:'Rust'}),options={languageRules:[],repositoryRules:[]};options[name+'Rules']=[rule(source,after,id)];const result=applyConcreteSyntaxSubstitutions(before.document,options),afterMeta=serializeConcreteSyntaxMeta(result.value),read=transportConcreteSyntaxMeta(afterMeta);if(read.source!==after)fail('complete source phase differs');
 const inverseOptions={languageRules:[],repositoryRules:[]};inverseOptions[name+'Rules']=[rule(after,source,id+':inverse')];const inverse=applyConcreteSyntaxSubstitutions(read.document,inverseOptions);if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==source)fail('complete source inverse differs');
 return {phase:name,before:source,after,beforeMeta:before.meta,afterMeta,trace:result.trace,inverse:source,completeInverse:true};
}
// Exact source association narrows this draft to one real whole parent. It does
// NOT establish what Value/Some/as_object_mut/remove resolve to after expansion.
export function proposeJsonEditRemoveLeaf({source,sourcePath=PATH}={}){
 const data=jsonEditFrontierSourceData(),parent=one(data.completePhysicalSources.filter(row=>row.path===PATH),'complete retained parent'),target=one(data.functions.filter(row=>row.originalIndex===2294),'original function');
 if(sourcePath!==PATH||source!==parent.source||hash(source)!==parent.sha256)fail('complete original parent/source join differs');
 const capture=captureSourceModuleViews({source,sourcePath}),view=one(capture.views.filter(row=>row.modulePath.length===0),'original module view'),items=originalModuleViewItems(view,source),item=one(items.filter(row=>row.term==='fn'&&row.start===target.span.start&&row.end===target.span.end),'original function span');
 if(hash(source.slice(item.start,item.end))!==target.sha256||source.slice(item.start,item.end)!==target.body)fail('complete original function differs');
 const tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{'),body=tokens.slice(open+1,-1),expected=['if','let','Some','(','object',')','=','body','.','as_object_mut','(',')','{','object','.','remove','(','field',')',';','}'];
 if(open<0||tokens.at(-1)?.text!=='}'||body.length!==expected.length||body.some((token,at)=>token.text!==expected[at])||item.tokens.some(token=>token.type==='comment'&&token.start>=body[0].start))fail('complete closed remove expression differs');
 const span=[body[0].start,body.at(-1).end],original=source.slice(...span),replacement=LANGUAGE_CALL+'(body, field);',language=source.slice(0,span[0])+replacement+source.slice(span[1]),languageView=captureSourceModuleViews({source:language,sourcePath}),languageItems=originalModuleViewItems(languageView.views[0],language),selected=one(languageItems.flatMap(row=>row.tokens).filter(token=>token.type==='ident'&&token.text===LANGUAGE_CALL),'repository ABI call token'),after=language.slice(0,selected.start)+CORE+language.slice(selected.end);
 const stages=[phase(source,language,'language','json-edit:retain-mut-reference-signature-and-select-closed-remove'),phase(language,after,'repository','router:qualify-explicit-unadopted-json-edit-leaf')];
 if(after.slice(0,span[0])!==source.slice(0,span[0])||after.slice(span[0]+CORE.length+'(body, field);'.length)!==source.slice(span[1]))fail('bytes outside selected expression changed');
 return {schema:'unadopted-json-edit-remove-leaf-source-v1',path:sourcePath,sourceHead:data.physicalRootHead,before:source,language,after,beforeSha256:hash(source),afterSha256:hash(after),originalFunction:target,selection:{span,original,replacement:CORE+'(body, field);',signatureUnchanged:true,mutableReferenceErased:false},stages,beforeMeta:stages[0].beforeMeta,afterMeta:stages[1].afterMeta,inverse:source,trace:stages.flatMap(row=>row.trace),requiredFacadeEdge:'pub mod json_edit_candidate;',missingJoins:['actual enclosing cfg/attribute/macro and canonical serde_json Value/Option/method owners','parse-issued unique mutable-root type and synchronous private checker lifecycle','complete call-site borrow/reborrow/alias and partial-writeback ABI','actual paired core/facade native source association','fresh whole-parent and whole-project admission plus emitted JS/strict TS/Rust oracle'],facadeInstalled:false,semanticAuthority:false,executableAdmission:false};
}
export function prepareJsonEditRemoveLeafCandidate({root=ROOT}={}){
 root=resolve(root);const census=()=>execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'],{cwd:root,maxBuffer:4*1024*1024}).toString().split('\0').filter(path=>path.endsWith('.rs')||['Cargo.toml','Cargo.lock'].includes(path.split('/').at(-1))).sort(),paths=census(),data=jsonEditFrontierSourceData(),saved=new Map();if(paths.length>8192)fail('complete Rust/Cargo source count bound');for(const row of data.completeTrackedRustCargoVectors){const bytes=readFileSync(resolve(root,row.path));if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)fail('current complete Rust/Cargo input differs: '+row.path);saved.set(row.path,bytes);}
 const proposal=proposeJsonEditRemoveLeaf({source:saved.get(PATH).toString('utf8')}),candidateInputs=[];for(const path of ['rust/src/translation_core/json_edit_candidate.rs','rust/tests/json_edit_candidate.rs','tools/translation/json-edit-candidate-runtime.mjs','tools/translation/json-edit-candidate-runtime.d.mts']){const bytes=readFileSync(resolve(root,path));saved.set(path,bytes);candidateInputs.push({path,source:bytes.toString('utf8'),sha256:hash(bytes)});}
 const currentRustCargoVectors=[];let observedBytes=0;for(const path of paths){const bytes=saved.get(path)??readFileSync(resolve(root,path));observedBytes+=bytes.length;if(bytes.length>32*1024*1024||observedBytes>256*1024*1024)fail('complete Rust/Cargo source byte bound');saved.set(path,bytes);currentRustCargoVectors.push({path,bytes:bytes.length,sha256:hash(bytes)});}if(JSON.stringify(paths)!==JSON.stringify(census()))fail('complete Rust/Cargo membership changed');
 for(const [path,bytes]of saved)if(!readFileSync(resolve(root,path)).equals(bytes))fail('complete physical source changed');jsonEditFrontierSourceData();return {...proposal,candidateInputs,completeHistoricalRustCargoVectors:data.completeTrackedRustCargoVectors,currentRustCargoVectors,sourcePacketSha256:PIN,sourceApplied:false,nativeCompilerExecuted:false,rustExecuted:false};
}
