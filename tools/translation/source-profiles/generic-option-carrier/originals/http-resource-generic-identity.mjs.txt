// A closed theorem over actual native syntax: one unconstrained input returned
// once, unchanged, with no other body statements, effects, drops or captures.
const fail=message=>{throw new TypeError('Resource original generic identity: '+message);};
export function hasHttpResourceGenericIdentitySource(ts,item){return !!item.typeParameters?.length||ts.getJSDocTags(item).some(tag=>ts.isJSDocTemplateTag(tag));}
function portableType(name){if(typeof name!=='string'||! /^[A-Z][A-Za-z0-9]*$/u.test(name)||['Self','String','Result','Option','Vec'].includes(name))fail('one portable original generic type parameter required');return name;}
function slot(ts,node,name){return !!node&&ts.isTypeReferenceNode(node)&&ts.isIdentifier(node.typeName)&&node.typeName.text===name&&!node.typeArguments?.length;}
export function captureHttpResourceGenericIdentity(ts,item,{language,file,name,moduleNames,erase,annotate,localFunctions=null}){
 // The direct-return theorem in the original header is the base case; this
 // successor also proves linear aliases and closed unchanged-value calls.
 if(item.getSourceFile()!==file||!item.body||item.asteriskToken||item.parameters.length!==1||item.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword))fail('actual synchronous ordinary single-input generic identity required');
 const tags=ts.getJSDocTags(item).filter(tag=>ts.isJSDocTemplateTag(tag)),parameters=language==='TypeScript'?item.typeParameters:tags.length===1?tags[0].typeParameters:null;
 if(!parameters||parameters.length!==1||tags.length>1||tags.some(tag=>tag.constraint))fail('one actual unconstrained original template required');const parameter=parameters[0];if(parameter.constraint||parameter.default||parameter.modifiers?.length)fail('generic identity constraints/defaults require a separate original-source rule');const typeParameter=portableType(parameter.name.text),input=item.parameters[0];
 if(!ts.isIdentifier(input.name)||input.modifiers?.length||input.questionToken||input.dotDotDotToken||input.initializer)fail('one original required generic value parameter required');const id=name(input.name.text);if(moduleNames.has(id))fail('generic input cannot shadow the actual module');
 const inputType=language==='TypeScript'?input.type:ts.getJSDocType(input),outputType=language==='TypeScript'?item.type:ts.getJSDocReturnType(item);if(!slot(ts,inputType,typeParameter)||!slot(ts,outputType,typeParameter))fail('both original signatures must name their actual same lexical generic slot');
 if(item.body.statements.length>4096)fail('complete original generic body statement bound');let cells=0;const type='generic:'+typeParameter,live=new Map([[id,true]]),steps=[],tick=depth=>{if(++cells>100000||depth>160)fail('complete original generic linear source bound');},statements=item.body.statements.filter(statement=>{tick(0);return !ts.isEmptyStatement(statement);});
 function term(node,depth=0){
  tick(depth);if(!node||node.getSourceFile()!==file)fail('complete actual generic value node required');
  if(ts.isParenthesizedExpression(node)){const doc=ts.getJSDocType(node);if(doc&&!slot(ts,doc,typeParameter))fail('actual generic value doc must retain its original lexical slot');return term(node.expression,depth+1);}
  if(ts.isAsExpression(node)||ts.isTypeAssertionExpression(node)||ts.isSatisfiesExpression(node)||ts.isNonNullExpression(node)){
   if(language!=='TypeScript'||node.type&&!slot(ts,node.type,typeParameter))fail('generic type wrapper must retain the actual same lexical slot');const value=term(node.expression,depth+1),span=ts.isTypeAssertionExpression(node)?[node.getStart(file),node.expression.getStart(file)]:[node.expression.end,node.end];erase.push({span,replacement:''});return value;
  }
  if(ts.isIdentifier(node)){if(live.get(node.text)!==true)fail('every actual generic value must move exactly once from its live original binding');live.set(node.text,false);return {kind:'variable',name:node.text,type,root:null,roots:[]};}
  const callee=ts.isCallExpression(node)?selectHttpResourceCallableSource(ts,node.expression,()=>tick(depth)):null;
  if(callee&&ts.isIdentifier(callee)&&localFunctions?.get(callee.text)?.genericIdentity&&node.arguments.length===1){
   if(node.typeArguments?.length){if(language!=='TypeScript'||node.typeArguments.length!==1||!slot(ts,node.typeArguments[0],typeParameter))fail('a generic forwarding call must retain its actual lexical slot');const children=node.getChildren(file),less=children.filter(child=>child.kind===ts.SyntaxKind.LessThanToken),greater=children.filter(child=>child.kind===ts.SyntaxKind.GreaterThanToken);if(less.length!==1||greater.length!==1)fail('complete actual generic forwarding type argument boundary required');erase.push({span:[less[0].getStart(file),greater[0].end],replacement:''});}
   return {kind:'http-resource-call',operation:callee.text,args:[term(node.arguments[0],depth+1)],type,awaited:false,implicitAwait:false,root:null,roots:[],local:true,genericIdentity:true};
  }
  fail('generic value expressions require an original live move or whole checked unchanged-value helper');
 }
 if(!statements.length||!ts.isReturnStatement(statements.at(-1))||!statements.at(-1).expression)fail('complete generic body must return its original value');
 for(const statement of statements.slice(0,-1)){
  tick(0);if(!ts.isVariableStatement(statement)||statement.modifiers?.length||![ts.NodeFlags.Const,ts.NodeFlags.Let].includes(statement.declarationList.flags&ts.NodeFlags.BlockScoped)||!statement.declarationList.declarations.length||statement.declarationList.declarations.length>64)fail('only complete actual linear generic local declarations may precede return');
  for(const declaration of statement.declarationList.declarations){
   tick(0);if(!ts.isIdentifier(declaration.name)||!declaration.initializer||declaration.exclamationToken)fail('one actual initialized generic local binding required');const local=name(declaration.name.text);if(live.has(local)||moduleNames.has(local))fail('generic local cannot duplicate or shadow an actual source binding');const written=declaration.type,doc=ts.getJSDocType(declaration);if(written&&(language!=='TypeScript'||!slot(ts,written,typeParameter))||doc&&!slot(ts,doc,typeParameter))fail('generic local types must retain their actual lexical slot');const value=term(declaration.initializer);if(written)erase.push({span:[declaration.name.end,written.end],replacement:''});live.set(local,true);steps.push({kind:'let',name:local,value,mutable:false,guarded:false,cleanup:[],option:null,resultFallback:null});
  }
 }
 const returned=term(statements.at(-1).expression);if([...live.values()].some(Boolean))fail('every generic local value must move into the one unchanged returned value');
 const children=item.getChildren(file),close=children.filter(child=>child.kind===ts.SyntaxKind.CloseParenToken);if(close.length!==1)fail('one original generic function parameter boundary required');
 if(language==='TypeScript'){
  const less=children.filter(child=>child.kind===ts.SyntaxKind.LessThanToken),greater=children.filter(child=>child.kind===ts.SyntaxKind.GreaterThanToken),colon=children.filter(child=>child.kind===ts.SyntaxKind.ColonToken);if(less.length!==1||greater.length!==1||colon.length!==1||less[0].end>parameter.getStart(file)||greater[0].getStart(file)<parameter.end)fail('complete actual native generic/type annotation boundaries required');
  erase.push({span:[less[0].getStart(file),greater[0].end],replacement:''},{span:[input.name.end,inputType.end],replacement:''},{span:[colon[0].getStart(file),outputType.end],replacement:''},{span:[item.getStart(file),item.getStart(file)],replacement:'/**\n * @template '+typeParameter+'\n * @param {'+typeParameter+'} '+id+'\n * @returns {'+typeParameter+'}\n */\n'});
 }else{
  annotate.push({span:[item.name.end,item.name.end],replacement:'<'+typeParameter+'>'},{span:[input.name.end,input.name.end],replacement:': '+typeParameter},{span:[close[0].end,close[0].end],replacement:': '+typeParameter});
 }
 const flow={steps,tail:{kind:returned.kind==='http-resource-call'?'operation':'value',value:returned},type,lazy:false,captures:[],returnRoots:[],resourceExits:[[]],loopExits:[],scopeFallthroughs:[],functionReturns:[{type,returnRoots:[]}],propagatedErrors:[],loopFragment:false};
 return {kind:'http-resource-generic-identity-function',name:item.name.text,exported:item.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)??false,parameters:[{name:id,type}],inputGuards:[],lazy:false,flow,returns:type,recursiveSignature:null,genericIdentity:{typeParameter,parameter:id},span:{start:item.getStart(file),end:item.end}};
}
export function requireHttpResourceNativeGenericIdentity(fn,{functions=[fn]}={}){return createHttpResourceNativeGenericIdentityVerifier(functions)(fn);}

