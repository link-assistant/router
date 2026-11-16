// Isolated source-only Rust syntax. Opaque macro inputs are never Host IR and
// are never evaluated, expanded, namespace-resolved or sent to an emitter.
import {types} from 'node:util';
import {originalLexingIntrinsicsUnchanged} from './original-lexing-intrinsics.mjs';
import {originalNamespaceTraversalIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
import {createHash} from 'node:crypto';
import {ownData,copyMetadata} from './extensions/source-links.mjs';
import {originalSourceModuleItems,isSourceModuleView} from './source-module-views.mjs';
import {originalDeclarationHeader} from './module-bindings.mjs';
import {originalImplMemberItems} from './rust-member-boundaries.mjs';
import {rustTokens} from './rust-structure.mjs';
import {isPlainSourceIdentifier} from './module-paths.mjs';
import {originalMacroInvocation} from './macro-token-trees.mjs';
import {originalNamespaceParserSourcePlan,requireOriginalNamespaceParserSourcePlan} from './namespace-parser-source.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex'),frames=new WeakMap(),confinements=new WeakMap(),invocationInputs=new WeakMap(),expressionCaptures=new WeakMap();
const parsers=new WeakSet(),cursors=new WeakSet(),nodes=new WeakMap(),trees=new WeakMap();
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const fail=message=>{throw new TypeError('Original namespace parser: '+message);};
const pairs={'(':')','[':']','{':'}'};
const sourceApply=Reflect.apply,sourceText=Function.prototype.toString,sourceDescriptor=Object.getOwnPropertyDescriptor,sourceKeys=Reflect.ownKeys;
const sourceObjectPrototype=Object.prototype,sourcePins=[];
const native=(fn,name)=>typeof fn==='function'&&!types.isProxy(fn)&&sourceApply(sourceText,fn,[])===`function ${name}() { [native code] }`;
let nativeReady=originalLexingIntrinsicsUnchanged()&&originalNamespaceTraversalIntrinsicsUnchanged();
const numberField=nativeReady?sourceDescriptor(globalThis,'Number'):null,stringField=nativeReady?sourceDescriptor(globalThis,'String'):null;
if(!numberField||!Object.hasOwn(numberField,'value')||!native(numberField.value,'Number')||!stringField||!Object.hasOwn(stringField,'value')||!native(stringField.value,'String'))nativeReady=false;
const sourceObjectPins=nativeReady?Object.getOwnPropertyDescriptors(sourceObjectPrototype):null;
if(nativeReady){const expected=['constructor','__defineGetter__','__defineSetter__','hasOwnProperty','__lookupGetter__','__lookupSetter__','isPrototypeOf','propertyIsEnumerable','toString','valueOf','__proto__','toLocaleString'],names=sourceKeys(sourceObjectPins);if(names.length!==expected.length)nativeReady=false;for(const name of names){if(!expected.includes(name)){nativeReady=false;continue;}const field=sourceObjectPins[name];if(Object.hasOwn(field,'value')){if(!native(field.value,name==='constructor'?'Object':name))nativeReady=false;}else if(name!=='__proto__'||!native(field.get,'get __proto__')||!native(field.set,'set __proto__'))nativeReady=false;}}

if(nativeReady){for(const [owner,key,name]of [[globalThis,'Number','Number'],[globalThis,'String','String'],[numberField.value,'isSafeInteger','isSafeInteger'],[stringField.value.prototype,'normalize','normalize'],[stringField.value.prototype,'endsWith','endsWith']]){const field=sourceDescriptor(owner,key);sourcePins.push({owner,key,field});if(!field||!Object.hasOwn(field,'value')||!native(field.value,name))nativeReady=false;}}

