// Experimental owned value-state facts. Existing types and operators keep their meaning.
import {readRuntimeProjectData} from '../project-data-loader.js';
import {typeError} from './diagnostics.js';
import {sameType} from './types.js';
import {checkRustSourceSignature} from './rust-source-signatures.js';
import {checkOwnedProgramContainers} from './owned-program-containers.js';
import {checkProgramDeclarationOwners} from '../typed-program-declaration-owners.js';
import {acceptProgramOrderedPosition} from '../program-numeric-metadata-rules.js';
import {acceptRustOwnedLocalExpression,acceptRustOwnedLocalBinaryOperation,acceptRustOwnedLocalContainer,acceptRustOwnedLocalRecordValue,acceptRustOwnedLocalSourceSpan} from './rust-owned-local-state-rules.js';
import {ownedLocalType,ownedLocalPair,ownedLocalPosition} from './rust-owned-local-domains.js';
export {ownedLocalType,ownedLocalPair,ownedLocalPosition} from './rust-owned-local-domains.js';
import {acceptRustOwnedTupleCallModel} from './rust-owned-tuple-call-rules.js';
import {RUST_OWNED_TUPLE_CALL_POLICY as callPolicy,ownedTupleCallPairPosition,ownedTupleCallParameters,checkOwnedTupleCallTarget} from './rust-owned-tuple-calls.js';
export const RUST_OWNED_LOCAL_STATE_POLICY=readRuntimeProjectData(new URL('./data/rust-owned-local-state.lino',import.meta.url));
const policy=RUST_OWNED_LOCAL_STATE_POLICY;
const fail=reason=>{throw typeError('Rust owned local state proof: '+reason);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const exact=(value,fields)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==fields.length||fields.some(field=>!Object.hasOwn(value,field)))fail('unrecognized or missing owned fields');};
const sourceInterval=span=>Boolean(span&&same(Object.keys(span).sort(),['end','start'])&&[span.start,span.end].every(value=>Number.isSafeInteger(value)&&value>=0)&&span.start<span.end);
function matchRustOwnedLocalOccurrencePath(actual,recorded){
 return Array.isArray(actual)&&Array.isArray(recorded)&&actual.length===recorded.length&&actual.every((part,index)=>{
  const value=recorded[index];
  return typeof part==='string'?typeof value==='string'&&part===value
   :typeof part==='number'&&typeof value==='number'&&acceptProgramOrderedPosition(value,part+1)&&part===value;
 });
}

/** Reject host facts the selected semantic archive cannot represent before reading them. */
export function checkRustOwnedLocalStateContainers(program){
 return checkOwnedProgramContainers(program,{acceptContainer:acceptRustOwnedLocalContainer,fail,selectedFields:policy.containerMarkerFields});
}

/** Check actual contextual Boolean and optional source-span shapes before projection. */
export function checkRustOwnedLocalStateRecordShapes(program){
 if(!checkRustOwnedLocalStateContainers(program))return false;
 const visited=new WeakSet();
 function inspect(value){
  if(!value||typeof value!=='object'||visited.has(value))return;
  visited.add(value);
  if(value instanceof Map){for(const child of Map.prototype.values.call(value))inspect(child);return;}
  if(Array.isArray(value)){for(const child of value)inspect(child);return;}
  const context=value===program?'program':value===program.main?'main':typeof value.k==='string'?value.k:'';
  for(const[field,child]of Object.entries(value)){
   if(!acceptRustOwnedLocalRecordValue((policy.recordBooleanFields[context]??[]).includes(field),typeof child==='boolean'))fail('a contextual flag has a non-Boolean value');
   if(field==='span'){
    const present=child!=null;
    const recordShape=Boolean(child&&typeof child==='object'&&!Array.isArray(child)&&Object.keys(child).length===2&&Object.hasOwn(child,'start')&&Object.hasOwn(child,'end'));
    const offsetShape=recordShape&&Number.isSafeInteger(child.start)&&Number.isSafeInteger(child.end)&&child.start>=0&&child.end>=child.start&&child.end<=policy.sourceOffsetMaximum&&!Object.is(child.start,-0)&&!Object.is(child.end,-0);
    if(!acceptRustOwnedLocalSourceSpan(present,recordShape,offsetShape))fail('a source span has an invalid owned shape or offset');
   }
   inspect(child);
  }
 }
 inspect(program);
 return true;
}

