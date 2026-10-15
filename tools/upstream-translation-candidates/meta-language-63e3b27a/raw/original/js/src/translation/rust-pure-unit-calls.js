// Thin source and checked-program adapters for the selected linked policy.
import {readRuntimeProjectData} from '../project-data-loader.js';
import {unsupported,typeError} from './diagnostics.js';
import {UNIT} from './types.js';
import {acceptRustPureUnitCallModel,acceptRustPureUnitNameCharacter,acceptRustPureUnitName,acceptRustPureUnitHeaderForm,acceptRustPureUnitBodyForm,acceptRustPureUnitPathForm,acceptRustPureUnitContext,acceptRustPureUnitContainer,acceptRustPureUnitVisibility,acceptRustPureUnitSourceOffset} from './rust-pure-unit-call-rules.js';
export const RUST_PURE_UNIT_CALL_POLICY=readRuntimeProjectData(new URL('./data/rust-pure-unit-calls.lino',import.meta.url));
const policy=RUST_PURE_UNIT_CALL_POLICY;
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const fail=detail=>{throw typeError('Rust pure Unit-call proof: '+detail);};
const sourceFail=(detail,span)=>{throw unsupported('Rust pure Unit-call source',detail,span);};
const range=(start,end)=>({start:start.start,end:end.end});
function ownFields(value){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('unrecognized owned record');
 const keys=Reflect.ownKeys(value);
 if(keys.some(key=>typeof key!=='string'||!Object.getOwnPropertyDescriptor(value,key).enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),'value')))fail('unrepresented own fields');
 return keys;
}
function exact(value,fields){if(!same(ownFields(value).sort(),[...fields].sort())||Object.values(value).some(value=>value===undefined))fail('unrecognized or missing owned fields');}
function allowed(value,fields){if(ownFields(value).some(field=>!fields.includes(field))||Object.values(value).some(value=>value===undefined))fail('unrepresented own fields');}
function checkOwnedContainers(root){
 const visited=new WeakSet();let visits=0;
 function visit(value,depth=0){
  if(!value||typeof value!=='object'||visited.has(value))return;
  if(depth>256||++visits>100_000)fail('the owned container graph exceeds its resource limit');
  visited.add(value);
  const keys=Reflect.ownKeys(value);
  if(value instanceof Map){
   if(!acceptRustPureUnitContainer('map',true,keys.length>0||Object.getPrototypeOf(value)!==Map.prototype))fail('a declaration Map has unrepresented own fields');
   for(const [key,child] of Map.prototype.entries.call(value)){visit(key,depth+1);visit(child,depth+1);}
  }else if(Array.isArray(value)){
   const length=Object.getOwnPropertyDescriptor(value,'length').value;
   const dense=keys.length===length+1&&keys.every(key=>key==='length'||typeof key==='string'&&/^(?:0|[1-9][0-9]*)$/u.test(key)&&Number(key)<length&&String(Number(key))===key);
   const unrepresented=Object.getPrototypeOf(value)!==Array.prototype||keys.some(key=>{const descriptor=Object.getOwnPropertyDescriptor(value,key);return !Object.hasOwn(descriptor,'value')||key!=='length'&&!descriptor.enumerable;});
   if(!acceptRustPureUnitContainer('array',dense,unrepresented))fail('an ordered container has unrepresented own fields or sparse positions');
   for(let index=0;index<length;index++)visit(value[index],depth+1);
  }else{
   if(Object.getPrototypeOf(value)!==Object.prototype&&Object.getPrototypeOf(value)!==null)fail('an owned record has an unrepresented prototype');
   for(const key of ownFields(value))visit(Object.getOwnPropertyDescriptor(value,key).value,depth+1);
  }
 }
 visit(root);
}
function validSpan(value){exact(value,['start','end']);if(typeof value.start!=='number'||typeof value.end!=='number'||!acceptRustPureUnitSourceOffset(value.start,Object.is(value.start,-0))||!acceptRustPureUnitSourceOffset(value.end,Object.is(value.end,-0))||value.end<=value.start)fail('an actual source span is malformed');}
function equalRustPureUnitSourceSpans(left,right){return left.start===right.start&&left.end===right.end;}
function inside(inner,outer){return inner.start>=outer.start&&inner.end<=outer.end;}
function nameAccepted(name){return typeof name==='string'&&acceptRustPureUnitName(name)&&[...name].every((character,index)=>acceptRustPureUnitNameCharacter(character.codePointAt(0),index===0));}
function readName(parser,context){const token=parser.cursor.identifier(context);if(!nameAccepted(token.value))sourceFail('the selected name requires an ordinary unreserved ASCII Rust identifier',range(token,token));return token;}
function readUnit(parser,context){const c=parser.cursor;c.expect('(',context);c.expect(')',context);}