function intrinsicGuard(){
 if(!nativeReady||!originalLexingIntrinsicsUnchanged()||!originalNamespaceTraversalIntrinsicsUnchanged())fail('source-only native parser operations unavailable');
 for(const pin of sourcePins){const field=sourceDescriptor(pin.owner,pin.key),before=pin.field;if(!field||!Object.hasOwn(field,'value')||field.value!==before.value||field.writable!==before.writable||field.enumerable!==before.enumerable||field.configurable!==before.configurable)fail('source-only parser operation changed');}
 const fields=Object.getOwnPropertyDescriptors(sourceObjectPrototype),keys=sourceKeys(fields),prior=sourceKeys(sourceObjectPins);if(keys.length!==prior.length)fail('source-only object prototype changed');
 for(let index=0;index<keys.length;index++){const key=keys[index],field=fields[key],before=sourceObjectPins[key];if(key!==prior[index]||!before||Object.hasOwn(field,'value')!==Object.hasOwn(before,'value')||field.value!==before.value||field.get!==before.get||field.set!==before.set||field.writable!==before.writable||field.enumerable!==before.enumerable||field.configurable!==before.configurable)fail('source-only object prototype changed');}
}
function sameSnapshot(left,right){if(left===right)return true;if(left===null||right===null||typeof left!=='object'||typeof right!=='object'||Array.isArray(left)!==Array.isArray(right))return false;const a=Object.getOwnPropertyDescriptors(left),b=Object.getOwnPropertyDescriptors(right),keys=Reflect.ownKeys(a),other=Reflect.ownKeys(b);if(keys.length!==other.length)return false;for(let at=0;at<keys.length;at++){const key=keys[at];if(key!==other[at]||!Object.hasOwn(a[key],'value')||!Object.hasOwn(b[key],'value')||!sameSnapshot(a[key].value,b[key].value))return false;}return true;}
const isName=token=>token?.type==='ident'&&/^[\p{XID_Start}_][\p{XID_Continue}_]*$/u.test(token.text);
export const ORIGINAL_NAMESPACE_PARSER_LIMITS=Object.freeze({sourceBytes:256000,tokens:32000,nodes:50000,depth:96,members:512});
const nodeKinds=new Set(['Function','Parameter','Generics','GenericParameter','Where','Bound','ReferenceType','PointerType','TupleType','SliceType','ArrayType','PathType','NeverType','InferType','FunctionType','TypeArguments','AssociatedTypeArgument','Lifetime','BoundType','OpaqueBang','Attribute','Block','Statement','Let','Use','UseTree','MacroDefinition','Path','Literal','Unary','Binary','Call','Index','Field','Try','Cast','Tuple','Array','RepeatArray','Struct','StructField','If','Match','Arm','Closure','Jump','Loop','While','For','Pattern','PatternField','Empty']);
function normalize(raw){
 const result=[];
 for(let at=0;at<raw.length;at++){
  const token=raw[at];
  if(token.type==='comment')continue;
  if(token.type==='punct'&&token.text==='.'&&raw[at+1]?.type==='punct'&&raw[at+1].text==='.'&&token.end===raw[at+1].start){const second=raw[++at],third=raw[at+1],inclusive=third?.type==='punct'&&third.text==='='&&second.end===third.start;if(inclusive)at++;result.push({...token,text:inclusive?'..=':'..',end:inclusive?third.end:second.end,originalPunctuation:inclusive?[token,second,third]:[token,second]});}
  else if(token.type==='ident'&&token.text.endsWith('!')){result.push({...token,text:token.text.slice(0,-1),end:token.end-1});result.push({type:'punct',text:'!',start:token.end-1,end:token.end});}
  else if(token.type==='punct'&&['>>','>>>','&&'].includes(token.text)){for(let index=0;index<token.text.length;index++)result.push({...token,text:token.text[index],start:token.start+index,end:token.start+index+1});}
  else result.push({...token});
 }
 return freeze(result);
}
class NamespaceCursor{
 constructor(tokens){this.tokens=tokens;this.index=0;cursors.add(this);}
 peek(offset=0){return this.tokens[this.index+offset]??null;}
 is(text){return this.peek()?.text===text;}
 take(){const token=this.peek();if(!token)fail('unexpected end of original syntax');this.index++;return token;}
 eat(text){return this.is(text)?this.take():null;}
 expect(text){const token=this.take();if(token.text!==text)fail('expected '+text+' at '+token.start+', found '+token.text);return token;}
}
const methods=prototype=>Object.getOwnPropertyDescriptors(prototype);
let parserMethods,cursorMethods;
function identity(parser){
 intrinsicGuard();
 if(!parsers.has(parser)||Object.getPrototypeOf(parser)!==NamespaceParser.prototype||!cursors.has(parser.cursor)||Object.getPrototypeOf(parser.cursor)!==NamespaceCursor.prototype)fail('private parser/cursor identity required');
 for(const [object,snapshot]of [[NamespaceParser.prototype,parserMethods],[NamespaceCursor.prototype,cursorMethods]]){
  const current=Object.getOwnPropertyDescriptors(object);if(Reflect.ownKeys(current).length!==Reflect.ownKeys(snapshot).length)fail('private grammar method set changed');
  for(const key of Reflect.ownKeys(snapshot)){const before=snapshot[key],after=current[key];if(!after||!Object.hasOwn(after,'value')||after.value!==before.value||after.enumerable!==before.enumerable||after.configurable!==before.configurable||after.writable!==before.writable)fail('private grammar method identity changed');}
 }
}
class NamespaceParser{
 constructor(source,raw){this.source=source;this.raw=raw;this.cursor=new NamespaceCursor(normalize(raw));this.count=0;this.depth=0;this.treeCells=0;this.treeBytes=0;this.invocations=[];parsers.add(this);}
 node(kind,start,fields={},end=this.cursor.tokens[this.cursor.index-1]?.end??start){
  if(!nodeKinds.has(kind)||++this.count>ORIGINAL_NAMESPACE_PARSER_LIMITS.nodes)fail('positive grammar/node budget');
  const result={kind,span:{start,end},fields};nodes.set(result,this);return result;
 }
 enter(run){if(++this.depth>ORIGINAL_NAMESPACE_PARSER_LIMITS.depth)fail('positive grammar depth bound');try{return run();}finally{this.depth--;}}
 name(path=false){const first=this.cursor.take();if(first.text==='r'&&this.cursor.is('#')&&isName(this.cursor.peek(1))&&first.end===this.cursor.peek().start&&this.cursor.peek().end===this.cursor.peek(1).start){this.cursor.take();const raw=this.cursor.take().text;if(['_','crate','self','Self','super'].includes(raw)||raw.normalize('NFC')!==raw)fail('unproved raw identifier');return raw;}if(!isName(first)||!(isPlainSourceIdentifier(first.text)||path&&['self','Self','crate','super'].includes(first.text)))fail('original identifier required at '+first.start);return first.text;}
 lifetime(label=false){const token=this.cursor.take(),name=token.text.slice(1);if(token.type!=='char'||token.text[0]!=="'"||!(/^[\p{XID_Start}_][\p{XID_Continue}_]*$/u.test(name))||name.normalize('NFC')!==name||!(isPlainSourceIdentifier(name)||!label&&['static','_'].includes(name))||label&&name==='_')fail('original lifetime or label identifier required');return this.node('Lifetime',token.start,{original:token.text});}
 originalTree(open,depth=0){
  if(depth>ORIGINAL_NAMESPACE_PARSER_LIMITS.depth)fail('original TT depth bound');
  const c=this.cursor,start=c.peek()?.start;if(!Object.hasOwn(pairs,c.peek()?.text))fail('complete original TT group required');const close=pairs[c.take().text];
  while(!c.is(close)){if(!c.peek())fail('unterminated original TT');if(Object.hasOwn(pairs,c.peek().text))this.originalTree(c.peek().text,depth+1);else if([')',']','}'].includes(c.peek().text))fail('mismatched original TT');else c.take();}
  const end=c.take().end,raw=this.raw.filter(token=>token.start>=start&&token.end<=end),tree={kind:'original-token-tree',delimiter:open,span:{start,end},original:this.source.slice(start,end),tokens:raw.map(token=>({...token}))};this.treeCells+=raw.length+1;this.treeBytes+=3*tree.original.length;if(this.treeCells>200000||this.treeBytes>4194304)fail('complete original TT budget');trees.set(tree,this);return tree;
 }
 attributes(mode='outer'){const result=[],c=this.cursor;while(c.is('#')){if(mode==='inner'&&c.peek(1)?.text!=='!')break;const start=c.take().start,inner=!!c.eat('!');if(inner&&mode!=='inner')fail('inner attribute outside original initial block attribute position');if(!c.is('['))fail('original attribute bracket required');const tree=this.originalTree('[');result.push(this.node('Attribute',start,{inner,tree,ownerResolved:false}));}return result;}
 path(type=false){const c=this.cursor,start=c.peek()?.start,segments=[],segmentArguments=[],absolute=!!c.eat('::');
  do{segments.push(this.name(true));segmentArguments.push(type&&c.is('<')?this.typeArguments():null);if(!c.is('::')||!type&&c.peek(1)?.text==='<')break;c.take();}while(true);
  return this.node(type?'PathType':'Path',start,{absolute,segments,segmentArguments});
 }
 opaque(path,position){const c=this.cursor,start=path.span.start;c.expect('!');const open=c.peek()?.text,tree=this.originalTree(open),node=this.node('OpaqueBang',start,{path,position,tree,ownerResolved:false,globalBangEffect:'unresolved',runtimeEffect:'unresolved'});this.invocations.push(node);return node;}
 type(){return this.enter(()=>{const c=this.cursor,start=c.peek()?.start,attributes=this.attributes();let result;
  if(c.eat('&')){let lifetime=null;if(c.peek()?.type==='char'&&c.peek().text.startsWith("'"))lifetime=this.lifetime();const mutable=!!c.eat('mut');result=this.node('ReferenceType',start,{lifetime,mutable,pointee:this.type()});}
  else if(c.eat('*')){const qualifier=c.take().text;if(!['const','mut'].includes(qualifier))fail('pointer qualifier required');result=this.node('PointerType',start,{qualifier,pointee:this.type()});}
  else if(c.eat('!'))result=this.node('NeverType',start);
  else if(c.eat('_'))result=this.node('InferType',start);
  else if(c.eat('(')){const values=[];while(!c.is(')')){values.push(this.type());if(!c.eat(','))break;}c.expect(')');result=this.node('TupleType',start,{values});}
  else if(c.eat('[')){const element=this.type();let length=null;if(c.eat(';'))length=this.expression();c.expect(']');result=this.node(length?'ArrayType':'SliceType',start,{element,length});}
  else if(c.is('fn')){c.take();c.expect('(');const parameters=[];while(!c.is(')')){parameters.push(this.type());if(!c.eat(','))break;}c.expect(')');result=this.node('FunctionType',start,{parameters,result:c.eat('->')?this.type():null});}
  else if(c.is('dyn')||c.is('impl')){const qualifier=c.take().text;result=this.node('BoundType',start,{qualifier,bounds:this.bounds()});}
  else {result=this.path(true);if(c.is('!'))result=this.opaque(result,'Ty');}
  if(attributes.length)result=this.node('BoundType',start,{attributes,value:result});return result;
 });}
 typeArguments(){const c=this.cursor,start=c.expect('<').start,values=[];while(!c.is('>')){
  if(c.peek()?.type==='char'&&c.peek().text.startsWith("'"))values.push(this.lifetime());
  else if(isName(c.peek())&&c.peek(1)?.text==='='){const at=c.peek().start,name=this.name();c.take();values.push(this.node('AssociatedTypeArgument',at,{name,value:this.type()}));}
  else if(c.peek()?.type==='number'||c.is('{'))values.push(this.expression(0,false));
  else values.push(this.type());
  if(!c.eat(','))break;
 }c.expect('>');return this.node('TypeArguments',start,{values});}
 bounds(){const c=this.cursor,result=[];do{const start=c.peek()?.start,optional=!!c.eat('?');if(c.peek()?.type==='char'&&c.peek().text.startsWith("'"))result.push(this.node('Bound',start,{optional,lifetime:this.lifetime()}));else result.push(this.node('Bound',start,{optional,type:this.type()}));}while(c.eat('+'));return result;}
 generics(){const c=this.cursor,start=c.expect('<').start,parameters=[];while(!c.is('>')){const at=c.peek()?.start,attributes=this.attributes();let lifetime=null,constant=false,name=null,type=null,bounds=[],default_=null;
  if(c.peek()?.type==='char'&&c.peek().text.startsWith("'"))lifetime=this.lifetime().fields.original;else{constant=!!c.eat('const');name=this.name();}
  if(c.eat(':')){if(constant)type=this.type();else bounds=this.bounds();}if(c.eat('='))default_=constant?this.expression(0,false):this.type();parameters.push(this.node('GenericParameter',at,{attributes,lifetime,constant,name,type,bounds,default:default_}));if(!c.eat(','))break;
 }c.expect('>');return this.node('Generics',start,{parameters});}
 where(){const c=this.cursor;if(!c.is('where'))return null;const start=c.take().start,clauses=[];while(!c.is('{')&&!c.is(';')){const type=this.type();c.expect(':');clauses.push(this.node('Bound',type.span.start,{type,bounds:this.bounds()}));if(!c.eat(','))break;}return this.node('Where',start,{clauses});}
 function(attributes=[],context='free'){const c=this.cursor,start=attributes[0]?.span.start??c.peek()?.start;let visibility=null;if(c.eat('pub')){visibility='pub';if(c.is('('))visibility=this.originalTree('(');}
  const qualifiers=[];for(const name of ['const','async','unsafe'])if(c.eat(name))qualifiers.push(name);if(c.eat('extern')){qualifiers.push('extern');if(c.peek()?.type==='string')qualifiers.push(c.take().text);}c.expect('fn');const name=this.name(),generics=c.is('<')?this.generics():null;c.expect('(');const parameters=[];
  const selfSpelling=value=>value.kind==='Pattern'&&value.fields.variant==='path'&&value.fields.path.fields.segments.length===1&&value.fields.path.fields.segments[0]==='self';
  const bareSelf=value=>selfSpelling(value)&&value.fields.path.fields.absolute===false&&value.fields.path.fields.segmentArguments.length===1&&value.fields.path.fields.segmentArguments[0]===null;
  const containsSelf=value=>value&&typeof value==='object'&&(value.kind==='Pattern'&&selfSpelling(value)||Object.values(value).some(containsSelf));
  while(!c.is(')')){const at=c.peek()?.start,attrs=this.attributes();let pattern;
   let receiverAt=c.index;if(c.tokens[receiverAt]?.text==='&'){receiverAt++;if(c.tokens[receiverAt]?.type==='char')receiverAt++;if(c.tokens[receiverAt]?.text==='mut')receiverAt++;}
   if(context!=='free'&&parameters.length===0&&c.is('&')&&c.tokens[receiverAt]?.text==='self'){
    c.take();const lifetime=c.peek()?.type==='char'?this.lifetime():null,mutable=!!c.eat('mut'),path=this.path();pattern=this.node('Pattern',at,{variant:'reference',lifetime,mutable,value:this.node('Pattern',path.span.start,{variant:'path',path})});
   }else pattern=this.pattern(false);
   const type=c.eat(':')?this.type():null,owned=bareSelf(pattern)||pattern.fields.variant==='binding-qualifier'&&pattern.fields.qualifier==='mut'&&bareSelf(pattern.fields.value),shared=pattern.fields.variant==='reference'&&bareSelf(pattern.fields.value),receiver=owned||shared;
   if(containsSelf(pattern)&&(!receiver||context==='free'||parameters.length!==0)||!type&&!receiver||shared&&type)fail('typed ordinary parameter or exact first original method receiver required');
   parameters.push(this.node('Parameter',at,{attributes:attrs,pattern,type}));if(!c.eat(','))break;
  }
  c.expect(')');const result=c.eat('->')?this.type():null,where=this.where();let body=null;if(c.eat(';')){if(context!=='trait')fail('original ordinary function body required');}else body=this.block();return this.node('Function',start,{attributes,visibility,qualifiers,name,generics,parameters,result,where,body});
 }
 pattern(or=true){return this.enter(()=>{const c=this.cursor,start=c.peek()?.start;let result;
  if(c.eat('&')){const mutable=!!c.eat('mut');result=this.node('Pattern',start,{variant:'reference',mutable,value:this.pattern(false)});}
  else if(c.is('mut')||c.is('ref')){const qualifier=c.take().text;result=this.node('Pattern',start,{variant:'binding-qualifier',qualifier,value:this.pattern(false)});}
  else if(c.eat('(')){const values=[];while(!c.is(')')){values.push(this.pattern());if(!c.eat(','))break;}c.expect(')');result=this.node('Pattern',start,{variant:'tuple',values});}
  else if(c.eat('_'))result=this.node('Pattern',start,{variant:'wildcard'});
  else if(['number','string'].includes(c.peek()?.type)||c.is('true')||c.is('false'))result=this.node('Pattern',start,{variant:'literal',original:c.take().text});
  else{const path=this.path();let values=[];if(c.eat('(')){while(!c.is(')')){values.push(this.pattern());if(!c.eat(','))break;}c.expect(')');result=this.node('Pattern',start,{variant:'tuple-constructor',path,values});}else if(c.eat('{')){while(!c.is('}')){const at=c.peek().start;if(c.eat('..')){values.push(this.node('PatternField',at,{rest:true}));break;}const name=this.name(),value=c.eat(':')?this.pattern():null;values.push(this.node('PatternField',at,{name,value}));if(!c.eat(','))break;}c.expect('}');result=this.node('Pattern',start,{variant:'struct',path,values});}else result=this.node('Pattern',start,{variant:'path',path});}
  if(or&&c.eat('|'))result=this.node('Pattern',start,{variant:'or',left:result,right:this.pattern()});return result;
 });}
 useTree(prefix=[]){const c=this.cursor,start=c.peek()?.start;let absolute=!!c.eat('::'),segments=[...prefix],children=[],glob=false,alias=null;
  if(c.eat('{')){while(!c.is('}')){children.push(this.useTree(segments));if(!c.eat(','))break;}c.expect('}');}
  else if(c.eat('*'))glob=true;
  else{segments.push(this.name(true));if(c.eat('::'))children.push(this.useTree(segments));else if(c.eat('as'))alias=c.eat('_')?'_':this.name();}
  return this.node('UseTree',start,{absolute,segments,children,glob,alias,namespaceResolved:false});
 }
 block(){return this.enter(()=>{const c=this.cursor,start=c.expect('{').start,statements=[],innerAttributes=[];
  while(c.is('#')&&c.peek(1)?.text==='!')innerAttributes.push(...this.attributes('inner'));
  while(!c.is('}')){if(!c.peek())fail('unterminated complete original block');const before=c.index,attributes=this.attributes(),at=attributes[0]?.span.start??c.peek()?.start;
   if(c.eat(';'))statements.push(this.node('Empty',at,{attributes}));
   else if(['fn','pub','const','async','unsafe','extern'].includes(c.peek()?.text)&&this.functionAhead())statements.push(this.function(attributes));
   else if(c.eat('use')){const tree=this.useTree();c.expect(';');statements.push(this.node('Use',at,{attributes,tree,namespaceResolved:false}));}
   else if(c.is('macro_rules')){const nameToken=c.take();c.expect('!');const name=this.name(),open=c.peek()?.text,tree=this.originalTree(open);if(open==='{')c.eat(';');else c.expect(';');statements.push(this.node('MacroDefinition',at,{attributes,name,tree,sourceKeyword:nameToken.text,macroKind:'unresolved-until-original-attribute-owners',globalBangEffect:'unresolved'}));}
   else if(c.eat('let')){const pattern=this.pattern(false),type=c.eat(':')?this.type():null,value=c.eat('=')?this.expression():null,otherwise=c.eat('else')?this.block():null;c.expect(';');statements.push(this.node('Let',at,{attributes,pattern,type,value,otherwise}));}
   else{const value=this.expression(0,true,true),semicolon=!!c.eat(';');if(!semicolon&&!c.is('}')&&!['Block','If','Match','Loop','While','For'].includes(value.kind)&&!(value.kind==='OpaqueBang'&&value.fields.position==='Stmts'))fail('statement delimiter or complete block tail required at '+c.peek()?.start);statements.push(this.node('Statement',at,{attributes,value,semicolon}));}
   if(c.index<=before)fail('positive grammar made no token progress');
  }c.expect('}');return this.node('Block',start,{innerAttributes,statements});
 });}
 functionAhead(){const c=this.cursor;let at=c.index;if(c.tokens[at]?.text==='pub'){at++;if(c.tokens[at]?.text==='('){let depth=1;for(at++;at<c.tokens.length&&depth;at++){if(c.tokens[at].text==='(')depth++;if(c.tokens[at].text===')')depth--;}}}for(const q of ['const','async','unsafe'])if(c.tokens[at]?.text===q)at++;if(c.tokens[at]?.text==='extern'){at++;if(c.tokens[at]?.type==='string')at++;}return c.tokens[at]?.text==='fn';}
 expression(minimum=0,structAllowed=true,statementStart=false){return this.enter(()=>{const c=this.cursor,start=c.peek()?.start;let left=this.prefix(structAllowed,statementStart);
  if(left.kind==='OpaqueBang'&&left.fields.position==='Stmts')return left;
  while(c.peek()){
   if(c.is('(')){c.take();const args=[];while(!c.is(')')){args.push(this.expression());if(!c.eat(','))break;}c.expect(')');left=this.node('Call',start,{callee:left,args});continue;}
   if(c.eat('[')){if(c.is(']'))fail('complete index expression required');const index=this.expression();c.expect(']');left=this.node('Index',start,{object:left,index});continue;}
   if(c.eat('.')){const member=c.peek()?.type==='number'?c.take().text:this.name();let arguments_=null;if(c.eat('::'))arguments_=this.typeArguments();left=this.node('Field',start,{object:left,member,arguments:arguments_});continue;}
   if(c.eat('?')){left=this.node('Try',start,{value:left});continue;}
   if(c.is('as')){if(12<minimum)break;c.take();left=this.node('Cast',start,{value:left,type:this.type()});continue;}
   let operation=c.peek().text,width=1;if(['&','>'].includes(operation)&&c.peek(1)?.text===operation&&c.peek().end===c.peek(1).start){operation+=operation;width=2;}
   const priorities={'=':1,'+=':1,'-=':1,'*=':1,'/=':1,'..':2,'..=':2,'||':3,'&&':4,'==':5,'!=':5,'<':6,'>':6,'<=':6,'>=':6,'|':7,'^':8,'&':9,'<<':10,'>>':10,'+':11,'-':11,'*':12,'/':12,'%':12};
   const precedence=priorities[operation];if(precedence===undefined||precedence<minimum)break;for(let at=0;at<width;at++)c.take();
   const right=operation==='..'&&[']',')',',',';','}'].includes(c.peek()?.text)?null:this.expression(precedence+(precedence===1?0:1),structAllowed);left=this.node('Binary',start,{operation,left,right});
  }
  return left;
 });}
 prefix(structAllowed,statementStart=false){const c=this.cursor,start=c.peek()?.start,attributes=this.attributes();let result;
  if(c.is('{'))result=this.block();
  else if(c.eat('if')){const condition=this.expression(0,false),then=this.block(),otherwise=c.eat('else')?(c.is('if')?this.expression(0,false):this.block()):null;result=this.node('If',start,{condition,then,otherwise});}
  else if(c.eat('match')){const subject=this.expression(0,false);c.expect('{');const arms=[];while(!c.is('}')){const at=c.peek()?.start,attrs=this.attributes(),pattern=this.pattern(),guard=c.eat('if')?this.expression(0,false):null;c.expect('=>');const body=this.expression();arms.push(this.node('Arm',at,{attributes:attrs,pattern,guard,body}));if(!c.eat(',')&&!c.is('}')&&!['Block','If','Match'].includes(body.kind))fail('complete original match arm separator required');}c.expect('}');result=this.node('Match',start,{subject,arms});}
  else if(c.is('return')||c.is('break')||c.is('continue')){const operation=c.take().text,label=operation!=='return'&&c.peek()?.type==='char'&&c.peek().text.startsWith("'")?this.lifetime(true).fields.original:null,value=operation!=='continue'&&![null,';',',','}'].includes(c.peek()?.text??null)?this.expression():null;result=this.node('Jump',start,{operation,label,value});}
  else if(c.eat('loop'))result=this.node('Loop',start,{body:this.block()});
  else if(c.eat('while')){const condition=this.expression(0,false),body=this.block();result=this.node('While',start,{condition,body});}
  else if(c.eat('for')){const pattern=this.pattern(false);c.expect('in');const iterator=this.expression(0,false),body=this.block();result=this.node('For',start,{pattern,iterator,body});}
  else if(c.is('|')||c.is('||')||c.is('move')){const moved=!!c.eat('move'),parameters=[];if(!c.eat('||')){c.expect('|');while(!c.is('|')){const at=c.peek()?.start,pattern=this.pattern(false),type=c.eat(':')?this.type():null;parameters.push(this.node('Parameter',at,{pattern,type}));if(!c.eat(','))break;}c.expect('|');}const resultType=c.eat('->')?this.type():null,body=this.expression();result=this.node('Closure',start,{moved,parameters,resultType,body});}
  else if(c.is('&')||c.is('*')||c.is('!')||c.is('-')){const operation=c.take().text,mutable=operation==='&'&&!!c.eat('mut');result=this.node('Unary',start,{operation,mutable,value:this.expression(13)});}
  else if(c.eat('unsafe'))result=this.node('Unary',start,{operation:'unsafe',value:this.block()});
  else if(c.eat('(')){const values=[];let comma=false;while(!c.is(')')){values.push(this.expression());if(!c.eat(','))break;comma=true;}c.expect(')');result=this.node('Tuple',start,{values,comma});}
  else if(c.eat('[')){const values=[];let count=null;if(!c.is(']')){values.push(this.expression());if(c.eat(';'))count=this.expression();else while(c.eat(',')&&!c.is(']'))values.push(this.expression());}c.expect(']');result=this.node(count?'RepeatArray':'Array',start,{values,count});}
  else if(c.is('..')||c.is('..=')){const operation=c.take().text,right=operation==='..'&&[']',')',',',';','}'].includes(c.peek()?.text)?null:this.expression(3);result=this.node('Binary',start,{operation,left:null,right});}
  else if(['number','string'].includes(c.peek()?.type)||c.is('true')||c.is('false'))result=this.node('Literal',start,{original:c.take().text});
  else{result=this.path();if(c.is('!')){result=this.opaque(result,'Expr');const next=c.peek()?.text,brace=result.fields.tree.delimiter==='{';if(statementStart&&(brace&&!['.','?'].includes(next)||next===';'||next===undefined))result.fields.position='Stmts';}else if(c.is('{')&&structAllowed){c.take();const fields=[];while(!c.is('}')){const at=c.peek()?.start,attrs=this.attributes();if(c.eat('..')){fields.push(this.node('StructField',at,{attributes:attrs,rest:this.expression()}));break;}const name=this.name(),value=c.eat(':')?this.expression():null;fields.push(this.node('StructField',at,{attributes:attrs,name,value}));if(!c.eat(','))break;}c.expect('}');result=this.node('Struct',start,{path:result,fields});}}
  if(attributes.length)result=this.node('Unary',start,{operation:'source-attributes',attributes,value:result});return result;
 }
}
if(nativeReady){intrinsicGuard();parserMethods=methods(NamespaceParser.prototype);cursorMethods=methods(NamespaceCursor.prototype);Object.freeze(NamespaceParser.prototype);Object.freeze(NamespaceCursor.prototype);Object.freeze(NamespaceParser);Object.freeze(NamespaceCursor);parserMethods=methods(NamespaceParser.prototype);cursorMethods=methods(NamespaceCursor.prototype);}
function positive(parser,root){let count=0;const active=new Set();function visit(value,depth=0){if(++count>ORIGINAL_NAMESPACE_PARSER_LIMITS.nodes*16||depth>ORIGINAL_NAMESPACE_PARSER_LIMITS.depth*4)fail('complete recursive AST validation bound');if(value===null||['string','number','boolean'].includes(typeof value))return;if(typeof value!=='object'||types.isProxy(value)||active.has(value))fail('opaque or cyclic syntax field');active.add(value);
 if(nodes.has(value)){if(nodes.get(value)!==parser||!nodeKinds.has(value.kind)||value.span.start<parser.raw[0].start||value.span.end>parser.raw.at(-1).end||value.span.end<value.span.start)fail('foreign positive AST node/span');visit(value.fields,depth+1);}
 else if(trees.has(value)){if(trees.get(value)!==parser||parser.source.slice(value.span.start,value.span.end)!==value.original)fail('foreign original TT');for(const token of value.tokens)if(parser.source.slice(token.start,token.end)!==token.text)fail('changed original TT token');}
 else if(Array.isArray(value)){for(let at=0;at<value.length;at++){if(!Object.hasOwn(value,String(at)))fail('AST array hole');visit(value[at],depth+1);}}
 else {for(const key of Reflect.ownKeys(value)){const field=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!field||!Object.hasOwn(field,'value'))fail('nondata AST field');visit(field.value,depth+1);}}
 active.delete(value);
 }visit(root);return count;}