function bodyRecords(body){
 const bindings=[],reads=[],constructors=[];let visits=0;
 function visit(node,path){
  if(++visits>100000||path.length>256)fail('body exceeds its traversal limit');
  if(node.k==='let'){visit(node.value,[...path,'value']);bindings.push({node,path});visit(node.body,[...path,'body']);return;}
  if(node.k==='var'&&node.type.kind==='string'){reads.push({node,path,binding:node.name});return;}
  if(node.k==='lit'&&node.type.kind==='string'){constructors.push({node,path});return;}
  if(node.k==='tupleIndex'){if(node.type.kind==='string'&&node.object.k==='var')reads.push({node,path,binding:node.object.name+'.'+node.index});return;}
  for(const key of['arg','left','right','cond','then','else'])if(node[key])visit(node[key],[...path,key]);
  for(const[index,item]of(node.items??[]).entries())visit(item,[...path,'items',index]);
  for(const[index,arg]of(node.args??[]).entries())visit(arg,[...path,'args',index]);
 }
 visit(body,[]);return{bindings,reads,constructors};
}
export function prepareRustOwnedLocalStateProof(proof,body){
 const value=structuredClone(proof),records=bodyRecords(body),used=new Set();
 for(const binding of value.bindings){
  if(binding.path!==null)continue;
  const found=records.bindings.filter(record=>record.node.name===binding.name);if(found.length!==1)fail('each local version needs its actual unique checked binder');binding.path=found[0].path;
 }
 for(const read of value.reads){
  if(read.path!==null)continue;
  const found=records.reads.find(record=>!used.has(JSON.stringify(record.path))&&record.binding===read.binding&&same(record.node.span??null,read.span));if(!found)fail('every source move or copy needs its actual checked value occurrence');used.add(JSON.stringify(found.path));read.path=found.path;
 }
 for(const initializer of value.initializers){if(initializer.path===null)initializer.path=value.bindings.find(binding=>binding.name===initializer.binding)?.path??null;}
 for(const constructor of value.literalConstructors){
  if(constructor.path!==null)continue;
  const found=records.constructors.find(record=>same(record.node.span??null,constructor.span));if(!found)fail('a standard constructor needs its actual checked String literal occurrence');constructor.path=found.path;
 }
 return value;
}