export function readRustPureUnitItemContext(parser,path,start){
 const c=parser.cursor;parser.pureUnitPublicToken=null;
 if(!parser.pureUnitCallModel)return;
 if(acceptRustPureUnitVisibility(parser.pureUnitCallModel,policy.visibilityForms.private)){
  if(path.length||!c.is('fn'))sourceFail('only flat private pure Unit functions and one ordinary main are admitted',range(start,c.peek()));
  return;
 }
 const publicToken=c.eat('pub');
 if(path.length||!c.is('fn'))sourceFail('only flat bare public pure Unit helpers and one ordinary private main are admitted',range(start,c.peek()));
 const main=c.is('main',1);
 if(main&&publicToken)sourceFail('the complete source requires an ordinary private main',range(start,c.peek()));
 if(!main&&!publicToken)sourceFail('each helper requires its actual bare pub keyword and complete owned Unit header',range(start,c.peek()));
 parser.pureUnitPublicToken=publicToken??null;
}

export function readRustPureUnitFunction(parser,path,start,name){
 const c=parser.cursor;
 const publicToken=parser.pureUnitPublicToken,first=publicToken??start;
 if(path.length||!nameAccepted(name))sourceFail('pure Unit functions require an ordinary flat owned name',range(start,c.peek()));
 readUnit(parser,'zero-argument pure Unit function');
 let headerForm='implicit unit';
 if(c.eat('->')){readUnit(parser,'direct Unit result');headerForm='explicit unit';}
 const headerSpan=range(first,c.tokens[c.index-1]),open=c.expect('{','pure Unit function');
 let bodyForm='empty block';
 if(!c.is('}')){readUnit(parser,'pure Unit body');bodyForm='unit expression';}
 if(!c.is('}'))sourceFail('a helper body must be exactly an empty block or the Unit expression',range(open,c.peek()));
 const close=c.next(),origin=parser.origins.typeOrigin(UNIT,path);
 parser.origins.declaration(name,path,{k:'fn',parameters:[],result:origin});
 return {k:'fn',name,params:[],ret:UNIT,body:parser.origins.mark({k:'unit'},origin),span:range(first,close),sourcePureUnit:{model:parser.pureUnitCallModel,language:policy.language,headerForm,bodyForm,headerSpan,bodySpan:range(open,close),...(publicToken?{visibility:{form:policy.visibilityForms.public,span:range(publicToken,publicToken)}}:{})}};
}

export function readRustPureUnitMain(parser){
 const c=parser.cursor,start=c.expect('fn','pure Unit main');c.expect('main','pure Unit main');readUnit(parser,'pure Unit main');
 if(c.is('->'))sourceFail('main must retain its ordinary implicit Unit header',range(start,c.peek()));
 c.expect('{','pure Unit main');const effects=[];
 while(!c.is('}')){
  const token=c.peek(),first=c.identifier('owned pure Unit call');let pathForm='unqualified name',target=first.value;
  if(first.value==='crate'){c.expect('::','owned pure Unit call');target=readName(parser,'owned pure Unit call').value;pathForm='absolute crate path';}
  else if(!nameAccepted(target))sourceFail('main calls require an ordinary owned pure Unit name',range(token,first));
  readUnit(parser,'zero-argument pure Unit call');const end=c.expect(';','pure Unit call statement');
  let name=policy.temporaryName,suffix=0;while(parser.reservedNames.has(name))name=policy.temporaryName+ ++suffix;parser.reservedNames.add(name);
  const span=range(token,end);
  effects.push({k:'let',name,type:UNIT,value:{k:'app',fn:{k:'name',path:['crate',target],span},args:[],span},span,sourcePureUnitCall:{model:parser.pureUnitCallModel,language:policy.language,pathForm,span}});
 }
 const close=c.next();return {effects,span:range(start,close)};
}

export function finishRustPureUnitSource(parser,root){
 if(!parser.pureUnitCallModel)return;
 if(!acceptRustPureUnitContext('Rust',root.items.some(item=>item.k!=='fn')||!root.main))sourceFail('the selected interpretation requires a complete flat pure Unit program');
}