// Invocation-local original-function closure only. Results remain source DATA.
export function createHttpResourceNativeGenericIdentityVerifier(functions){
 if(!Array.isArray(functions)||functions.length>4096)fail('complete bounded original native function module required');const available=new Map(),completed=new Map(),active=new Set();let cells=0;
 for(const fn of functions){if(available.has(fn.name))fail('unique actual native generic helper binding required');available.set(fn.name,fn);}
 const tick=depth=>{if(++cells>100000||depth>160)fail('complete original native generic dependency bound');};
 function verify(fn,dependencyDepth=0){
  tick(dependencyDepth);if(dependencyDepth>64||available.get(fn.name)!==fn||active.has(fn.name))fail('actual acyclic original generic helper dependency required');if(completed.has(fn.name))return completed.get(fn.name);const typeParameter=portableType(fn.genericParameters?.[0]);if(fn.genericParameters.length!==1||fn.asynchronous||fn.parameters.length!==1||fn.parameters[0].type!==typeParameter||fn.returns!==typeParameter||fn.body.statements.length>4096||!fn.body.tail)fail('complete canonical native unchanged-input signature and body required');active.add(fn.name);
  const parameter=fn.parameters[0].name,live=new Map([[parameter,true]]),steps=[];
  function term(node,depth=0){
   tick(depth);if(node?.kind==='name'){if(live.get(node.name)!==true)fail('native generic value must move once from its actual live binding');live.set(node.name,false);return node.name;}
   if(node?.kind==='call'&&node.args.length===1&&available.get(node.path)?.genericParameters){verify(available.get(node.path),dependencyDepth+1);return node.path+'('+term(node.args[0],depth+1)+')';}
   fail('native generic term must retain an actual live value or complete checked unchanged-value helper');
  }
  for(const statement of fn.body.statements){tick(0);if(statement.kind!=='let'||statement.mutable||live.has(statement.name)||available.has(statement.name))fail('native generic locals must be actual fresh immutable linear bindings');const value=term(statement.value);live.set(statement.name,true);steps.push('const '+statement.name+' = '+value+';');}
  const returned=term(fn.body.tail);if([...live.values()].some(Boolean))fail('every native generic binding must move into the same returned original value');const result={typeParameter,parameter,javascriptBody:'{ '+(steps.length?steps.join(' ')+' ':'')+'return '+returned+'; }',sourceAuthority:false,semanticAuthority:false};active.delete(fn.name);completed.set(fn.name,result);return result;
 }
 return verify;
}

import {selectHttpResourceCallableSource} from './http-resource-source-grouping.mjs';