function moduleItem(options,keys){
 intrinsicGuard();
 if(!options||typeof options!=='object'||types.isProxy(options)||Reflect.ownKeys(options).length!==keys.length||!keys.every(key=>Object.hasOwn(options,key)))fail('only exact original module/item/member options required');
 const module=ownData(options,'module'),item=ownData(options,'item');if(!module||types.isProxy(module))fail('non-proxy original module required');
 const source=ownData(module,'source'),file=ownData(module,'file'),sourceView=ownData(module,'sourceView'),path=copyMetadata(ownData(module,'path')),compilationProfile=copyMetadata(ownData(module,'compilationProfile'));
 if(typeof source!=='string'||Buffer.byteLength(source)>ORIGINAL_NAMESPACE_PARSER_LIMITS.sourceBytes||typeof file!=='string'||!isSourceModuleView(sourceView)||!Array.isArray(path)||path.some(name=>typeof name!=='string'))fail('bounded private original source view required');
 const carrier={source,file,path,sourceView,compilationProfile},items=originalSourceModuleItems(carrier);intrinsicGuard();if(!items.includes(item))fail('exact original source-view item identity required');return {module,item,carrier,head:originalDeclarationHeader(item,path)};
}
function memberRows(input){
 const {item,head,carrier}=input;if(!['trait','impl'].includes(head?.kind))fail('original trait/impl member owner required');
 const tokens=normalize(item.tokens),keyword=tokens.findIndex(token=>token.start===head.keywordSpan.start);let at=keyword+1,angles=0,open=null,last=tokens.at(-1);
 for(;at<tokens.length;at++){
  const token=tokens[at];if(token.text==='<')angles++;else if(token.text==='>'){if(--angles<0)fail('member owner generic boundary');}
  else if(Object.hasOwn(pairs,token.text)){
   const stack=[pairs[token.text]],begin=at;
   for(at++;at<tokens.length&&stack.length;at++){const part=tokens[at];if(Object.hasOwn(pairs,part.text)){if(stack.length>=ORIGINAL_NAMESPACE_PARSER_LIMITS.depth)fail('owner delimiter depth bound');stack.push(pairs[part.text]);}else if([')',']','}'].includes(part.text)&&stack.pop()!==part.text)fail('member owner delimiter boundary');}
   if(stack.length)fail('complete member owner group required');at--;
   if(token.text==='{'&&angles===0&&tokens[begin-1]?.text!=='!'){if(at!==tokens.length-1)fail('member owner has trailing tokens');open=token;break;}
  }
 }
 if(!open||angles||last?.text!=='}')fail('complete original member owner body required');const members=originalImplMemberItems(carrier.source,{start:open.end,end:last.start}).filter(member=>!member.comment);if(members.length>ORIGINAL_NAMESPACE_PARSER_LIMITS.members)fail('complete original member bound');return members;
}
export function originalNamespaceFunctionMembers(options){const input=moduleItem(options,['module','item']);return freeze(memberRows(input).map((member,index)=>({memberIndex:index,kind:member.term,name:member.name,span:{start:member.start,end:member.end}})));}
function sourceInput(options){
 const input=moduleItem(options,['module','item','memberIndex']),memberIndex=ownData(options,'memberIndex');let selected=input.item;
 if(memberIndex!==null){if(!Number.isSafeInteger(memberIndex)||memberIndex<0)fail('original member index required');const members=memberRows(input);if(memberIndex>=members.length)fail('complete original member bound');selected=members[memberIndex];}
 if(originalDeclarationHeader(selected,input.carrier.path)?.kind!=='fn'||selected.term!=='fn')fail('root/item-position producer is not an original function');
 const raw=freeze(rustTokens(input.carrier.source).filter(token=>token.start>=selected.start&&token.end<=selected.end).map(token=>({...token})));if(!raw.length||raw.length>ORIGINAL_NAMESPACE_PARSER_LIMITS.tokens)fail('complete original function token bound');return {...input,memberIndex,selected,raw};
}

