// Read the complete actual token stream through the closed linked grammar.
// No source substring is parsed, reconstructed, or treated as a body proof.
import {tokenize} from './lexer.js';
import {unsupported} from './diagnostics.js';
import {acceptRustPureUnitName,acceptRustPureUnitNameCharacter} from './rust-pure-unit-call-rules.js';
import {acceptRustRuntimeShellReservedName,acceptRustRuntimeShellStackShift} from './rust-runtime-shell-rules.js';
const UNIT={kind:'unit'};
const fail=(detail,span)=>{throw unsupported('closed Rust runtime shell',detail,span);};
const range=(first,last)=>({start:first.span.start,end:last.span.end});
function ordinary(name,policy,local=false){
 const generated=local&&new RegExp('^'+policy.generatedLocalPrefix+'[0-9]+$','u').test(name);
 return typeof name==='string'&&(generated||acceptRustPureUnitName(name))&&acceptRustRuntimeShellReservedName(name)&&[...name].every((letter,index)=>acceptRustPureUnitNameCharacter(letter.codePointAt(0),index===0));
}
export function readRustRuntimeShellSyntax(tokens,policy,{bound=false}={}){
 let index=0;const captures=new Map(),functions=new Map(),helperUses=[],localUses=[],helperRows=[],statements=[],locals=new Set(),entryLocals=new Set(),operations=new Map();
 const value=token=>token.declaration?token.declaration.name:token.binding?token.binding.value:token.value;
 const peek=()=>tokens[index];
 const site=()=>peek()?.span;
 function take(){const token=peek();if(!token)fail('the complete source token sequence is missing',site());index++;return token;}
 function literal(expected){const token=take(),kind=/^[A-Za-z_][A-Za-z0-9_]*$/u.test(expected)?'identifier':/^[0-9]+$/u.test(expected)?'number':'punct';if(token.kind!==kind||token.value!==expected||token.declaration||token.binding||kind==='number'&&(token.suffix!==''||token.floating))fail('the owned runtime grammar expected '+expected,token.span);return token;}
 function bind(descriptor){
  const token=take(),name=value(token);
  if(token.kind!=='identifier'||descriptor.fixed!==undefined&&name!==descriptor.fixed||descriptor.fixed===undefined&&!ordinary(name,policy,descriptor.bind==='unitBinding'))fail('an actual owned '+descriptor.bind+' identifier is outside its closed source interpretation',token.span);
  if(descriptor.bind==='helper'){
   if(bound?!token.declaration:token.value===undefined||token.binding||token.declaration)fail('a helper header must reference its actual owned declaration',token.span);
   if(functions.has(name))fail('each source helper declaration must have one distinct identity',token.span);
  }else{
   if(token.value===undefined||token.binding||token.declaration)fail('a local or worker binder must retain its actual declaration token',token.span);
   const scope=descriptor.bind==='unitBinding'?locals:entryLocals;
   if(scope.has(name))fail('the owned runtime binding is duplicated or shadowed',token.span);
   scope.add(name);
  }
  captures.set(descriptor.bind,token);return token;
 }
 function reference(name){
  const target=captures.get(name),token=take();
  if(!target||token.kind!=='identifier'||value(token)!==value(target)||(bound?token.binding!==target:token.value===undefined||token.binding||token.declaration))fail('the runtime reference does not target its actual lexical binding',token.span);
  localUses.push({token,target});return token;
 }
 function helperReference(){
  const token=take(),target=functions.get(value(token));
  if(token.kind!=='identifier'||!target||(bound?token.declaration!==target.name.declaration:token.value===undefined||token.binding||token.declaration))fail('the worker call must target an actual owned pure Unit helper',token.span);
  helperUses.push({token,target:target.name});return token;
 }
 function match(descriptor){
  if(typeof descriptor==='string')return literal(descriptor);
  if(descriptor.operation){
   const begin=index,parts=descriptor.pattern.map(match),first=tokens[begin]??tokens.at(-1),last=index>begin?tokens[index-1]:first;
   const node={kind:'source operation',op:descriptor.operation,parts,span:index>begin?range(first,last):{start:first.span.start,end:first.span.start}};
   const entries=operations.get(node.op)??[];entries.push(node);operations.set(node.op,entries);
   if(node.op==='owned public Unit helper'){
    const name=captures.get('helper'),row={name,node,value:single(node,'pure Unit helper value')};functions.set(value(name),row);helperRows.push(row);
   }
   if(node.op==='owned Unit call binding')statements.push({name:captures.get('unitBinding'),node,call:single(node,'owned Unit invocation')});
   return node;
  }
  if(descriptor.bind)return bind(descriptor);
  if(descriptor.reference)return reference(descriptor.reference);
  if(descriptor.helperReference)return helperReference();
  if(descriptor.string!==undefined){const token=take();if(token.kind!=='string'||token.value!==descriptor.string)fail('the actual runtime string literal differs from its closed operation',token.span);return token;}
  if(descriptor.number){const token=take();if(token.kind!=='number'||token.suffix!==''||token.floating||!/^(?:0|[1-9][0-9]*)$/u.test(token.value)||!acceptRustRuntimeShellStackShift(Number(token.value)))fail('the stack shift requires its actual bounded unsigned integer argument',token.span);captures.set(descriptor.number,token);return token;}
  if(descriptor.repeat){
   const parts=[],begin=index;
   while(descriptor.while?value(peek())===descriptor.while:value(peek())!==descriptor.until){const before=index;parts.push(match(policy.syntax[descriptor.rule]));if(index<=before||index>=tokens.length)fail('the complete runtime sequence is not closed',site());}
   const first=tokens[begin]??tokens.at(-1),last=index>begin?tokens[index-1]:first;
   return {kind:'source operation',op:descriptor.repeat,parts,span:index>begin?range(first,last):{start:first.span.start,end:first.span.start}};
  }
  if(descriptor.eof){const token=take();if(token.kind!=='eof'||token.value!==''||index!==tokens.length)fail('the runtime interpretation must consume the whole artifact',token.span);return token;}
  fail('the linked runtime grammar contains an unrecognized operation',site());
 }
 function nodes(node,operation,result=[]){if(node?.kind==='source operation'){if(node.op===operation)result.push(node);for(const child of node.parts)nodes(child,operation,result);}return result;}
 function single(node,operation){const found=nodes(node,operation);if(found.length!==1)fail('the complete runtime requires one owned '+operation,node.span);return found[0];}
 const root=match(policy.syntax.crate);
 if(index!==tokens.length)fail('the selected runtime left unconsumed source operations',site());
 // The lexer splits a Rust left shift into two punctuation tokens. Their
 // actual adjacency is part of this operator's owned concrete occurrence.
 const shift=single(root,'unsigned stack size shift');
 if(shift.parts[1].span.end!==shift.parts[2].span.start)fail('the stack request must own the actual contiguous left-shift operator',shift.span);
 const worker=single(root,'owned Unit worker definition');
 const items=helperRows.map(row=>({k:'fn',name:value(row.name),params:[],ret:UNIT,body:{k:'unit',span:row.value.span},span:row.node.span}));
 const effects=statements.map(statement=>{
  const target=statement.call.parts[2];
  return {k:'let',name:value(statement.name),type:UNIT,value:{k:'app',fn:{k:'name',path:['crate',value(target)],span:range(statement.call.parts[0],target)},args:[],span:statement.call.span},span:statement.node.span};
 });
 return {operations:root,helperRows,helperUses,localUses,captures,surface:{language:'Rust',items,main:{effects,span:worker.span}},single:operation=>single(root,operation)};
}
export function parseRustRuntimeShell(source,policy){
 const lexical=tokenize(source,'Rust');
 const tokens=lexical.tokens.map(token=>{
  if(!['identifier','punct','number','string','eof'].includes(token.kind))fail('this lexical construct needs a separate runtime ownership proof',{start:token.start,end:token.end});
  return {kind:token.kind,value:token.value,...(token.kind==='number'?{suffix:token.suffix??'',floating:Boolean(token.floating)}:{}),span:{start:token.start,end:token.end}};
 });
 const parsed=readRustRuntimeShellSyntax(tokens,policy);
 const proof={model:policy.model,language:policy.language,observationModel:policy.observationModel,span:{start:0,end:tokens.at(-1).span.end},tokens,operations:parsed.operations,assumptions:[]};
 return {...parsed.surface,sourceRuntimeShell:proof};
}