export function checkRustPureUnitCalls(program){
 const marked=Object.hasOwn(program,'sourcePureUnitCalls');
 if(marked)checkOwnedContainers(program);
 const entries=[...Map.prototype.values.call(program.declarations)],effects=program.main?.effects;
 if(!marked&&!entries.some(entry=>Object.hasOwn(entry,'sourcePureUnit'))&&!Array.prototype.some.call(effects??[],effect=>effect&&Object.hasOwn(effect,'sourcePureUnitCall')))return;
 if(!marked)checkOwnedContainers(program);
 const forbidden=!program.main||!Array.isArray(effects)||['imports','externals'].some(field=>Object.hasOwn(program,field)&&(!Array.isArray(program[field])||program[field].length>0))
  ||['outputThreaded','abortsThreaded','referenceSemantics','utf16Strings'].some(field=>Object.hasOwn(program,field)&&program[field]!==false)
  ||!Array.isArray(program.items)||program.items.some(item=>item.k!=='fn')||entries.length!==program.items.length;
 if(!acceptRustPureUnitContext(program.sourceLanguage,forbidden))fail('the selected interpretation requires a complete flat pure Unit program without other effects');
 allowed(program,policy.fields.program);exact(program.sourcePureUnitCalls,policy.fields.marker);
 const model=program.sourcePureUnitCalls.model,publicSelected=acceptRustPureUnitVisibility(model,policy.visibilityForms.public);
 if(!model||program.sourcePureUnitCalls.language!==policy.language||!acceptRustPureUnitCallModel(model))fail('the selected interpretation is invalid');
 exact(program.main,policy.fields.main);validSpan(program.main.span);
 const owned=new Set(),names=new Set();
 for(const entry of entries){
  allowed(entry,policy.fields.declaration);validSpan(entry.span);
  if(entry.k!=='fn'||!nameAccepted(entry.name)||entry.fullName!==entry.name||!same(entry.modulePath,[])||!same(entry.params,[])||entry.recursive!==false||entry.decreasing!=null||Object.hasOwn(entry,'mutual')&&entry.mutual!==false||Object.hasOwn(entry,'generated')&&entry.generated!==false||program.declarations.get(entry.fullName)!==entry||names.has(entry.name))fail('a helper does not own the declared flat zero-argument identity');
  exact(entry.ret,policy.fields.unitType);exact(entry.body,policy.fields.body);exact(entry.body.type,policy.fields.unitType);
  if(entry.ret.kind!=='unit'||entry.body.k!=='unit'||entry.body.type.kind!=='unit')fail('a helper must return the exact pure Unit value');
  const proof=entry.sourcePureUnit;exact(proof,publicSelected?policy.fields.publicFunctionProof:policy.fields.functionProof);validSpan(proof.headerSpan);validSpan(proof.bodySpan);
  if(proof.model!==model||proof.language!==policy.language||!acceptRustPureUnitHeaderForm(proof.headerForm)||!acceptRustPureUnitBodyForm(proof.bodyForm)||proof.headerSpan.start!==entry.span.start||proof.bodySpan.end!==entry.span.end||proof.headerSpan.end>proof.bodySpan.start||!inside(proof.headerSpan,entry.span)||!inside(proof.bodySpan,entry.span))fail('a helper header or complete body site contradicts its actual owned declaration');
  if(publicSelected){
   exact(proof.visibility,policy.fields.visibility);validSpan(proof.visibility.span);
   if(!acceptRustPureUnitVisibility(model,proof.visibility.form)||proof.visibility.span.start!==proof.headerSpan.start||proof.visibility.span.end-proof.visibility.span.start!==policy.publicVisibilityWidth||proof.visibility.span.end>=proof.headerSpan.end)fail('the actual bare public visibility does not belong to the complete owned header');
  }
  owned.add(entry);names.add(entry.name);
 }
 if(new Set(program.items).size!==entries.length||program.items.some(entry=>!owned.has(entry)))fail('the ordered items do not contain each actual declaration exactly once');
 const locals=new Set();
 for(const effect of effects){
  exact(effect,policy.fields.effect);validSpan(effect.span);
  if(effect.k!=='let'||!nameAccepted(effect.name)||locals.has(effect.name)||names.has(effect.name)||!inside(effect.span,program.main.span))fail('a Unit call statement has no distinct unreserved local binding or actual main site');
  locals.add(effect.name);exact(effect.value,policy.fields.call);exact(effect.value.type,policy.fields.unitType);validSpan(effect.value.span);
  if(effect.value.k!=='call'||!same(effect.value.args,[])||effect.value.type.kind!=='unit'||!equalRustPureUnitSourceSpans(effect.value.span,effect.span)||!owned.has(program.declarations.get(effect.value.fn)))fail('a main statement must call the exact owned zero-argument pure Unit declaration');
  const proof=effect.sourcePureUnitCall;exact(proof,policy.fields.callProof);validSpan(proof.span);
  if(proof.model!==model||proof.language!==policy.language||!acceptRustPureUnitPathForm(proof.pathForm)||!equalRustPureUnitSourceSpans(proof.span,effect.span))fail('a Unit call statement has invalid selected source facts');
 }
}
