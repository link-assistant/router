// A closed theorem over actual native syntax: one unconstrained input returned
// once, unchanged, with no other body statements, effects, drops or captures.
const fail=message=>{throw new TypeError('Resource original generic identity: '+message);};
export function hasHttpResourceGenericIdentitySource(ts,item){return !!item.typeParameters?.length||ts.getJSDocTags(item).some(tag=>ts.isJSDocTemplateTag(tag));}
function portableType(name){if(typeof name!=='string'||! /^[A-Z][A-Za-z0-9]*$/u.test(name)||['Self','String','Result','Option','Vec'].includes(name))fail('one portable original generic type parameter required');return name;}
function slot(ts,node,name){return !!node&&ts.isTypeReferenceNode(node)&&ts.isIdentifier(node.typeName)&&node.typeName.text===name&&!node.typeArguments?.length;}
export function captureHttpResourceGenericIdentity(ts,item,{language,file,name,moduleNames,erase,annotate}){
 if(item.getSourceFile()!==file||!item.body||item.asteriskToken||item.parameters.length!==1||item.modifiers?.some(modifier=>modifier.kind!==ts.SyntaxKind.ExportKeyword))fail('actual synchronous ordinary single-input generic identity required');
 const tags=ts.getJSDocTags(item).filter(tag=>ts.isJSDocTemplateTag(tag)),parameters=language==='TypeScript'?item.typeParameters:tags.length===1?tags[0].typeParameters:null;
 if(!parameters||parameters.length!==1||tags.length>1||tags.some(tag=>tag.constraint))fail('one actual unconstrained original template required');const parameter=parameters[0];if(parameter.constraint||parameter.default||parameter.modifiers?.length)fail('generic identity constraints/defaults require a separate original-source rule');const typeParameter=portableType(parameter.name.text),input=item.parameters[0];
 if(!ts.isIdentifier(input.name)||input.modifiers?.length||input.questionToken||input.dotDotDotToken||input.initializer)fail('one original required generic value parameter required');const id=name(input.name.text);if(moduleNames.has(id))fail('generic input cannot shadow the actual module');
 const inputType=language==='TypeScript'?input.type:ts.getJSDocType(input),outputType=language==='TypeScript'?item.type:ts.getJSDocReturnType(item);if(!slot(ts,inputType,typeParameter)||!slot(ts,outputType,typeParameter))fail('both original signatures must name their actual same lexical generic slot');
 const statements=item.body.statements;if(statements.length!==1||!ts.isReturnStatement(statements[0])||!ts.isIdentifier(statements[0].expression)||statements[0].expression.text!==id)fail('complete generic identity body must return its single unchanged input exactly once');
 const children=item.getChildren(file),close=children.filter(child=>child.kind===ts.SyntaxKind.CloseParenToken);if(close.length!==1)fail('one original generic function parameter boundary required');
 if(language==='TypeScript'){
  const less=children.filter(child=>child.kind===ts.SyntaxKind.LessThanToken),greater=children.filter(child=>child.kind===ts.SyntaxKind.GreaterThanToken),colon=children.filter(child=>child.kind===ts.SyntaxKind.ColonToken);if(less.length!==1||greater.length!==1||colon.length!==1||less[0].end>parameter.getStart(file)||greater[0].getStart(file)<parameter.end)fail('complete actual native generic/type annotation boundaries required');
  erase.push({span:[less[0].getStart(file),greater[0].end],replacement:''},{span:[input.name.end,inputType.end],replacement:''},{span:[colon[0].getStart(file),outputType.end],replacement:''},{span:[item.getStart(file),item.getStart(file)],replacement:'/**\n * @template '+typeParameter+'\n * @param {'+typeParameter+'} '+id+'\n * @returns {'+typeParameter+'}\n */\n'});
 }else{
  annotate.push({span:[item.name.end,item.name.end],replacement:'<'+typeParameter+'>'},{span:[input.name.end,input.name.end],replacement:': '+typeParameter},{span:[close[0].end,close[0].end],replacement:': '+typeParameter});
 }
 const type='generic:'+typeParameter,flow={steps:[],tail:{kind:'value',value:{kind:'variable',name:id,type,root:null,roots:[]}},type,lazy:false,captures:[],returnRoots:[],resourceExits:[[]],loopExits:[],scopeFallthroughs:[],functionReturns:[{type,returnRoots:[]}],propagatedErrors:[],loopFragment:false};
 return {kind:'http-resource-generic-identity-function',name:item.name.text,exported:item.modifiers?.some(modifier=>modifier.kind===ts.SyntaxKind.ExportKeyword)??false,parameters:[{name:id,type}],inputGuards:[],lazy:false,flow,returns:type,recursiveSignature:null,genericIdentity:{typeParameter,parameter:id},span:{start:item.getStart(file),end:item.end}};
}
export function requireHttpResourceNativeGenericIdentity(fn){
 const typeParameter=portableType(fn.genericParameters?.[0]);if(fn.genericParameters.length!==1||fn.asynchronous||fn.parameters.length!==1||fn.parameters[0].type!==typeParameter||fn.returns!==typeParameter||fn.body.statements.length||fn.body.tail?.kind!=='name'||fn.body.tail.name!==fn.parameters[0].name)fail('complete actual canonical native identity body and generic signature required');return {typeParameter,parameter:fn.parameters[0].name};
}
