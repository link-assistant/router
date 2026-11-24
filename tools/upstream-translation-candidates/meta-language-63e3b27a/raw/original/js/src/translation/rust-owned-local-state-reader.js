// Experimental source projection: own local String moves and ordered replacements.
import {unsupported} from './diagnostics.js';
import {RUST_OWNED_LOCAL_STATE_POLICY as policy,ownedLocalType,ownedLocalPair,ownedLocalPosition} from './rust-owned-local-state.js';
import {sameType} from './types.js';
import {acceptRustOwnedLocalSourceOperation} from './rust-owned-local-state-rules.js';
import {acceptRustOwnedTupleCallModel} from './rust-owned-tuple-call-rules.js';
import {RUST_OWNED_TUPLE_CALL_POLICY as callPolicy,ownedTupleCallPairPosition,ownedTupleCallParameters} from './rust-owned-tuple-calls.js';

const fail=(reason,span)=>{throw unsupported('Rust owned local state',reason,span);};
const clone=environment=>new Map([...environment].map(([name,value])=>[name,{...value,fields:value.fields?.map(field=>({...field}))}]));
function mergeAvailability(environment,then,otherwise){for(const[name,value]of environment){value.available=value.available&&then.get(name).available&&otherwise.get(name).available;value.fields?.forEach((field,index)=>{field.available=field.available&&then.get(name).fields[index].available&&otherwise.get(name).fields[index].available;});}}
const range=(first,last)=>({start:first.start,end:last.end});
const resultType=node=>node.k==='let'?resultType(node.body):node.type;