function fresh(state,options){const now=sourceInput(options),prior=state.input;intrinsicGuard();if(now.item!==prior.item||now.memberIndex!==prior.memberIndex||now.carrier.sourceView!==prior.carrier.sourceView||now.carrier.source!==prior.carrier.source||now.carrier.file!==prior.carrier.file||!sameSnapshot(now.carrier.path,prior.carrier.path)||!sameSnapshot(now.carrier.compilationProfile,prior.carrier.compilationProfile)||now.selected.start!==prior.selected.start||now.selected.end!==prior.selected.end)fail('original function/module/profile association changed');identity(state.parser);positive(state.parser,state.ast);requireOriginalNamespaceParserSourcePlan(state.sourcePlan);return state;}
export function captureOriginalNamespaceFunction(options){
 const input=sourceInput(options);intrinsicGuard();const parser=new NamespaceParser(input.carrier.source,input.raw);identity(parser);const ast=parser.function(parser.attributes(),input.memberIndex===null?'free':input.head.kind);if(parser.cursor.peek()!==null)fail('full original function EOF required');identity(parser);const visited=positive(parser,ast);freeze(ast);const sourcePlan=requireOriginalNamespaceParserSourcePlan(originalNamespaceParserSourcePlan());
 const token=Object.freeze({schema:'private-original-namespace-function-v1'}),facts=freeze({schema:'original-namespace-function-v1',source:{file:input.carrier.file,module:input.carrier.path,sourceSha256:hash(input.carrier.source),sourceViewDigest:input.carrier.sourceView.digest,compilationProfile:input.carrier.compilationProfile,itemSpan:{start:input.item.start,end:input.item.end},memberIndex:input.memberIndex,memberSpan:{start:input.selected.start,end:input.selected.end},original:input.carrier.source.slice(input.selected.start,input.selected.end)},ast,opaqueInvocations:parser.invocations,originalDocumentation:input.raw.filter(token=>token.type==='comment').map(token=>({...token})),sourcePlan,visited,completeOriginalFunctionParsed:true,callerOwnerResolved:false,callerScopeComplete:false,attributeTransformationsResolved:false,globalBangComplete:false,typeAuthority:false,runtimeAuthority:false,namespaceAuthority:false});
 intrinsicGuard();identity(parser);positive(parser,ast);frames.set(token,{input,parser,ast,sourcePlan,facts});return token;
}
export function originalNamespaceFunctionFacts(token,options){intrinsicGuard();const state=frames.get(token);if(!state)fail('copied or foreign function frame');return fresh(state,options).facts;}
export function originalNamespaceFunctionInvocationPosition(token,options,index){
 intrinsicGuard();const state=frames.get(token);if(!state)fail('copied or foreign function frame');fresh(state,options);if(!Number.isSafeInteger(index)||index<0||index>=state.parser.invocations.length)fail('actual private opaque invocation index required');const node=state.parser.invocations[index];if(nodes.get(node)!==state.parser||!['Expr','Ty','Stmts'].includes(node.fields.position))fail('unproved private expansion position');
 const proof=Object.freeze({schema:'private-original-namespace-position-v1'}),facts=freeze({schema:'original-namespace-position-v1',source:state.facts.source,invocation:node,position:node.fields.position,ordinaryGeneratedImportsAndProcStubsRemainBlockLocal:true,enclosingAttributeBindingsUnchanged:false,unresolvedGlobalMacroExportKindsRetained:true,outerAttributeTransformationsResolved:false,globalBangComplete:false,globalBangExportsRemainPending:true,macroOwnerResolved:false,typeAuthority:false,runtimeAuthority:false,sourcePlan:state.sourcePlan});confinements.set(proof,{token,state,index,node,facts});return proof;
}
export function originalNamespacePositionFacts(proof,token,options){intrinsicGuard();const record=confinements.get(proof);if(!record||record.token!==token)fail('copied or foreign confinement proof');fresh(record.state,options);if(record.state.parser.invocations[record.index]!==record.node)fail('private original invocation changed');return record.facts;}


