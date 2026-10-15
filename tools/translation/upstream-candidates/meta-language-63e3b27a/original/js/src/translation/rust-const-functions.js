// Bounded source qualification, separate from compile-time evaluation requests.
import {readRuntimeProjectData} from '../project-data-loader.js';
import {DecoratorSet} from '../decorators.js';
import {typeError} from './diagnostics.js';
import {checkRustSourceSignature} from './rust-source-signatures.js';
import {checkOwnedProgramContainers} from './owned-program-containers.js';
import {acceptRustConstFunctionModel,acceptRustConstFunctionType,acceptRustConstFunctionBinary,acceptRustConstFunctionContainer,acceptRustConstFunctionOffset,acceptRustConstFunctionInterval,acceptRustConstFunctionNameCharacter,acceptRustConstFunctionName,acceptRustConstFunctionFiniteLiteral} from './rust-const-function-rules.js';
export const RUST_CONST_FUNCTION_POLICY=readRuntimeProjectData(new URL('./data/rust-const-functions.lino',import.meta.url));
const policy=RUST_CONST_FUNCTION_POLICY;
const fail=reason=>{throw typeError('Rust const function proof: '+reason);};
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const nameAccepted=name=>typeof name==='string'&&acceptRustConstFunctionName(name)&&[...name].every((character,index)=>acceptRustConstFunctionNameCharacter(character.codePointAt(0),index===0));
const fields=(value,allowed,exact=false)=>{
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(name=>!allowed.includes(name))||Object.values(value).some(value=>value===undefined)||exact&&Object.keys(value).length!==allowed.length)fail('an owned record has unrepresented or missing fields');
};
const interval=(value,nonempty=false)=>{
 fields(value,['start','end'],true);
 if(typeof value.start!=='number'||typeof value.end!=='number'||!acceptRustConstFunctionOffset(value.start,Object.is(value.start,-0))||!acceptRustConstFunctionOffset(value.end,Object.is(value.end,-0))||!acceptRustConstFunctionInterval(value.start,value.end,nonempty))fail('a source interval has an invalid shape or offset');
};
export function checkRustConstFunctionContainers(program){
 return checkOwnedProgramContainers(program,{selectedFields:['sourceConstFunction'],acceptContainer:acceptRustConstFunctionContainer,fail});
}
export function createRustConstFunctionProof(name,keyword,functionKeyword,headerEnd,bodyEnd){
 return{model:policy.model,language:'Rust',sourceName:name,keyword:keyword.value,keywordSpan:{start:keyword.start,end:keyword.end},functionKeywordSpan:{start:functionKeyword.start,end:functionKeyword.end},headerSpan:{start:keyword.start,end:headerEnd},bodySpan:{start:headerEnd,end:bodyEnd},interpretation:structuredClone(policy.interpretation)};
}
export function checkRustConstFunctionProof(program){
 if(!checkRustConstFunctionContainers(program))return false;
 fields(program,policy.fields.program);
 if(program.sourceLanguage!=='Rust'||!(program.declarations instanceof Map)||!Array.isArray(program.items)||!program.items.length||program.main==null||(!Array.isArray(program.main.effects)||program.main.effects.length)||['imports','externals'].some(field=>Object.hasOwn(program,field)&&(!Array.isArray(program[field])||program[field].length)))fail('the model requires a complete flat Rust predicate program and an empty main');
 for(const field of ['referenceSemantics','utf16Strings','outputThreaded','abortsThreaded'])if(Object.hasOwn(program,field)&&program[field]!==false)fail('another runtime interpretation needs an independent composition proof');
 fields(program.main,['effects','span','sequentialAsync']);if(Object.hasOwn(program.main,'sequentialAsync')&&program.main.sequentialAsync!==false)fail('the main cannot be asynchronous');
 if(program.main.span!=null)interval(program.main.span);
 const entries=[...program.declarations.values()];
 if(program.items.length!==entries.length||program.items.some((entry,index)=>entry!==entries[index]))fail('the actual ordered declarations differ from the program items');
 for(const entry of entries){
  fields(entry,policy.fields.declaration);fields(entry.sourceConstFunction,policy.fields.proof,true);
  if(entry.k!=='fn'||!nameAccepted(entry.name)||(!Array.isArray(entry.modulePath)||entry.modulePath.length)||entry.recursive!==false||entry.decreasing!=null||['generated','mutual'].some(field=>Object.hasOwn(entry,field)&&entry[field]!==false)||policy.reservedOwners.includes(entry.name)||entry.fullName!==entry.name)fail('the qualification needs an original closed flat predicate declaration');
  const proof=entry.sourceConstFunction;
  if(!acceptRustConstFunctionModel(proof.model)||proof.model!==policy.model||proof.language!=='Rust'||proof.sourceName!==entry.name||proof.keyword!==policy.keyword||!same(proof.interpretation,policy.interpretation))fail('the actual const source qualification or observation boundary changed');
  for(const value of [entry.span,proof.keywordSpan,proof.functionKeywordSpan,proof.headerSpan,proof.bodySpan])interval(value,true);
  if(proof.keywordSpan.end-proof.keywordSpan.start!==policy.keyword.length||proof.functionKeywordSpan.end-proof.functionKeywordSpan.start!==policy.functionKeyword.length||proof.keywordSpan.end>proof.functionKeywordSpan.start||proof.headerSpan.start!==proof.keywordSpan.start||entry.span.start!==proof.keywordSpan.start||proof.headerSpan.end!==proof.bodySpan.start||proof.functionKeywordSpan.end>=proof.headerSpan.end||proof.bodySpan.end>entry.span.end)fail('the keyword, header and body intervals have contradictory ownership');
  if(!Array.isArray(entry.params)||entry.ret?.kind!=='bool')fail('the predicate needs actual direct primitive parameters and a Boolean result');
  fields(entry.ret,['kind'],true);for(const parameter of entry.params)fields(parameter.type,['kind'],true);
  checkRustSourceSignature(entry.sourceSignature,entry.params.map(parameter=>parameter.type),entry.ret,'Rust');
  if(entry.sourceSignature.lifetimeBindings.length)fail('lifetime binders require an independent source interpretation');
  const positions=[...entry.sourceSignature.parameters,entry.sourceSignature.result];
  for(const position of positions){
   if(!acceptRustConstFunctionType(position.type.kind)||position.wrappers.length||position.lifetimes.length||position.owner.kind!=='primitive'||position.owner.path.length!==1||position.owner.path[0]!==policy.primitiveOwners[position.type.kind]||position.owner.arguments.length)fail('the interface needs actual unwrapped primitive bool or f64 owners');
  }
  const environment=new Map();
  for(const parameter of entry.params){fields(parameter,policy.fields.parameter);if(!nameAccepted(parameter.name)||parameter.guard!=null||parameter.default!=null||environment.has(parameter.name)||policy.reservedOwners.includes(parameter.name))fail('a parameter has an unproved source owner or default');environment.set(parameter.name,parameter.type);}
  let visits=0;
  function expression(node,depth=0){
   if(++visits>100000||depth>256)fail('the predicate exceeds its semantic traversal limit');
   if(!node||!Object.hasOwn(policy.fields.expressions,node.k))fail('the expression has no primitive const predicate interpretation');
   fields(node,policy.fields.expressions[node.k]);fields(node.type,['kind'],true);
   if(!acceptRustConstFunctionType(node.type.kind))fail('the expression changes its primitive value domain');
   if(node.span!=null){interval(node.span);if(node.span.start<proof.bodySpan.start||node.span.end>proof.bodySpan.end)fail('an expression escaped its actual owned source body');}
   if(node.k==='lit'){
    if(node.type.kind==='bool'?typeof node.value!=='boolean':typeof node.value!=='string'||! /^(?:-?(?:[0-9]+(?:\.[0-9]+)?)(?:[eE][+-]?[0-9]+)?|NaN|Infinity|-Infinity)$/u.test(node.value)||!['NaN','Infinity','-Infinity'].includes(node.value)&&!acceptRustConstFunctionFiniteLiteral(Number(node.value)))fail('a literal has an invalid primitive value');
   }else if(node.k==='var'){
    if(typeof node.name!=='string'||!environment.has(node.name)||!same(environment.get(node.name),node.type))fail('a value lacks its actual primitive parameter owner');
   }else if(node.k==='unary'){
    expression(node.arg,depth+1);if(node.op!=='not'||node.type.kind!=='bool'||node.arg.type.kind!=='bool')fail('only primitive Boolean negation is admitted');
   }else{
    expression(node.left,depth+1);expression(node.right,depth+1);
    if(node.type.kind!=='bool'||!same(node.left.type,node.right.type)||!acceptRustConstFunctionBinary(node.left.type.kind,node.op)||node.domain!==undefined&&!same(node.domain,node.left.type)||node.semantics!==undefined&&node.semantics!==(node.left.type.kind==='float'?'ieee':'exact'))fail('the comparison has an unproved primitive operation or domain');
   }
  }
  expression(entry.body);if(entry.body.type.kind!=='bool')fail('the actual checked body does not return Boolean');
 }
 return true;
}
const emission=new DecoratorSet([{id:'preserve-owned-rust-const-function-keyword',level:'emitter',order:0,when:[['format','Rust']],actions:[{op:'replace',field:'source',from:policy.emission.from,to:policy.emission.to}]}]);
export function renderRustConstFunctionHeader(entry,source){return entry.sourceConstFunction===undefined?source:emission.decorate('emitter',{format:'Rust',source}).source;}