export function readRustOwnedLocalStateBody(parser,path,name,params,ret,signature){
 const copies=parser.localValueStateModel===policy.models.copies;
 const calls=acceptRustOwnedTupleCallModel(parser.localValueStateModel),helper=calls&&ownedLocalPair(ret);
 if(path.length||ret.kind!=='string'&&!helper||signature.lifetimeBindings.length||signature.parameters.some(position=>!ownedLocalPosition(position))||!(helper?ownedTupleCallPairPosition(signature.result)&&ownedTupleCallParameters(params):ownedLocalPosition(signature.result)))fail('only direct standard String, i32 and Boolean interfaces with a String result are admitted');
 const c=parser.cursor,bindings=[],reads=[],initializers=[],constructors=[];
 const names=new Set(params.map(parameter=>parameter.name));
 if(names.size!==params.length||[...names].some(name=>policy.reservedOwners.includes(name)))fail('source bindings cannot shadow each other or standard owners');
 let temporary=0,mutableSlot=null,writes=0;
 const fresh=()=>{let candidate;do{candidate=`ml_owned_local_value${temporary++}`;}while(parser.reservedNames.has(candidate));parser.reservedNames.add(candidate);return candidate;};
 const proof={model:parser.localValueStateModel,language:'Rust',sourceName:name,interpretation:{...structuredClone(policy.interpretation),...(calls?{tupleInitialization:structuredClone(callPolicy.interpretation)}:{})},bindings,reads,initializers,literalConstructors:constructors};
 const parameterEnvironment=new Map(params.map(parameter=>[parameter.name,{name:parameter.name,type:parameter.type,available:true,mutable:false}]));
 function rawExpression(options={}){
  const start=c.index,expression=parser.expr(path,options);
  if(c.tokens.slice(start,c.index).some(token=>token.kind==='identifier'&&['mut','ref'].includes(token.value)||token.kind==='punct'&&['&','&&'].includes(token.value)&&!acceptRustOwnedLocalSourceOperation('borrow')))fail('references and mutable expression bindings need a separate ownership interpretation',expression.span);
  return expression;
 }
 function syntaxBlock(){
  const open=c.expect('{','owned local state block'),previous=parser.origins.enter(),statements=[];
  try{
   while(!c.is('}')){
    if(c.is('let')){
     const start=c.next(),pattern=parser.productBindingPattern(true),type=c.eat(':')?parser.type():null,origin=type?parser.origins.type:null;
     c.expect('=','owned local state binding');const value=rawExpression();c.expect(';','owned local state binding');
     const bind=(pattern,value)=>{
      if(pattern.k==='name'){parser.origins.bind(pattern.name,value,path,origin);return;}
      if(pattern.k!=='tuple'||pattern.items.length!==2||pattern.items.some(item=>item.k!=='name'))fail('only direct names and a flat two-field tuple pattern are admitted',pattern.span);
      const tupleName=fresh();parser.origins.bind(tupleName,value,path,origin);
      pattern.items.forEach((item,index)=>parser.origins.bind(item.name,parser.origins.project({k:'tupleIndex',object:{k:'name',path:[tupleName]},index,span:item.span},path,index,item.span),path));
     };
     bind(pattern,value);statements.push({role:'let',pattern,type,value,span:range(start,c.peek())});
    }else if(c.is('if')){
     const start=c.next(),cond=rawExpression({noStruct:true}),then=syntaxBlock(),otherwise=c.eat('else')?syntaxBlock():[];
     c.eat(';');statements.push({role:'if',cond,then,else:otherwise,span:range(start,c.peek())});
    }else if(c.peek().kind==='identifier'&&c.is('=',1)){
     const target=c.next();c.next();const value=rawExpression();c.expect(';','owned local state replacement');
     parser.origins.bind(target.value,value,path);statements.push({role:'write',target:target.value,value,span:range(target,c.peek())});
    }else{
     const value=rawExpression();if(c.eat(';'))fail('expression statements and early completions need their own effect interpretation',value.span);
     if(!c.is('}'))fail('every block needs one final value after its ordered statements',value.span);
     statements.push({role:'tail',value});break;
    }
   }
   c.expect('}','owned local state block');return statements;
  }finally{parser.origins.scope=previous;}
 }
 const syntax=copies||helper?null:syntaxBlock();
 const canonicalBody=copies||helper?parser.block(path):null;
 function binding(record){bindings.push({...record,path:null});}
 function reference(entry,mode,span){
  if(!entry.available)fail('a moved String or tuple field cannot be read again',span);
  if(entry.type.kind==='string'){
   if(mode==='copy'&&!copies)fail('the move profile does not erase a standard String clone',span);
   reads.push({binding:entry.name,mode,type:entry.type,span:span??null,path:null});
   if(mode==='move')entry.available=false;
  }
  return{k:'name',path:[entry.name],...(span?{span}:{}),type:entry.type};
 }
 function expression(node,environment,constructorLiteral=false,callInitializer=false){
  const copy=parser.origins.expressions.get(node)?.localValueCopy;
  if(node.k==='name'){
   if(node.path.length!==1||!environment.has(node.path[0]))fail('values require their actual unique local binding owner',node.span);
   const entry=environment.get(node.path[0]);if(entry.type.kind==='tuple')fail('whole tuple moves need a separate partial-move proof',node.span);
   return reference(entry,copy?'copy':'move',node.span);
  }
  if(node.k==='str'){
   if(!constructorLiteral)fail('a borrowed string literal is not an owned standard String value',node.span);
   return{...node,type:{kind:'string'}};
  }
  if(node.k==='num'){
   if(!ownedLocalType(node.type)||node.type.kind!=='fixed')fail('integer literals need their actual signed i32 source domain',node.span);
   return node;
  }
  if(node.k==='bool')return{...node,type:{kind:'bool'}};
  if(node.k==='toString'){
   if(node.arg.k!=='str'||parser.origins.expressions.get(node)?.localValueConstructor!=='String::from')fail('only the actual standard String literal constructor is admitted',node.span);
   constructors.push({...structuredClone(policy.constructor),span:node.arg.span,callSpan:parser.origins.expressions.get(node).localValueConstructorSpan,path:null});
   return{...node,arg:expression(node.arg,environment,true),type:{kind:'string'}};
  }
  if(node.k==='tuple'){
   const items=node.items.map(item=>expression(item,environment)),type={kind:'tuple',elements:items.map(item=>item.type)};
   if(!ownedLocalPair(type))fail('the selected tuple must contain owned String then signed i32',node.span);
   return{k:'tuple',items,type,span:node.span};
  }
  if(node.k==='tupleIndex'){
   if(node.object.k!=='name'||node.object.path.length!==1||!environment.has(node.object.path[0]))fail('tuple fields need their actual initialized local tuple',node.span);
   const object=environment.get(node.object.path[0]);if(!ownedLocalPair(object.type)||![0,1].includes(node.index))fail('tuple positions must retain the exact owned text/i32 layout',node.span);
   const type=object.type.elements[node.index];
   if(type.kind==='string'){
    const field=object.fields[0];reference(field,copy?'copy':'move',node.span);
   }
   return{...node,object:{k:'name',path:[object.name],span:node.object.span},type};
  }
  if(calls&&node.k==='app'){
   if(!callInitializer||node.fn.k!=='name'||node.fn.path.length!==1||environment.has(node.fn.path[0]))fail('calls require one complete tuple initializer with an actual unshadowed declaration owner',node.span);
   const target=parser.origins.lookup(node.fn.path,path,['fn']);
   if(!target&&!parser.ownedTupleCallDiscovery)fail('a tuple initializer needs its actual declared target',node.span);
   if(target&&(!ownedLocalPair(target.result.type)||!ownedTupleCallParameters(target.parameters)))fail('the initializer target must return owned String/i32 from direct String/i32 parameters',node.span);
   const args=node.args.map(argument=>expression(argument,environment));
   if(!ownedTupleCallParameters(args))fail('the initializer arguments must retain ordered owned String/i32 domains',node.span);
   return{...node,args,type:target?.result.type??{kind:'tuple',elements:args.map(argument=>argument.type)}};
  }
  if(node.k==='binary'){
   if(node.op!=='eq')fail('arithmetic, ordered comparison and overflow need separate source proofs',node.span);
   const left=expression(node.left,environment),right=expression(node.right,environment);
   if(left.type.kind==='string'||!sameType(left.type,right.type))fail('equality is confined to actual Boolean or signed i32 values',node.span);
   return{...node,left,right,type:{kind:'bool'}};
  }
  if(copies&&node.k==='let'){
   if(names.has(node.name)||policy.reservedOwners.includes(node.name))fail('source bindings cannot shadow each other or standard owners',node.span);names.add(node.name);
   const value=expression(node.value,environment),valueType=resultType(value),inner=clone(environment),entry={name:node.name,type:valueType,available:true,mutable:false};
   if(ownedLocalPair(value.type))entry.fields=[{name:node.name+'.0',type:{kind:'string'},available:true}];
   inner.set(node.name,entry);binding({name:node.name,sourceName:node.name,role:ownedLocalPair(value.type)?'tuple initializer':'immutable',mutable:false,previous:null,type:value.type,initializer:null,index:null});
   const body=expression(node.body,inner);mergeAvailability(environment,inner,inner);return{...node,value,body,type:valueType};
  }
  if(copies&&node.k==='if'){
   const cond=expression(node.cond,environment);if(cond.type.kind!=='bool')fail('conditions require actual Boolean values',node.span);
   const thenEnvironment=clone(environment),elseEnvironment=clone(environment),then=expression(node.then,thenEnvironment),otherwise=expression(node.else,elseEnvironment);if(!sameType(resultType(then),resultType(otherwise)))fail('branch results need the same actual value domain',node.span);
   mergeAvailability(environment,thenEnvironment,elseEnvironment);
   return{...node,cond,then,else:otherwise,type:resultType(then)};
  }
  fail(`expression ${node.k} has no closed owned-text interpretation`,node.span);
 }
 function sequence(statements,environment,tailSlot=null){
  if(!statements.length){if(!tailSlot)fail('a function needs its final String value');return reference(environment.get(tailSlot),'move');}
  const [statement,...rest]=statements;
  if(statement.role==='tail'){
   if(rest.length||tailSlot)fail('statement branches cannot escape their ordered local state continuation',statement.value.span);
   return expression(statement.value,environment);
  }
  if(statement.role==='let'){
   const pattern=statement.pattern,value=expression(statement.value,environment,false,calls&&pattern.k==='tuple');
   if(statement.type&&!sameType(statement.type,value.type))fail('the actual local annotation differs from its value domain',statement.span);
   if(pattern.k==='name'){
    if(pattern.mutable)fail('the move profile requires one owned tuple-declared mutable String slot',pattern.span);
    if(names.has(pattern.name)||policy.reservedOwners.includes(pattern.name))fail('source bindings cannot shadow each other or standard owners',pattern.span);names.add(pattern.name);
    const entry={name:pattern.name,type:value.type,available:true,mutable:false};if(ownedLocalPair(value.type))entry.fields=[{name:entry.name+'.0',type:{kind:'string'},available:true}];
    environment.set(pattern.name,entry);binding({name:entry.name,sourceName:pattern.name,role:'immutable',mutable:false,previous:null,type:value.type,initializer:null,index:null});
    const body=sequence(rest,environment,tailSlot);return{k:'let',name:entry.name,value,body,span:statement.span,type:value.type};
   }
   if(!ownedLocalPair(value.type)||pattern.items.length!==2||!pattern.items[0].mutable||pattern.items[1].mutable||mutableSlot)fail('one fresh String/i32 unpacking owns exactly one mutable String slot',pattern.span);
   const tupleName=fresh(),fields=pattern.items.map(item=>item.name);
   if(new Set(fields).size!==2||fields.some(name=>names.has(name)||policy.reservedOwners.includes(name)))fail('tuple fields require distinct unshadowed local owners',pattern.span);
   fields.forEach(name=>names.add(name));mutableSlot=fields[0];
   if(calls&&value.k!=='app')fail('the selected call model requires an actual declared tuple initializer',statement.span);
   binding({name:tupleName,sourceName:tupleName,role:'tuple initializer',mutable:false,previous:null,type:value.type,initializer:null,index:null});initializers.push({binding:tupleName,fields,path:null,...(calls?{target:value.fn.path[0],fieldModes:[...callPolicy.fieldModes]}:{})});
   pattern.items.forEach((item,index)=>{const type=value.type.elements[index];environment.set(item.name,{name:item.name,type,available:true,mutable:index===0});binding({name:item.name,sourceName:item.name,role:'tuple field',mutable:index===0,previous:null,type,initializer:tupleName,index});});
   reads.push({binding:tupleName+'.0',mode:'move',type:{kind:'string'},span:pattern.items[0].span,path:null});
   let body=sequence(rest,environment,tailSlot);
   for(let index=1;index>=0;index--){const item=pattern.items[index];body={k:'let',name:item.name,value:{k:'tupleIndex',object:{k:'name',path:[tupleName]},index,span:item.span},body,span:item.span,type:value.type.elements[index]};}
   return{k:'let',name:tupleName,value,body,span:statement.span,type:value.type};
  }
  if(statement.role==='write'){
   const slot=environment.get(statement.target);if(!slot?.mutable||slot.type.kind!=='string')fail('only the actual tuple-owned mutable String slot can be replaced',statement.span);
   const value=expression(statement.value,environment);if(value.type.kind!=='string')fail('replacement changes the actual String value domain',statement.span);
   const previous=slot.name,newName=fresh();slot.available=false;environment.set(statement.target,{...slot,name:newName,available:true});writes++;
   binding({name:newName,sourceName:statement.target,role:'replacement',mutable:false,previous,type:slot.type,initializer:null,index:null});
   const body=sequence(rest,environment,tailSlot);return{k:'let',name:newName,value,body,span:statement.span,type:value.type};
  }
  if(!mutableSlot)fail('an ordered conditional must belong to an initialized mutable String slot',statement.span);
  const cond=expression(statement.cond,environment);if(cond.type.kind!=='bool')fail('conditions require actual Boolean values',statement.span);
  const previous=environment.get(mutableSlot).name,then=sequence(statement.then,clone(environment),mutableSlot),otherwise=sequence(statement.else,clone(environment),mutableSlot),newName=fresh(),slot=environment.get(mutableSlot);
  slot.available=false;environment.set(mutableSlot,{...slot,name:newName,available:true});
  binding({name:newName,sourceName:mutableSlot,role:'join',mutable:false,previous,type:slot.type,initializer:null,index:null});
  const value={k:'if',cond,then,else:otherwise,span:statement.span,type:slot.type},body=sequence(rest,environment,tailSlot);
  return{k:'let',name:newName,value,body,span:statement.span,type:value.type};
 }
 const body=copies||helper?expression(canonicalBody,parameterEnvironment):sequence(syntax,parameterEnvironment);
 if(helper&&body.k!=='tuple')fail('a tuple helper must return one direct ordered owned product',body.span);
 if(!copies&&!helper&&(!mutableSlot||!writes))fail('the original move profile requires an actual tuple-owned String replacement');
 if(!helper&&resultType(body).kind!=='string')fail('the selected function must return its actual String value');
 return{body,proof};
}