// A source-fragment lane over the exact whole original invocation, never a
// rendered expansion or a caller-supplied AST/parser callback.
export function captureOriginalNamespaceInvocationInput(position,token,options){
 const positionFacts=originalNamespacePositionFacts(position,token,options),state=frames.get(token),node=positionFacts.invocation;
 const original=state.input.carrier.source.slice(node.span.start,node.span.end),invocation=originalMacroInvocation(original);intrinsicGuard();
 if(invocation.path.length!==node.fields.path.fields.segments.length||invocation.path.some((part,index)=>part!==node.fields.path.fields.segments[index]))fail('original invocation path changed');
 const proof=Object.freeze({schema:'private-original-namespace-invocation-input-v1'}),facts=freeze({schema:'original-namespace-invocation-input-v1',source:state.facts.source,invocationSpan:node.span,original,trees:invocation.trees,originalTree:node.fields.tree,callerMacroOwnerResolved:false,namespaceAuthority:false,runtimeAuthority:false});
 invocationInputs.set(proof,{position,token,node,invocation,facts});return proof;
}
function currentInvocationInput(input,position,token,options){
 intrinsicGuard();const state=invocationInputs.get(input);if(!state||state.position!==position||state.token!==token)fail('copied or foreign original invocation input');
 const actual=originalNamespacePositionFacts(position,token,options);if(actual.invocation!==state.node||frames.get(token).input.carrier.source.slice(state.node.span.start,state.node.span.end)!==state.facts.original)fail('original invocation/frame association changed');return state;
}
export function originalNamespaceInvocationInputFacts(input,position,token,options){return currentInvocationInput(input,position,token,options).facts;}
function captureTrees(value){
 if(!value||types.isProxy(value)||!Array.isArray(value)||Object.getPrototypeOf(value)!==Array.prototype)fail('ordinary original capture tree sequence required');
 const fields=Object.getOwnPropertyDescriptors(value),length=fields.length;if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<1||length.value>32000||Reflect.ownKeys(fields).length!==length.value+1)fail('bounded dense original capture trees required');
 const result=[];for(let at=0;at<length.value;at++){if(!Object.hasOwn(fields,String(at))||!Object.hasOwn(fields[at],'value'))fail('capture tree accessor or hole');result.push(fields[at].value);}return result;
}
export function captureOriginalNamespaceInvocationExpression(input,position,token,options,providedTrees){
 intrinsicGuard();const selected=captureTrees(providedTrees),context=currentInvocationInput(input,position,token,options),trees=context.invocation.trees,matches=[];
 for(let at=0;at+selected.length<=trees.length;at++)if(selected.every((tree,index)=>tree===trees[at+index]))matches.push(at);
 if(matches.length!==1)fail('capture is not one exact contiguous original invocation sequence');
 const source=frames.get(token).input.carrier.source,offset=context.node.span.start,start=offset+selected[0].span.start,end=offset+selected.at(-1).span.end,raw=frames.get(token).input.raw.filter(part=>part.start>=start&&part.end<=end);
 if(!raw.length||raw.length>ORIGINAL_NAMESPACE_PARSER_LIMITS.tokens||raw[0].start!==start||raw.at(-1).end!==end)fail('complete original expression token boundaries/bound');
 intrinsicGuard();const parser=new NamespaceParser(source,freeze(raw));identity(parser);const ast=parser.expression();if(parser.cursor.peek()!==null)fail('full original capture expression EOF required');identity(parser);positive(parser,ast);freeze(ast);
 const proof=Object.freeze({schema:'private-original-namespace-expression-capture-v1'}),facts=freeze({schema:'original-namespace-expression-capture-v1',source:frames.get(token).facts.source,span:{start,end},original:source.slice(start,end),trees:selected,originalTokens:raw,ast,documentation:raw.filter(part=>part.type==='comment'&&(part.text.startsWith('///')||part.text.startsWith('//!')||part.text.startsWith('/**')||part.text.startsWith('/*!'))),opaqueInvocations:parser.invocations,fullOriginalExpressionParsed:true,typeAuthority:false,runtimeAuthority:false,namespaceAuthority:false});
 currentInvocationInput(input,position,token,options);identity(parser);positive(parser,ast);expressionCaptures.set(proof,{input,position,token,parser,ast,facts});return proof;
}
export function originalNamespaceInvocationExpressionFacts(proof,input,position,token,options){
 intrinsicGuard();const record=expressionCaptures.get(proof);if(!record||record.input!==input||record.position!==position||record.token!==token)fail('copied or foreign original expression capture');
 currentInvocationInput(input,position,token,options);identity(record.parser);positive(record.parser,record.ast);return record.facts;
}

