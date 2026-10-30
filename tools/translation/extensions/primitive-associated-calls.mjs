import {checkCurrentPrimitiveOptionExpect} from './checked-primitive-option-expect.mjs';
// Genuine qualified primitive associated calls share the existing fixed contracts.
// This parser selection is eligibility; the original caller and every by-value
// argument are independently checked before the ordinary host-call IR is issued.
import {types as nodeTypes} from 'node:util';
import {HostRustParser,HostChecker,originalHostParserIdentitySnapshot,requireOriginalFromNamespaceCallbacks,requireOriginalPrimitiveTryFromChecker} from './host-contracts.mjs';
import {TokenCursor} from '../vendor/meta-language/translation/lexer.js';
import {assertOriginalParserIdentity} from '../original-parser-identity.mjs';
import {originalTextCursorGuard} from './text.mjs';
import {matchesParserFacts} from '../matches-macro-context.mjs';
import {originalSourceModuleItems} from '../source-module-views.mjs';
import {rustTokens} from '../rust-structure.mjs';
import {requireOriginalStandardCall} from './original-standard-calls.mjs';
import {metadataDigest} from './source-links.mjs';
import {rustFixedType} from '../checked-types.mjs';
import {actualFixedOperand} from './primitive-operators.mjs';
import {unsupported,typeError} from '../vendor/meta-language/translation/diagnostics.js';
const intrinsic=new Set(['checked_add','checked_sub','checked_mul','checked_neg','wrapping_add','wrapping_sub','wrapping_mul','saturating_add','saturating_sub','saturating_mul']);
const ordered=new Set(['min','max','clamp']),calls=new WeakMap(),vectorNamespaceInputs=new WeakMap();
const fixedName=name=>typeof name==='string'&&/^[iu](8|16|32|64|128)$/u.test(name);
const same=(left,right)=>left.length===right.length&&left.every((part,index)=>part===right[index]);
const significant=tokens=>tokens.filter(token=>token.type!=='comment');
function fail(message,span){throw unsupported('primitive associated source call',message,span);}
function originalParser(parser){
 requireOriginalFromNamespaceCallbacks(parser);const snapshot=originalHostParserIdentitySnapshot();
 assertOriginalParserIdentity(parser,HostRustParser.prototype,new Map(snapshot.parserMethods));
 assertOriginalParserIdentity(parser.cursor,TokenCursor.prototype,new Map(snapshot.cursorMethods),{originalGuard:originalTextCursorGuard(parser.cursor)});
}
// Keep actual source inputs, not an admission verdict. Revisit their original
// private module views and active bindings at parse and semantic-check time.
function namespaceInputs(state){
 const vectorParser=vectorNamespaceInputs.get(state),vectorMacros=vectorParser!==undefined;
 const {facts,consumer,path,start,owner,root}=state,ancestors=facts.evidence.scopes.filter(scope=>scope.path.every((name,index)=>consumer.path[index]===name)),scope=ancestors.find(scope=>scope.file===consumer.file&&same(scope.path,consumer.path));
 if(!scope||!same(path,consumer.path)||ancestors.some(scope=>scope.configurationCondition!=='active'||scope.unresolvedTypeScope!==false||scope.unresolvedAttributeMacroScope!==false))fail('requires complete active original type and attribute scopes',state.span);
 const forbidden=new Set(root?[root]:[owner]);
 for(const scope of ancestors)if(scope.bindings.some(binding=>binding.namespace==='type'&&forbidden.has(binding.name)))fail('the actual primitive or standard root is shadowed or imported',state.span);
 const point=state.offset+start,items=originalSourceModuleItems(consumer),containing=items.filter(item=>item.start<=point&&point<item.end);
 for(const item of containing){
  const tokens=significant(item.tokens),open=tokens.findIndex(token=>token.text==='{'),body=tokens.slice(open+1);
  if(open>=0){
   let facade=null;
   for(let index=0;index<body.length;index++){
    const token=body[index],declaration=['use','extern','trait','impl','type','mod','macro','macro_rules!'].includes(token.text),preceding=body[index-1],splitMacro=token.text==='!'&&preceding?.type==='ident'&&!['return','break','yield'].includes(preceding.text)&&['(','[','{'].includes(body[index+1]?.text),macro=vectorMacros?token.type==='ident'&&token.text.endsWith('!')||splitMacro:token.text.endsWith('!')||splitMacro;
    if(declaration||vectorMacros&&['struct','enum','union'].includes(token.text))fail('local declarations require their original lexical namespace rule',state.span);
    if(!macro)continue;
    if(!vectorMacros||!qualifiedOwnedVectorMacroAt(body,index))fail('macro expansion requires its separate original lexical namespace rule',state.span);
    // Only the actual source-qualified Router allocation abstraction is
    // modeled here. Public compatibilityCore flags and std/bare macro names
    // cannot issue this private facade proof.
    originalParser(vectorParser);const frame=matchesParserFacts(vectorParser);
    if(frame.facts!==facts||frame.module!==consumer)fail('vector namespace requires its unchanged actual parser/module frame',state.span);
    facade??=requireRouterCoreFacade(vectorParser);requireRouterCoreFacadeCurrent(vectorParser,facade);
   }
   if(facade){originalParser(vectorParser);requireRouterCoreFacadeCurrent(vectorParser,facade);}
  }
 }
 for(const module of facts.modules.filter(module=>module.path.every((name,index)=>consumer.path[index]===name))){
  const original=originalSourceModuleItems(module),inner=original.filter(item=>item.tokens[1]?.text==='!').flatMap(item=>significant(item.tokens)),outer=module.sourceView.declaration?significant(rustTokens(module.source.slice(module.sourceView.declaration.span.start,module.sourceView.bodySpan.start))):[];
  if([...inner,...outer].some((token,index,tokens)=>['no_implicit_prelude','no_core'].includes(token.text)&&tokens[index-1]?.text==='['))fail('disabled original standard namespaces require separate edition and extern resolution',state.span);
 }
}
export function parsePrimitiveAssociatedCall(parser,path){
 const cursor=parser.cursor,first=cursor.peek();let at=cursor.is('::')?1:0;const segments=[];
 if(cursor.peek(at).kind!=='identifier')return null;
 segments.push(cursor.peek(at++).value);
 while(cursor.is('::',at)&&cursor.peek(at+1).kind==='identifier'){segments.push(cursor.peek(at+1).value);at+=2;}
 if(!cursor.is('(',at))return null;
 const method=segments.at(-1),owner=segments.slice(0,-1),plain=owner.length===1&&fixedName(owner[0])&&intrinsic.has(method),qualified=owner.length===3&&['std','core'].includes(owner[0])&&owner[1]==='primitive'&&fixedName(owner[2])&&intrinsic.has(method),ord=owner.length===3&&['std','core'].includes(owner[0])&&owner[1]==='cmp'&&owner[2]==='Ord'&&ordered.has(method),optionExpect=owner.length===3&&['std','core'].includes(owner[0])&&owner[1]==='option'&&owner[2]==='Option'&&method==='expect';
 if(!plain&&!qualified&&!ord&&!optionExpect)return null;
 originalParser(parser);const frame=matchesParserFacts(parser),root=plain?null:owner[0],primitive=ord||optionExpect?null:owner.at(-1),range={start:first.start,end:cursor.peek(at).end};
 if(parser.unresolvedImportScope||[root,primitive].filter(Boolean).some(name=>parser.builtinShadow(name,path)||parser.shadowedEffectRoots?.has(name)||parser.shadowedPreludeTypes?.has(name)))fail('unresolved import or shadowed original owner',range);
 if(!same(parser.resolveSourceNamespace(owner,path,'type'),owner))fail('requires the original resolved primitive or fully qualified standard owner',range);
 if(!Number.isSafeInteger(first.start)||first.start<0||first.start>=frame.sourceLength||!frame.tokens.some(token=>token.start===first.start))fail('call begins outside its genuine original token stream',range);
 const inputs={facts:frame.facts,consumer:frame.module,path:[...path],start:first.start,offset:frame.offset,owner:primitive,root,span:range};namespaceInputs(inputs);
 for(let index=0;index<at;index++)cursor.next();cursor.expect('(','primitive associated call');const args=[];
 while(!cursor.is(')')){args.push(parser.expr(path));if(!cursor.eat(','))break;}
 const close=cursor.expect(')','primitive associated call'),node={k:'routerPrimitiveAssociatedCall',owner:[...owner],method,args,span:{start:first.start,end:close.end}};
 originalParser(parser);calls.set(node,{inputs,primitive,ord,optionExpect,digest:metadataDigest(node)});return node;
}
export function checkPrimitiveAssociatedCall(checker,node,env,path,expected){
 if(!checker||nodeTypes.isProxy(checker)||Object.getPrototypeOf(checker)!==HostChecker.prototype||Object.hasOwn(checker,'expr'))fail('requires the actual original Host checker',node.span);
 requireOriginalPrimitiveTryFromChecker(checker);requireOriginalStandardCall(checker,node);
 const state=calls.get(node);if(!state||state.digest!==metadataDigest(node))fail('copied or changed caller has no private original namespace inputs',node.span);
 namespaceInputs(state.inputs);
 if(state.optionExpect){const result=checkCurrentPrimitiveOptionExpect(checker,node,env,path,expected);namespaceInputs(state.inputs);requireOriginalStandardCall(checker,node);if(state.digest!==metadataDigest(node))fail('caller changed before the closing Option source fence',node.span);return result;}
 const arity=node.method==='checked_neg'?1:node.method==='clamp'?3:2;if(node.args.length!==arity)throw typeError('primitive associated operation expects '+arity+' arguments',node.span);
 const domain=state.primitive?{...rustFixedType(state.primitive),rustPrimitiveName:state.primitive}:expected?.kind==='fixed'?expected:undefined;
 const first=checker.expr(node.args[0],env,path,domain),actual=actualFixedOperand(first.type,node.span);
 if(state.primitive&&actual.rustPrimitiveName!==state.primitive)throw typeError('associated primitive owner differs from its by-value first argument',node.span);
 for(const argument of node.args.slice(1)){
  const checked=checker.expr(argument,env,path,actual),type=actualFixedOperand(checked.type,node.span);
  if(type.rustPrimitiveName!==actual.rustPrimitiveName)throw typeError('associated primitive arguments require identical actual source widths and signedness',node.span);
 }
 const instance=checker.instantiations.fixed(actual,node.span),contracts=instance.contracts.filter(contract=>contract.rustPath.at(-1)===node.method&&(!state.ord||contract.trait==='std::cmp::Ord'&&contract.traitImplementation==='primitive-integer'));
 if(contracts.length!==1)fail('requires one genuine current fixed contract',node.span);
 // Source checking above emits no runtime evaluation. hostCall retains the
 // original surface arguments once each, in their original left-to-right order.
 const result=checker.hostCall(contracts,node.args,env,path,expected,node.span);namespaceInputs(state.inputs);requireOriginalStandardCall(checker,node);if(state.digest!==metadataDigest(node))fail('caller changed before the closing source fence',node.span);return result;
}

