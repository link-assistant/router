// Explicit source proposal routing. Each original adopter checks its own inputs.
// Stream complete proposals without accumulating all prior module graphs/CSTs.
import {types} from 'node:util';
import {compilationProfile,PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {formattingPacketIO as IO} from './formatting-packet-io.mjs';
export const SOURCE_BOUND_OWNED_CORE_STAGES=Object.freeze(["algebraic","base64","integer-methods","json-collections","json-fields","json-iterations","json-loops","json-parse","json-readers","json-updates","json","literal-text","owned-carriers","owned-result-methods","primitive-option-callback-methods","primitive-option-methods","primitive-result-methods","primitives","text-methods","fixed-types","json-indices","json-copies"]);
const fail=message=>{throw new TypeError('Source-bound owned core bulk: '+message);};
const same=(a,b)=>a.length===b.length&&a.every((value,at)=>value===b[at]);
function ownSnapshot(input,label,allowed=null,bound=1024){
 if(!input||typeof input!=='object'||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('ordinary own '+label+' data required');
 const parent=Object.getPrototypeOf(input),keys=Reflect.ownKeys(input),rows=[];
 if(keys.length>bound||keys.some(key=>typeof key!=='string'||allowed&&!allowed.includes(key)))fail(label+' fields differ');
 const value=Object.create(null);for(const key of keys){const field=Object.getOwnPropertyDescriptor(input,key);if(!field||!Object.hasOwn(field,'value'))fail(label+' accessors refused');value[key]=field.value;rows.push([key,field]);}
 return {value,verify(){if(Object.getPrototypeOf(input)!==parent||!same(Reflect.ownKeys(input),keys))fail(label+' changed');for(const [key,original]of rows){const current=Object.getOwnPropertyDescriptor(input,key);if(!current||!Object.hasOwn(current,'value')||current.value!==original.value||current.enumerable!==original.enumerable||current.writable!==original.writable||current.configurable!==original.configurable)fail(label+' changed');}}};
}
function sourceSnapshot(input){
 const captured=ownSnapshot(input,'source map',null,IO.limits.files),paths=Object.keys(captured.value).sort();let units=0;
 if(!paths.length)fail('complete source map required');
 for(const path of paths){IO.pathName(path);const source=captured.value[path];if(!path.endsWith('.rs')||typeof source!=='string'||source.length>IO.limits.fileUnits||Buffer.byteLength(source)>IO.limits.fileBytes||(units+=source.length)>IO.limits.sourceUnits)fail('original complete source bounds exceeded');}
 return captured;
}
function stageNames(input){
 if(!Array.isArray(input)||types.isProxy(input)||Object.getPrototypeOf(input)!==Array.prototype||input.length<1||input.length>SOURCE_BOUND_OWNED_CORE_STAGES.length||Reflect.ownKeys(input).length!==input.length+1)fail('bounded dense unique stage sequence required');
 const result=[];for(let at=0;at<input.length;at++){const field=Object.getOwnPropertyDescriptor(input,String(at));if(!field||!Object.hasOwn(field,'value')||typeof field.value!=='string'||!SOURCE_BOUND_OWNED_CORE_STAGES.includes(field.value)||result.includes(field.value))fail('known unique own stage names required');result.push(field.value);}return result;
}
export async function proposeSourceBoundOwnedCoreStage(stage,options){
 if(typeof stage!=='string')fail('explicit known stage required');
 switch(stage){
 case "algebraic":return (await import("./source-bound-owned-migrate-core-algebraic.mjs"))["proposeCoreAlgebraicCorpus"](options);
 case "base64":return (await import("./source-bound-owned-migrate-core-base64.mjs"))["proposeCoreBase64Corpus"](options);
 case "integer-methods":return (await import("./source-bound-owned-migrate-core-integer-methods.mjs"))["proposeCoreIntegerMethodCorpus"](options);
 case "json-collections":return (await import("./source-bound-owned-migrate-core-json-collections.mjs"))["proposeCoreJsonCollectionsCorpus"](options);
 case "json-fields":return (await import("./source-bound-owned-migrate-core-json-fields.mjs"))["proposeCoreJsonFieldCorpus"](options);
 case "json-iterations":return (await import("./source-bound-owned-migrate-core-json-iterations.mjs"))["proposeCoreJsonIterationCorpus"](options);
 case "json-loops":return (await import("./source-bound-owned-migrate-core-json-loops.mjs"))["proposeCoreJsonLoopCorpus"](options);
 case "json-parse":return (await import("./source-bound-owned-migrate-core-json-parse.mjs"))["proposeCoreJsonParseCorpus"](options);
 case "json-readers":return (await import("./source-bound-owned-migrate-core-json-readers.mjs"))["proposeCoreJsonReadersCorpus"](options);
 case "json-updates":return (await import("./source-bound-owned-migrate-core-json-updates.mjs"))["proposeCoreJsonUpdateCorpus"](options);
 case "json":return (await import("./source-bound-owned-migrate-core-json.mjs"))["proposeCoreJsonCorpus"](options);
 case "literal-text":return (await import("./source-bound-owned-migrate-core-literal-text.mjs"))["proposeCoreLiteralTextCorpus"](options);
 case "owned-carriers":return (await import("./source-bound-owned-migrate-core-owned-carriers.mjs"))["proposeCoreOwnedCarrierCorpus"](options);
 case "owned-result-methods":return (await import("./source-bound-owned-migrate-core-owned-result-methods.mjs"))["proposeCoreOwnedResultMethodCorpus"](options);
 case "primitive-option-callback-methods":return (await import("./source-bound-owned-migrate-core-primitive-option-callback-methods.mjs"))["proposeCorePrimitiveOptionCallbackMethodCorpus"](options);
 case "primitive-option-methods":return (await import("./source-bound-owned-migrate-core-primitive-option-methods.mjs"))["proposeCorePrimitiveOptionMethodCorpus"](options);
 case "primitive-result-methods":return (await import("./source-bound-owned-migrate-core-primitive-result-methods.mjs"))["proposeCorePrimitiveResultMethodCorpus"](options);
 case "primitives":return (await import("./source-bound-owned-migrate-core-primitives.mjs"))["proposeCorePrimitivesCorpus"](options);
 case "fixed-types":return (await import("./source-bound-owned-migrate-core-fixed-types.mjs"))["proposeCoreFixedTypesCorpus"](options);
 case "text-methods":return (await import("./source-bound-owned-migrate-core-text-methods.mjs"))["proposeCoreTextMethodCorpus"](options);
 case "json-indices":return (await import("./source-bound-owned-migrate-core-json-indices.mjs"))["proposeCoreJsonIndicesCorpus"](options);
 case "json-copies":return (await import("./source-bound-owned-migrate-core-json-copies.mjs"))["proposeCoreJsonCopiesCorpus"](options);
 default:fail('unknown fixed adoption stage');
 }
}
export const SOURCE_BOUND_CORE_FIXED_POINT_LIMITS=Object.freeze({rounds:4});
export async function* proposeSourceBoundOwnedCoreFixedPointStages(input){
 const request=ownSnapshot(input,'bulk request',['entry','files','dependencyInputs','compilationProfile','stages'],5),options=request.value;
 if(!Object.hasOwn(options,'files')||!Object.hasOwn(options,'dependencyInputs')||!Object.hasOwn(options,'stages'))fail('complete source Cargo and stage inputs required');
 const original=sourceSnapshot(options.files),cargo=ownSnapshot(options.dependencyInputs,'Cargo',['manifest','lock'],2),names=stageNames(options.stages),profile=compilationProfile(options.compilationProfile??PRODUCTION_PROFILE);
 if(Object.keys(cargo.value).length!==2||['manifest','lock'].some(key=>typeof cargo.value[key]!=='string'||cargo.value[key].length>IO.limits.fileUnits||Buffer.byteLength(cargo.value[key])>IO.limits.fileBytes))fail('complete bounded Cargo source required');
 const candidates=['rust/src/lib.rs','src/lib.rs'].filter(path=>Object.hasOwn(original.value,path)),entry=options.entry??(candidates.length===1?candidates[0]:null);
 if(typeof entry!=='string'||!Object.hasOwn(original.value,entry))fail('one explicit original entry required');IO.pathName(entry);
 const verify=()=>{request.verify();original.verify();cargo.verify();if(!same(stageNames(options.stages),names)||JSON.stringify(compilationProfile(options.compilationProfile??PRODUCTION_PROFILE))!==JSON.stringify(profile))fail('original stage/profile inputs changed');};
 let current=original.value,index=0;
 for(let round=0;round<SOURCE_BOUND_CORE_FIXED_POINT_LIMITS.rounds;round++){
  let changed=false;
  for(let stageIndex=0;stageIndex<names.length;stageIndex++){
   verify();const stage=names[stageIndex],proposal=await proposeSourceBoundOwnedCoreStage(stage,{entry,files:current,dependencyInputs:cargo.value,compilationProfile:profile});verify();
   const before=sourceSnapshot(proposal.before).value,after=sourceSnapshot(proposal.after).value,paths=Object.keys(current).sort();
   if(!same(Object.keys(before).sort(),paths)||!same(Object.keys(after).sort(),paths)||paths.some(path=>before[path]!==current[path]))fail('whole stage before/after source association differs');
   const changedFiles=paths.filter(path=>before[path]!==after[path]);if(changedFiles.length)changed=true;current=after;
   yield {schema:'source-bound-owned-core-fixed-point-stage-v1',index:index++,round,stageIndex,stage,entry,changedFiles,proposal,semanticAuthority:false,executableAdmission:false,sourceInverseIsReverseExecution:false,applicationSourcesInstalled:false,newAcrossInvocationCache:false};verify();
  }
  if(!changed){verify();yield {schema:'source-bound-owned-core-fixed-point-receipt-v1',entry,rounds:round+1,iterations:index,stages:[...names],stabilized:true,coverageComplete:false,runtimeParity:false,semanticAuthority:false,executableAdmission:false,applicationSourcesInstalled:false,newAcrossInvocationCache:false};verify();return;}
 }
 fail('source substitutions did not stabilize within the fixed four-round source limit; no complete receipt issued');
}
// Keep complete packet storage in the caller; retain only current strings and
// bounded scalar receipts here. Nothing is installed or semantically admitted.
export async function collectSourceBoundOwnedCoreFixedPoint(input,onPacket=null){
 if(onPacket!==null&&typeof onPacket!=='function')fail('ordinary packet observer function required');let files=null,receipt=null;const stages=[];
 for await(const packet of proposeSourceBoundOwnedCoreFixedPointStages(input)){
  if(packet.schema==='source-bound-owned-core-fixed-point-stage-v1'){
   const snapshot=sourceSnapshot(packet.proposal.after),row={index:packet.index,round:packet.round,stageIndex:packet.stageIndex,stage:packet.stage,changedFiles:[...packet.changedFiles]};files=snapshot.value;stages.push(row);if(onPacket)await onPacket(packet);snapshot.verify();
  }else if(packet.schema==='source-bound-owned-core-fixed-point-receipt-v1'){
   const original=ownSnapshot(packet,'fixed point receipt',null,32),names=stageNames(packet.stages);receipt={...original.value,stages:names};if(onPacket)await onPacket(packet);original.verify();if(!same(stageNames(packet.stages),names))fail('complete receipt stages changed');
  }else fail('unknown fixed point source packet');
 }
 if(!files||!receipt||receipt.stabilized!==true)fail('complete unchanged-round source receipt required');return {schema:'source-bound-owned-core-fixed-point-source-v1',files,receipt,stages,sourceAuthority:false,semanticAuthority:false,executableAdmission:false,receivingExecuted:false,applicationSourcesInstalled:false,newAcrossInvocationCache:false};
}