// One genuine complete function frame, fresh full checks before and after.
// Returned facts remain DATA; every receipt keeps the old private association.
export function originalNamespaceFunctionInvocationPositions(token,options){
 intrinsicGuard();const state=frames.get(token);if(!state)fail('copied or foreign function frame');fresh(state,options);const rows=[];for(let index=0;index<state.parser.invocations.length;index++){intrinsicGuard();const node=state.parser.invocations[index];if(nodes.get(node)!==state.parser||!['Expr','Ty','Stmts'].includes(node.fields.position))fail('unproved private expansion position');
 const proof=Object.freeze({schema:'private-original-namespace-position-v1'}),facts=freeze({schema:'original-namespace-position-v1',source:state.facts.source,invocation:node,position:node.fields.position,ordinaryGeneratedImportsAndProcStubsRemainBlockLocal:true,enclosingAttributeBindingsUnchanged:false,unresolvedGlobalMacroExportKindsRetained:true,outerAttributeTransformationsResolved:false,globalBangComplete:false,globalBangExportsRemainPending:true,macroOwnerResolved:false,typeAuthority:false,runtimeAuthority:false,sourcePlan:state.sourcePlan});confinements.set(proof,{token,state,index,node,facts});rows.push({index,proof,facts});}fresh(state,options);intrinsicGuard();return freeze(rows);
}