export function requireOriginalPrimitiveAssociatedCall(checker,node){
 if(!checker||nodeTypes.isProxy(checker)||Object.getPrototypeOf(checker)!==HostChecker.prototype||Object.hasOwn(checker,'expr'))fail('requires the actual original Host checker',node.span);requireOriginalPrimitiveTryFromChecker(checker);requireOriginalStandardCall(checker,node);const state=calls.get(node);if(!state||state.digest!==metadataDigest(node))fail('requires unchanged private original associated caller inputs',node.span);namespaceInputs(state.inputs);
}

// DATA eligibility inside the actual original function's complete token body.
// requireRouterCoreFacade independently issues and rechecks the owner boundary.
function qualifiedOwnedVectorMacroAt(tokens,index){
 const token=tokens[index],separate=token.text==='!',nameAt=separate?index-1:index;
 if(nameAt<4||tokens[nameAt]?.text!==(separate?'vec':'vec!')||tokens[index+1]?.text!=='[')return false;
 if(['::','$'].includes(tokens[nameAt-5]?.text))return false;
 return ['crate','::','translation_core','::'].every((text,at)=>tokens[nameAt-4+at]?.text===text);
}
import {requireRouterCoreFacade,requireRouterCoreFacadeCurrent} from '../router-core-formatting.mjs';
export function parsePrimitiveAssociatedVectorCall(parser,path){
 const cursor=parser.cursor,first=cursor.peek();let at=cursor.is('::')?1:0;const segments=[];
 if(cursor.peek(at).kind!=='identifier')return null;
 segments.push(cursor.peek(at++).value);
 while(cursor.is('::',at)&&cursor.peek(at+1).kind==='identifier'){segments.push(cursor.peek(at+1).value);at+=2;}
 if(!cursor.is('(',at))return null;
 const method=segments.at(-1),owner=segments.slice(0,-1),plain=owner.length===1&&fixedName(owner[0])&&intrinsic.has(method),qualified=owner.length===3&&['std','core'].includes(owner[0])&&owner[1]==='primitive'&&fixedName(owner[2])&&intrinsic.has(method),ord=owner.length===3&&['std','core'].includes(owner[0])&&owner[1]==='cmp'&&owner[2]==='Ord'&&ordered.has(method),optionExpect=owner.length===3&&['std','core'].includes(owner[0])&&owner[1]==='option'&&owner[2]==='Option'&&method==='expect';
 if(!plain&&!qualified&&!ord&&!optionExpect)return null;
 originalParser(parser);const frame=matchesParserFacts(parser),root=plain?null:owner[0],primitive=ord||optionExpect?null:owner.at(-1),range={start:first.start,end:cursor.peek(at).end};
 if(parser.unresolvedImportScope||[root,primitive].filter(Boolean).some(name=>parser.builtinShadow(name,path)||parser.shadowedEffectRoots?.has(name)||parser.shadowedPreludeTypes?.has(name)))fail('unresolved import or shadowed original owner',range);
 if(!same(parser.resolveSourceNamespace(owner,path,'type'),owner))fail('requires the original resolved primitive or fully qualified standard owner',range);
 if(!Number.isSafeInteger(first.start)||first.start<0||first.start>=frame.sourceLength||!frame.tokens.some(token=>token.start===first.start))fail('call begins outside its genuine original token stream',range);
 const inputs={facts:frame.facts,consumer:frame.module,path:[...path],start:first.start,offset:frame.offset,owner:primitive,root,span:range};vectorNamespaceInputs.set(inputs,parser);namespaceInputs(inputs);
 for(let index=0;index<at;index++)cursor.next();cursor.expect('(','primitive associated call');const args=[];
 while(!cursor.is(')')){args.push(parser.expr(path));if(!cursor.eat(','))break;}
 const close=cursor.expect(')','primitive associated call'),node={k:'routerPrimitiveAssociatedCall',owner:[...owner],method,args,span:{start:first.start,end:close.end}};
 originalParser(parser);calls.set(node,{inputs,primitive,ord,optionExpect,digest:metadataDigest(node)});return node;
}
