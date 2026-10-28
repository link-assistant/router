// Fresh source proposals for pure primitive vector units. No filesystem writes,
// saved result authority, native compiler process or injected checker is used.
import {proposeOwnedVectorModuleReinput} from './owned-vector-module-reinput.mjs';
import {ownedPlainData,createOwnedCoreSourceContext,requireOwnedCoreSourceCurrent} from './owned-vector-candidate-source.mjs';
import {checkOwnedCoreProgram} from './owned-vector-candidate-operations.mjs';
import {emitOwnedVectorCandidateLiteral,ownedVectorOriginalProjectCensus} from './owned-vector-candidate-support.mjs';
import {translateProject} from '../project.mjs';
import {jsonMacroDependencyProfile} from '../json-macro-inputs.mjs';
import {deriveDependencyProfile} from '../derive-dependencies.mjs';
import {PRODUCTION_PROFILE} from '../cfg-profile.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {transportConcreteSourceEquations} from '../concrete-source-equations.mjs';
import {createRulePipeline} from '../rule-pipeline.mjs';
const fail=message=>{throw new TypeError('Owned vector native synchronization: '+message);};
const integer=name=>typeof name==='string'&&/^[iu](?:8|16|32|64|128|size)$/u.test(name);
function originalHeader(item){
 const profile=item.vectorOrigin,source=profile.original.functionSource,tokens=rustTokens(source).filter(token=>token.type!=='comment');if(tokens.length>200000)fail('bounded complete native header required');
 const fn=tokens.findIndex(token=>token.text==='fn');if(fn<0||tokens[fn+1]?.text!==profile.original.qualifiedName.split('.').at(-1))fail('actual original native function name differs');
 let open=fn+2;while(open<tokens.length&&tokens[open].text!=='(')open++;if(open===tokens.length)fail('actual original parameter list required');
 let depth=1,close=open+1;for(;close<tokens.length;close++){if(tokens[close].text==='(')depth++;if(tokens[close].text===')'&&!--depth)break;}
 if(close===tokens.length)fail('complete original parameter delimiters required');
 const segments=[];let start=open+1;for(let at=start;at<=close;at++)if(at===close||tokens[at].text===','){if(at>start)segments.push(tokens.slice(start,at));start=at+1;}
 if(segments.length!==item.params.length||profile.original.signature.params.length!==item.params.length)fail('actual original parameter census differs');
 const changes=segments.map((part,index)=>{
  const at=part[0]?.text==='mut'?1:0,name=part[at],original=profile.original.signature.params[index];
  if(!name||name.text!==original.name||part[at+1]?.text!==':'||!/^__ro_vector_input_[0-9]+$/u.test(item.params[index].rust))fail('plain original native parameter and checked receiving binder required');return {start:name.start,end:name.end,expected:name.text,replacement:item.params[index].rust};
 });
 let body=close+1;while(body<tokens.length&&tokens[body].text!=='{')body++;if(body===tokens.length||tokens.at(-1)?.text!=='}')fail('actual original complete function body required');
 let header=source.slice(0,tokens[body].start);for(const change of changes.reverse()){if(header.slice(change.start,change.end)!==change.expected)fail('original native binder span differs');header=header.slice(0,change.start)+change.replacement+header.slice(change.end);}return header;
}
const requestedItems=requestedNativeVectorTree,actualItems=actualNativeVectorTree;
export function proposeOwnedVectorNativeSynchronization(data,options){
 const original=ownedPlainData(data),start=createOwnedCoreSourceContext(original),files=new Map(original.files.map(row=>[row.path,row.source]));let primaryFailed=false,proposal,program,after,checked;
 try{
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'owned-vector:recheck-complete-pair-and-derive-actual-source-native-bodies',apply:()=>{proposal=proposeOwnedVectorModuleReinput(original,options);program=checkOwnedCoreProgram(proposal.program);const edits=[];for(const item of program){requestedItems(item);const native=item.vectorOrigin.original;if(files.get(native.path)!==native.source||native.source.slice(...native.span)!==native.functionSource)fail('actual complete original native source differs');edits.push({path:native.path,span:native.span,expected:native.functionSource,replacement:originalHeader(item)+'{\n'+emitNativeVectorControlBody(item)+'\n}'});}if(!edits.length||edits.length>4096)fail('bounded nonempty native vector units required');after=new Map(files);const grouped=new Map();for(const edit of edits){if(!grouped.has(edit.path))grouped.set(edit.path,[]);grouped.get(edit.path).push(edit);}for(const [path,rows]of grouped){rows.sort((a,b)=>a.span[0]-b.span[0]);for(let at=1;at<rows.length;at++)if(rows[at-1].span[1]>rows[at].span[0])fail('selected actual native functions overlap');let source=files.get(path);for(const row of [...rows].reverse())source=source.slice(0,row.span[0])+row.replacement+source.slice(row.span[1]);if(Buffer.byteLength(source)>8388608)fail('complete native source bound');after.set(path,source);}return after;}},
    {id:'owned-vector:fresh-forward-check-and-reproduce-every-actual-native-element',apply:()=>{const inputs={manifest:files.get('Cargo.toml'),lock:files.get('Cargo.lock')};checked=translateProject({entry:'src/lib.rs',paths:[...after.keys()].filter(path=>path.endsWith('.rs')).sort(),readSource:path=>after.get(path),compilationProfile:PRODUCTION_PROFILE,cargoManifest:inputs.manifest,jsonMacroDependencies:jsonMacroDependencyProfile(inputs).proof,deriveDependencies:deriveDependencyProfile(inputs).proof});const census=JSON.stringify(ownedVectorOriginalProjectCensus(checked));if(program.some(item=>JSON.stringify(item.vectorOrigin.forward.census)!==census))fail('complete project executable/refusal/method membership changed');for(const item of program){const native=item.vectorOrigin.original,rows=checked.executableDeclarations.filter(row=>row.source===native.path&&row.qualifiedName===native.qualifiedName);if(rows.length!==1)fail('whole proposed native function remains refused or ambiguous');const actual=rows[0].checkedSource();if(actual.source!==native.path||actual.qualifiedName!==native.qualifiedName||JSON.stringify(actualItems(actual.declaration,item))!==JSON.stringify(requestedItems(item)))fail('fresh whole native body does not reproduce the checked receiving vector');}return checked;}},
   ]},
   {phase:'repository',rules:[{id:'router:retain-complete-native-source-equations-and-uninstalled-paired-output',apply:()=>{const rustEdits=[...after].filter(([path,source])=>path.endsWith('.rs')&&source!==files.get(path)).map(([path,source])=>{const before=files.get(path),history=transportConcreteSourceEquations([{before,after:source,language:'Rust'}])[0];return {path,before,after:source,inverse:before,history};});return {schema:'router-owned-vector-native-sync-proposal-v1',sourceInputs:original.files,rustEdits,files:proposal.files,javascript:proposal.javascript,typescript:proposal.typescript,forwardJavaScript:checked.javascript,forwardTypeScript:checked.typescript,forwardMeta:checked.meta,selectedFunctions:program.map(item=>({path:item.vectorOrigin.original.path,name:item.vectorOrigin.original.qualifiedName})),selectedNativeSourceRechecked:true,nativeInstalled:false,nativeFreshnessQualified:false,receivingExecuted:false,runtimeParity:false,wholeRouterSynchronization:false,sourceAuthority:false,semanticAuthority:false,crossInvocationCache:false,rustExecuted:false};}}]},
  ]).run(null);return {...run.value,trace:run.trace};
 }catch(error){primaryFailed=true;throw error;}finally{
  let failed=false,error;try{requireOwnedCoreSourceCurrent(start);}catch(value){failed=true;error=value;}finally{files.clear();after?.clear();program=null;checked=null;proposal=null;}if(!primaryFailed&&failed)throw error;
 }
}

import {requestedNativeVectorTree,actualNativeVectorTree,emitNativeVectorControlBody} from './owned-vector-native-control.mjs';