// Distinct private source receipts; never accepted as original function frames.
const attributeExpressionFrames=new WeakMap();
function attributeExpressionInput(options){
 const input=moduleItem(options,['module','item','attributeSpan','memberIndex']),memberIndex=ownData(options,'memberIndex');let selected=input.item;if(memberIndex!==null){if(!Number.isSafeInteger(memberIndex)||memberIndex<0)fail('original attribute member index required');const members=memberRows(input);if(memberIndex>=members.length)fail('complete original attribute member bound');selected=members[memberIndex];}const span=copyMetadata(ownData(options,'attributeSpan'));if(!span||typeof span!=='object'||Array.isArray(span)||Reflect.ownKeys(span).length!==2||!Object.hasOwn(span,'start')||!Object.hasOwn(span,'end'))fail('exact own original attribute span required');const start=ownData(span,'start'),end=ownData(span,'end');if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<selected.start||end<=start||end>selected.end)fail('original attribute span bound');
 const itemRaw=freeze(rustTokens(input.carrier.source).filter(token=>token.start>=selected.start&&token.end<=selected.end).map(token=>({...token})));if(!itemRaw.length||itemRaw.length>ORIGINAL_NAMESPACE_PARSER_LIMITS.tokens)fail('complete original attribute owner token bound');const headerParser=new NamespaceParser(input.carrier.source,itemRaw);identity(headerParser);const leadingAttributes=headerParser.attributes();identity(headerParser);const headerVisited=positive(headerParser,leadingAttributes);freeze(leadingAttributes);const found=leadingAttributes.filter(node=>node.span.start===start&&node.span.end===end&&!node.fields.inner);if(found.length!==1)fail('actual complete leading outer attribute required');
 const tokens=itemRaw.filter(token=>token.type!=='comment'&&token.start>=start&&token.end<=end);if(tokens.length<6||tokens[0].text!=='#'||tokens[1].text!=='['||!isName(tokens[2])||!isPlainSourceIdentifier(tokens[2].text)||tokens[3].text!=='='||tokens.at(-1).text!==']')fail('ordinary single-segment equality attribute required');const valueSpan={start:tokens[3].end,end:tokens.at(-1).start},raw=freeze(itemRaw.filter(token=>token.start>=valueSpan.start&&token.end<=valueSpan.end).map(token=>({...token})));if(!raw.length||!raw.some(token=>token.type!=='comment')||raw.length>ORIGINAL_NAMESPACE_PARSER_LIMITS.tokens)fail('complete original equality expression required');return {...input,selected,memberIndex,attributeSpan:{start,end},attributeName:tokens[2].text,valueSpan,raw,headerParser,leadingAttributes,headerVisited};
}

