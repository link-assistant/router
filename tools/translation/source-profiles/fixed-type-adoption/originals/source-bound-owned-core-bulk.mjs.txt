// Explicit source proposal routing. Each original adopter checks its own inputs.
// Stream complete proposals without accumulating all prior module graphs/CSTs.
import {types} from 'node:util';
import {compilationProfile,PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {formattingPacketIO as IO} from './formatting-packet-io.mjs';
export const SOURCE_BOUND_OWNED_CORE_STAGES=Object.freeze(["algebraic","base64","integer-methods","json-collections","json-fields","json-iterations","json-loops","json-parse","json-readers","json-updates","json","literal-text","owned-carriers","owned-result-methods","primitive-option-callback-methods","primitive-option-methods","primitive-result-methods","primitives","text-methods","json-indices","json-copies"]);
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
 case "text-methods":return (await import("./source-bound-owned-migrate-core-text-methods.mjs"))["proposeCoreTextMethodCorpus"](options);
 case "json-indices":return (await import("./source-bound-owned-migrate-core-json-indices.mjs"))["proposeCoreJsonIndicesCorpus"](options);
 case "json-copies":return (await import("./source-bound-owned-migrate-core-json-copies.mjs"))["proposeCoreJsonCopiesCorpus"](options);
 default:fail('unknown fixed adoption stage');
 }
}
export async function* proposeSourceBoundOwnedCoreStages(input){
 const request=ownSnapshot(input,'bulk request',['entry','files','dependencyInputs','compilationProfile','stages'],5),options=request.value;
 if(!Object.hasOwn(options,'files')||!Object.hasOwn(options,'dependencyInputs')||!Object.hasOwn(options,'stages'))fail('complete source Cargo and stage inputs required');
 const original=sourceSnapshot(options.files),cargo=ownSnapshot(options.dependencyInputs,'Cargo',['manifest','lock'],2),names=stageNames(options.stages),profile=compilationProfile(options.compilationProfile??PRODUCTION_PROFILE);
 if(Object.keys(cargo.value).length!==2||['manifest','lock'].some(key=>typeof cargo.value[key]!=='string'||cargo.value[key].length>IO.limits.fileUnits||Buffer.byteLength(cargo.value[key])>IO.limits.fileBytes))fail('complete bounded Cargo source required');
 const candidates=['rust/src/lib.rs','src/lib.rs'].filter(path=>Object.hasOwn(original.value,path)),entry=options.entry??(candidates.length===1?candidates[0]:null);
 if(typeof entry!=='string'||!Object.hasOwn(original.value,entry))fail('one explicit original entry required');IO.pathName(entry);
 const verify=()=>{request.verify();original.verify();cargo.verify();if(!same(stageNames(options.stages),names)||JSON.stringify(compilationProfile(options.compilationProfile??PRODUCTION_PROFILE))!==JSON.stringify(profile))fail('original stage/profile inputs changed');};
 let current=original.value;
 for(let index=0;index<names.length;index++){
  verify();const stage=names[index],proposal=await proposeSourceBoundOwnedCoreStage(stage,{entry,files:current,dependencyInputs:cargo.value,compilationProfile:profile});verify();
  const before=sourceSnapshot(proposal.before).value,after=sourceSnapshot(proposal.after).value,paths=Object.keys(current).sort();
  if(!same(Object.keys(before).sort(),paths)||!same(Object.keys(after).sort(),paths)||paths.some(path=>before[path]!==current[path]))fail('whole stage before/after source association differs');
  // Capture independent next strings before yielding mutable proposal DATA.
  // The caller may retain or release a complete packet; no history is cached.
  current=after;
  yield {schema:'source-bound-owned-core-stage-packet-v1',index,stage,entry,proposal,semanticAuthority:false,executableAdmission:false,sourceInverseIsReverseExecution:false,applicationSourcesInstalled:false,newAcrossInvocationCache:false};
  verify();
 }
}