export function checkRustOwnedLocalStateProof(program){
 checkRustOwnedLocalStateRecordShapes(program);
 const entries=[...program.declarations.values()];if(!entries.some(entry=>Object.hasOwn(entry,'sourceLocalState')))return;
 if(program.sourceLanguage!=='Rust'||program.items.some(item=>item.k!=='fn')||program.main?.effects?.length||program.imports?.length||program.externals?.length||['referenceSemantics','utf16Strings','outputThreaded','abortsThreaded'].some(field=>Object.hasOwn(program,field)&&program[field]!==false))fail('the profile requires a complete flat value program without imports, effects or other runtime interpretations');
 checkProgramDeclarationOwners(program);
 for(const entry of entries){
  if(Object.keys(entry).some(field=>!policy.declarationFields.includes(field))||Object.values(entry).some(value=>value===undefined))fail('a function has unrepresented own fields');
  if(entry.k!=='fn'||!Array.isArray(entry.modulePath)||entry.modulePath.length||entry.recursive!==false||Object.hasOwn(entry,'generated')&&entry.generated!==false||Object.hasOwn(entry,'mutual')&&entry.mutual!==false||entry.decreasing!=null||Object.hasOwn(entry,'sourceLoop')||Object.hasOwn(entry,'sourcePrimitiveOwners')||policy.reservedOwners.includes(entry.name))fail('a function has an unsupported declaration or standard owner context');
  const proof=entry.sourceLocalState;exact(proof,policy.fields.proof);
  if(!sourceInterval(entry.span))fail('the function must retain its actual nonempty source-owner interval');
  const copies=proof.model===policy.models.copies,calls=acceptRustOwnedTupleCallModel(proof.model),helper=calls&&ownedLocalPair(entry.ret);
  const interpretation={...policy.interpretation,...(calls?{tupleInitialization:callPolicy.interpretation}:{})};
  if(!copies&&!calls&&proof.model!==policy.models.moves||proof.language!=='Rust'||proof.sourceName!==entry.name||!same(proof.interpretation,interpretation))fail('the owned model or explicit value observation boundary is inconsistent');
  checkRustSourceSignature(entry.sourceSignature,entry.params.map(parameter=>parameter.type),entry.ret,'Rust');
  if(entry.params.some(parameter=>Object.keys(parameter).some(field=>!policy.parameterFields.includes(field))||Object.values(parameter).some(value=>value===undefined)))fail('a parameter has unrepresented own fields');
  if(entry.ret.kind!=='string'&&!helper||entry.sourceSignature.lifetimeBindings.length||entry.sourceSignature.parameters.some(position=>!ownedLocalPosition(position))||!(helper?ownedTupleCallPairPosition(entry.sourceSignature.result)&&ownedTupleCallParameters(entry.params):ownedLocalPosition(entry.sourceSignature.result))||entry.params.some(parameter=>parameter.guard!=null||parameter.default!=null||Object.hasOwn(parameter,'optional')))fail('the actual standard interface and signed i32 domain must remain unchanged');
  if(!Array.isArray(proof.bindings)||!Array.isArray(proof.reads)||!Array.isArray(proof.initializers)||!Array.isArray(proof.literalConstructors))fail('state facts must retain their ordered roles');
  const records=bodyRecords(entry.body),bindings=new Map(),reads=new Map(),sourceNames=new Set(entry.params.map(parameter=>parameter.name));
  if(sourceNames.size!==entry.params.length||[...sourceNames].some(name=>policy.reservedOwners.includes(name)))fail('parameters must retain their distinct unshadowed source owners');
  if(records.bindings.length!==proof.bindings.length||records.reads.length!==proof.reads.length)fail('the owned state proof must cover every actual binder and String occurrence');
  for(const[index,binding]of proof.bindings.entries()){
   exact(binding,policy.fields.binding);
   const key=JSON.stringify(binding.path),record=records.bindings.find(record=>matchRustOwnedLocalOccurrencePath(record.path,binding.path));
   if(!record||!matchRustOwnedLocalOccurrencePath(record.path,records.bindings[index].path)||record.node.name!==binding.name||bindings.has(key)||!sameType(record.node.value.type,binding.type)||typeof binding.mutable!=='boolean'||!policy.roles.includes(binding.role)||typeof binding.sourceName!=='string'||!binding.sourceName||policy.reservedOwners.includes(binding.sourceName))fail('a local version contradicts its actual binding, order or value domain');
   if(copies&&(binding.mutable||['replacement','join'].includes(binding.role)))fail('canonical copies do not claim original mutable source bindings');
   if(!ownedLocalType(binding.type)&&!ownedLocalPair(binding.type))fail('a binding changes its actual text or signed i32 domain');
   if(!['replacement','join'].includes(binding.role)){
    if(binding.sourceName!==binding.name||sourceNames.has(binding.sourceName))fail('an original local owner must match its distinct actual source binder');
    sourceNames.add(binding.sourceName);
   }
   bindings.set(key,binding);
  }
  for(const[index,read]of proof.reads.entries()){
   exact(read,policy.fields.read);const key=JSON.stringify(read.path),record=records.reads.find(record=>matchRustOwnedLocalOccurrencePath(record.path,read.path));
   if(!record||!matchRustOwnedLocalOccurrencePath(record.path,records.reads[index].path)||record.binding!==read.binding||reads.has(key)||!sameType(read.type,record.node.type)||!same(read.span,record.node.span??null)||!policy.readModes.includes(read.mode)||!copies&&read.mode!=='move')fail('an owned move or copy disagrees with its actual occurrence and interpretation');
   reads.set(key,read);
  }
  if(!copies&&!helper&&(proof.initializers.length!==1||!proof.bindings.some(binding=>binding.role==='replacement')))fail('the original model requires one actual mutable tuple initialization and replacement');
  if(helper&&(entry.body.k!=='tuple'||proof.initializers.length||proof.bindings.length))fail('a tuple helper must retain one direct ordered product result without local state or calls');
  if(copies&&proof.initializers.length)fail('canonical immutable output does not counterfeit original tuple state');
  if(records.constructors.length!==proof.literalConstructors.length)fail('each owned String literal needs its actual standard constructor site');
  for(const[index,constructor]of proof.literalConstructors.entries()){
   exact(constructor,policy.fields.constructor);
   const record=records.constructors[index],{span,callSpan,path,...owner}=constructor;
   if(!same(owner,policy.constructor)||!matchRustOwnedLocalOccurrencePath(record.path,path)||!same(record.node.span??null,span)||!sourceInterval(span)||!sourceInterval(callSpan)||callSpan.start>=span.start||callSpan.end<=span.end||callSpan.start<entry.span.start||callSpan.end>entry.span.end)fail('the standard constructor owner or its actual literal site changed');
  }
  for(const initializer of proof.initializers){
   exact(initializer,calls?callPolicy.initializerFields:policy.fields.initializer);const binding=bindings.get(JSON.stringify(initializer.path));
   if(!binding||binding.name!==initializer.binding||binding.role!=='tuple initializer'||!Array.isArray(initializer.fields)||initializer.fields.length!==2||new Set(initializer.fields).size!==2)fail('the initializer must own its once-evaluated tuple and ordered field slots');
   if(calls){const record=records.bindings.find(record=>matchRustOwnedLocalOccurrencePath(record.path,initializer.path));checkOwnedTupleCallTarget(program,entry,record.node.value,initializer,fail);}
  }
  let visits=0,mutable=null;
  const clone=scope=>new Map([...scope].map(([name,value])=>[name,{...value,fields:value.fields?.map(field=>({...field}))}]));
  function readValue(node,path,scope){
   const key=JSON.stringify(path),fact=reads.get(key),name=node.k==='var'?node.name:node.object.name,entry=scope.get(name),value=node.k==='var'?entry:entry?.fields?.[node.index];
   if(!value?.available)fail('a moved String or tuple field is used again');
   if(!fact||fact.binding!==(node.k==='var'?name:name+'.'+node.index))fail('a String use lacks its actual owned source occurrence');
   if(fact.mode==='move')value.available=false;
  }
  function expression(node,path,scope,state=new Map(),expectedJoin=null){
   if(++visits>100000||path.length>256)fail('state proof exceeds its semantic traversal limit');
   const fields=calls&&node?.k==='call'?callPolicy.callFields:policy.expressions[node?.k];
   if(!node||!acceptRustOwnedLocalExpression(node.k)&&!(calls&&node.k==='call')||!fields||Object.keys(node).some(field=>!fields.includes(field))||Object.values(node).some(value=>value===undefined)||(!ownedLocalType(node.type)&&!ownedLocalPair(node.type)))fail('an expression has an unsupported value shape or domain');
   if(node.k==='lit'){
    if(node.type.kind==='string'&&typeof node.value!=='string'||node.type.kind==='bool'&&typeof node.value!=='boolean')fail('a primitive literal differs from its actual value domain');
    if(node.type.kind==='fixed'&&(typeof node.value!=='string'||!/^[-]?\d+$/u.test(node.value)||BigInt(node.value)<-2147483648n||BigInt(node.value)>2147483647n))fail('an integer literal exceeds its actual signed i32 domain');
    if(node.type.kind==='string'&&Array.from(node.value).some(character=>{const code=character.codePointAt(0);return code>=0xd800&&code<=0xdfff;}))fail('text literals must remain valid Unicode scalar String values');
    return;
   }
   if(node.k==='var'){
    const value=scope.get(node.name);if(!value||!sameType(value.type,node.type))fail('a value has no actual lexical owner');
    if(node.type.kind==='tuple')fail('whole tuple reads need their own partial-move proof');
    if(expectedJoin&&node.name!==state.get(expectedJoin))fail('a conditional state result must be its current owned String slot');
    if(node.type.kind==='string')readValue(node,path,scope);return;
   }
   if(node.k==='tupleIndex'){
    if(!node.object||Object.keys(node.object).some(field=>!policy.expressions.var.includes(field))||Object.values(node.object).some(value=>value===undefined))fail('tuple field layout or lexical ownership changed');
    if(node.object.k!=='var'||![0,1].includes(node.index)||!ownedLocalPair(node.object.type)||!scope.has(node.object.name)||!sameType(scope.get(node.object.name).type,node.object.type)||!sameType(node.type,node.object.type.elements[node.index]))fail('tuple field layout or lexical ownership changed');
    if(node.type.kind==='string')readValue(node,path,scope);return;
   }
   if(node.k==='tuple'){
    if(!ownedLocalPair(node.type)||node.items.length!==2)fail('an initializer has the wrong owned tuple layout');
    if(node.items.some((item,index)=>!sameType(item.type,node.type.elements[index])))fail('an actual tuple item differs from its declared owned field type');
    node.items.forEach((item,index)=>expression(item,[...path,'items',index],scope,state));return;
   }
   if(calls&&node.k==='call'){
    const fact=proof.initializers.find(initializer=>matchRustOwnedLocalOccurrencePath([...initializer.path,'value'],path));
    checkOwnedTupleCallTarget(program,entry,node,fact,fail);
    node.args.forEach((arg,index)=>expression(arg,[...path,'args',index],scope,state));return;
   }
   if(node.k==='binary'){
    if(!acceptRustOwnedLocalBinaryOperation(node.op)||node.type.kind!=='bool'||!ownedLocalType(node.left.type)||node.left.type.kind==='string'||!sameType(node.left.type,node.right.type)
     ||(node.domain!=null&&(!ownedLocalType(node.domain)||!sameType(node.domain,node.left.type))))fail('only exact equality in the actual Boolean/i32 domain is admitted');
    expression(node.left,[...path,'left'],scope,state);expression(node.right,[...path,'right'],scope,state);return;
   }
   if(node.k==='toString'){if(node.type.kind!=='string'||node.arg.k!=='lit'||node.arg.type.kind!=='string')fail('the constructor must be an actual standard literal String value');expression(node.arg,[...path,'arg'],scope,state);return;}
   if(node.k==='if'){
    if(node.cond.type.kind!=='bool')fail('a condition must retain its actual Boolean type');
    expression(node.cond,[...path,'cond'],scope,state);const thenScope=clone(scope),elseScope=clone(scope);expression(node.then,[...path,'then'],thenScope,new Map(state),expectedJoin);expression(node.else,[...path,'else'],elseScope,new Map(state),expectedJoin);
    if(!sameType(node.then.type,node.type)||!sameType(node.else.type,node.type))fail('actual conditional branches differ from their declared result type');
    for(const[name,value]of scope){value.available=value.available&&thenScope.get(name).available&&elseScope.get(name).available;value.fields?.forEach((field,index)=>{field.available=field.available&&thenScope.get(name).fields[index].available&&elseScope.get(name).fields[index].available;});}return;
   }
   const fact=bindings.get(JSON.stringify(path));if(!fact||scope.has(node.name))fail('each actual version requires its distinct lexical owner');
   expression(node.value,[...path,'value'],scope,state,fact.role==='join'?fact.sourceName:null);
   const inner=clone(scope),next=new Map(state);
   if(fact.role==='tuple field'){
    if(!proof.initializers.some(initializer=>initializer.binding===fact.initializer&&initializer.fields[fact.index]===fact.sourceName)||node.value.k!=='tupleIndex'||node.value.object.name!==fact.initializer||node.value.index!==fact.index||fact.mutable!==(fact.index===0))fail('the once-evaluated tuple field and source mutability were changed');
    if(fact.mutable){if(mutable&&mutable!==fact.sourceName)fail('only one tuple-owned mutable String slot is admitted');mutable=fact.sourceName;next.set(fact.sourceName,node.name);}
   }else if(['replacement','join'].includes(fact.role)){
    if(fact.sourceName!==mutable||fact.previous!==state.get(mutable)||fact.type.kind!=='string'||fact.mutable||fact.role==='join'&&node.value.k!=='if')fail('replacement order or state ownership changed');
    if(inner.has(fact.previous))inner.get(fact.previous).available=false;next.set(mutable,node.name);
   }else if(fact.mutable||fact.previous!==null||fact.initializer!==null||fact.index!==null)fail('an immutable binding has contradictory source state fields');
   const value={type:node.value.type,available:true};if(ownedLocalPair(value.type))value.fields=[{type:{kind:'string'},available:true},{type:value.type.elements[1],available:true}];inner.set(node.name,value);
   expression(node.body,[...path,'body'],inner,next,expectedJoin);
   if(!sameType(node.body.type,node.type))fail('the actual local body differs from its declared result type');
   for(const[name,value]of scope){value.available=value.available&&inner.get(name).available;value.fields?.forEach((field,index)=>{field.available=field.available&&inner.get(name).fields[index].available;});}
  }
  expression(entry.body,[],new Map(entry.params.map(parameter=>[parameter.name,{type:parameter.type,available:true}])));
  if(!sameType(entry.body.type,entry.ret))fail('the actual function body differs from its declared result type');
 }
}