export function captureOriginalNamespaceAttributeExpression(options){
 const input=attributeExpressionInput(options);intrinsicGuard();const concrete=transportConcreteSyntaxSource(input.carrier.source,{language:'Rust'});if(transportConcreteSyntaxMeta(concrete.meta).source!==input.carrier.source)fail('complete original attribute source CST differs');const parser=new NamespaceParser(input.carrier.source,input.raw);identity(parser);const ast=parser.expression();if(parser.cursor.peek()!==null)fail('full original attribute expression EOF required');identity(parser);const expressionVisited=positive(parser,ast),visited=expressionVisited+input.headerVisited;if(visited>ORIGINAL_NAMESPACE_PARSER_LIMITS.nodes*16||parser.count+input.headerParser.count>ORIGINAL_NAMESPACE_PARSER_LIMITS.nodes||parser.treeCells+input.headerParser.treeCells>ORIGINAL_NAMESPACE_PARSER_LIMITS.tokens||parser.treeBytes+input.headerParser.treeBytes>ORIGINAL_NAMESPACE_PARSER_LIMITS.sourceBytes)fail('combined original attribute expression bounds');freeze(ast);const sourcePlan=requireOriginalNamespaceParserSourcePlan(originalNamespaceParserSourcePlan());
 const token=Object.freeze({schema:'private-original-namespace-attribute-expression-v1'}),facts=freeze({schema:'original-namespace-attribute-expression-v1',source:{file:input.carrier.file,module:input.carrier.path,sourceSha256:hash(input.carrier.source),sourceViewDigest:input.carrier.sourceView.digest,compilationProfile:input.carrier.compilationProfile,itemSpan:{start:input.item.start,end:input.item.end},memberIndex:input.memberIndex,selectedSpan:{start:input.selected.start,end:input.selected.end},attributeName:input.attributeName,attributeSpan:{...input.attributeSpan},valueSpan:{...input.valueSpan},originalItem:input.carrier.source.slice(input.item.start,input.item.end),originalAttribute:input.carrier.source.slice(input.attributeSpan.start,input.attributeSpan.end),originalValue:input.carrier.source.slice(input.valueSpan.start,input.valueSpan.end)},concreteSyntax:concrete.meta,ast,opaqueInvocations:parser.invocations,originalDocumentation:input.raw.filter(token=>token.type==='comment').map(token=>({...token})),sourcePlan,visited,expressionVisited,headerVisited:input.headerVisited,completeOriginalAttributeExpressionParsed:true,callerOwnerResolved:false,callerScopeComplete:false,attributeTransformationsResolved:false,globalBangComplete:false,typeAuthority:false,runtimeAuthority:false,namespaceAuthority:false,sourceAuthority:false,attributeValueSemanticsQualified:false,attributeMacroOwnerResolved:false,globalExportsClosed:false});
 intrinsicGuard();identity(parser);positive(parser,ast);attributeExpressionFrames.set(token,{input,parser,ast,sourcePlan,facts});return token;
}
export function originalNamespaceAttributeExpressionFacts(token,options){
 intrinsicGuard();const state=attributeExpressionFrames.get(token);if(!state)fail('copied or foreign attribute expression frame');const now=attributeExpressionInput(options),prior=state.input;if(now.item!==prior.item||now.memberIndex!==prior.memberIndex||now.selected.start!==prior.selected.start||now.selected.end!==prior.selected.end||now.carrier.sourceView!==prior.carrier.sourceView||now.carrier.source!==prior.carrier.source||now.carrier.file!==prior.carrier.file||!sameSnapshot(now.carrier.path,prior.carrier.path)||!sameSnapshot(now.carrier.compilationProfile,prior.carrier.compilationProfile)||!sameSnapshot(now.attributeSpan,prior.attributeSpan)||!sameSnapshot(now.valueSpan,prior.valueSpan)||now.attributeName!==prior.attributeName)fail('original attribute/module/profile association changed');identity(state.parser);positive(state.parser,state.ast);identity(prior.headerParser);positive(prior.headerParser,prior.leadingAttributes);requireOriginalNamespaceParserSourcePlan(state.sourcePlan);if(transportConcreteSyntaxMeta(state.facts.concreteSyntax).source!==prior.carrier.source)fail('complete original attribute source CST changed');return state.facts;
}
export function originalNamespaceAttributeExpressionSourceGuard(){intrinsicGuard();requireOriginalNamespaceParserSourcePlan(originalNamespaceParserSourcePlan());return {sourceAuthority:false,namespaceAuthority:false,runtimeAuthority:false};}
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
