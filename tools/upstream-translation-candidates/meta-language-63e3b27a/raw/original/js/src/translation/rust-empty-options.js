// Actual parsed owner facts establish this independently selected interpretation.
import {readRuntimeProjectData} from '../project-data-loader.js';
import {unsupported,typeError} from './diagnostics.js';
import {acceptRustEmptyOptionResultOwner,acceptRustEmptyOptionConstructorOwner,acceptRustEmptyOptionElement,acceptRustEmptyOptionContext,acceptRustEmptyOptionFunction,acceptRustEmptyOptionExpression} from './rust-empty-option-rules.js';
export const RUST_EMPTY_OPTION_POLICY=readRuntimeProjectData(new URL('./data/rust-empty-options.lino',import.meta.url));
const policy=RUST_EMPTY_OPTION_POLICY;
const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
const fail=detail=>{throw typeError('Rust empty option proof: '+detail);};
const sourceFail=(detail,span)=>{throw unsupported('Rust empty option source',detail,span);};
const range=(start,end)=>({start:start.start,end:end.end});
function exact(value,fields){if(!value||typeof value!=='object'||Array.isArray(value)||!same(Object.keys(value).sort(),[...fields].sort())||Object.values(value).some(value=>value===undefined))fail('unrecognized or missing owned fields');}
function validSpan(value){exact(value,['start','end']);if(!Number.isSafeInteger(value.start)||!Number.isSafeInteger(value.end)||value.start<0||value.end<=value.start)fail('an actual source span is malformed');}
function inside(inner,outer){return inner.start>=outer.start&&inner.end<=outer.end;}
function shadowed(parser,path,kind){
 const typeKinds=policy.typeOwnerKinds,resolved=parser.resolve(path,parser.modulePath);
 if(kind==='constructor'&&path.length===1)return parser.origins.scope.has(path[0])||Boolean(parser.origins.lookup(path,parser.modulePath));
 return Boolean(parser.origins.lookup(path,parser.modulePath,typeKinds)||parser.origins.lookup(resolved,parser.modulePath,typeKinds)||path.length>1&&parser.origins.lookup([path[0]],parser.modulePath,typeKinds));
}
function owner(parser,path,kind,span){
 const accept=kind==='result'?acceptRustEmptyOptionResultOwner:acceptRustEmptyOptionConstructorOwner;
 const resolved=parser.resolve(path,parser.modulePath);
 if(!same(path,resolved)||!accept(path.join('::'),!parser.origins.collecting&&shadowed(parser,path,kind)))sourceFail('the actual standard Option or None path and namespace must be unshadowed and unaliased',span);
 return {sourcePath:[...path],resolvedPath:[...resolved],canonicalPath:[...(kind==='result'?policy.canonicalResult:policy.canonicalConstructor)],arguments:[]};
}
function argument(parser){
 const c=parser.cursor,open=c.expect('<','empty option type argument'),token=c.identifier('empty option type argument');
 const actual=parser.resolve([token.value],parser.modulePath);
 if(!acceptRustEmptyOptionElement(token.value==='f64'?'float':'',actual.join('::'),!parser.origins.collecting&&shadowed(parser,[token.value],'result')))sourceFail('the one explicit element argument needs the direct unshadowed primitive f64 owner',range(open,token));
 c.expect('>','empty option type argument');
 return {type:structuredClone(policy.elementType),sourcePath:[token.value],resolvedPath:[...actual],canonicalPath:[...policy.elementPath],arguments:[],wrappers:[],lifetimes:[],span:range(token,token)};
}
export function readRustEmptyOptionResult(parser,path,start){
 if(!parser.emptyOptionSourceModel||!acceptRustEmptyOptionResultOwner(path.join('::'),false))return null;
 const c=parser.cursor,actual=owner(parser,path,'result',range(start,c.tokens[c.index-1]));
 actual.arguments=[argument(parser)];
 const position={type:structuredClone(policy.valueType),owner:actual,wrappers:[],lifetimes:[],span:range(start,c.tokens[c.index-1])};
 const type=parser.origins.typed(structuredClone(policy.valueType),parser.modulePath);
 parser.origins.type.emptyOptionResult=position;
 return type;
}
export function readRustEmptyOptionBody(parser,path){
 const c=parser.cursor;c.expect('{','empty option function');
 const start=c.peek(),segments=parser.pathSegments('empty option constructor');
 const actual=owner(parser,segments,'constructor',range(start,c.tokens[c.index-1]));
 c.expect('::','explicit empty option constructor');actual.arguments=[argument(parser)];
 const span=range(start,c.tokens[c.index-1]);c.expect('}','empty option function');
 const node={k:'none',absence:policy.valueType.absence,span};
 return {body:parser.origins.mark(node,parser.origins.typeOrigin(structuredClone(policy.valueType),path)),construction:{owner:actual,span,path:[]}};
}
export function createRustEmptyOptionProof(parser,name,result,construction){
 return {model:parser.emptyOptionSourceModel,language:policy.language,sourceName:name,
 namespace:{declaredTypeOwners:[],externalOptionRoots:[...policy.externalOptionRoots],imports:[],declarationNames:[]},
 parameters:[],result:structuredClone(result),construction:structuredClone(construction)};
}
export function finishRustEmptyOptionSource(parser,root){
 if(!parser.emptyOptionSourceModel)return;
 if(!acceptRustEmptyOptionContext('Rust',root.items.some(item=>item.k!=='fn')||!root.items.length||root.main?.effects.length>0))sourceFail('the model requires complete flat zero-argument empty leaf functions and an empty main');
 const names=root.items.map(item=>item.name);
 for(const item of root.items)item.sourceEmptyOption.namespace.declarationNames=[...names];
}
export function checkRustEmptyOptionProof(program){
 const entries=[...program.declarations.values()];
 if(!entries.some(entry=>Object.hasOwn(entry,'sourceEmptyOption')))return;
 const forbidden=!program.main||!Array.isArray(program.main.effects)||['imports','externals'].some(field=>Object.hasOwn(program,field)&&(!Array.isArray(program[field])||program[field].length>0))||program.main?.effects.length>0
  ||['outputThreaded','abortsThreaded','referenceSemantics','utf16Strings'].some(field=>Object.hasOwn(program,field)&&program[field]!==false)
  ||program.items.some(item=>item.k!=='fn')||!entries.length||entries.length!==program.items.length;
 if(!acceptRustEmptyOptionContext(program.sourceLanguage,forbidden))fail('the selected model requires a complete flat empty leaf program without imports or effects');
 if(Object.keys(program).some(field=>!policy.fields.program.includes(field))||Object.values(program).some(value=>value===undefined))fail('the empty program has unrepresented own fields');
 exact(program.main,policy.fields.main);validSpan(program.main.span);
 const names=program.items.map(item=>item.name);
 for(const entry of entries){
  if(Object.keys(entry).some(field=>!policy.fields.declaration.includes(field))||Object.values(entry).some(value=>value===undefined))fail('an empty function has unrepresented own fields');
  if(!acceptRustEmptyOptionFunction(entry.k,!Array.isArray(entry.params)||entry.params.length>0||!same(entry.modulePath,[])||entry.fullName!==entry.name||entry.recursive!==false||entry.decreasing!=null||Object.hasOwn(entry,'mutual')&&entry.mutual!==false||Object.hasOwn(entry,'generated')&&entry.generated!==false))fail('the actual declaration context contradicts its empty leaf ownership');
  const proof=entry.sourceEmptyOption;exact(proof,policy.fields.proof);
  if(proof.model!==policy.model||proof.language!==policy.language||proof.sourceName!==entry.name||!same(proof.parameters,[]))fail('the selected source name, interpretation or arity differs from its declaration');
  exact(proof.namespace,policy.fields.namespace);
  if(!same(proof.namespace.declaredTypeOwners,[])||!same(proof.namespace.externalOptionRoots,policy.externalOptionRoots)||!same(proof.namespace.imports,[])||!same(proof.namespace.declarationNames,names))fail('the namespace premise disagrees with the actual declarations');
  function checkOwner(value,kind){
   exact(value,policy.fields.owner);
   const accept=kind==='result'?acceptRustEmptyOptionResultOwner:acceptRustEmptyOptionConstructorOwner;
   if(!Array.isArray(value.sourcePath)||!Array.isArray(value.resolvedPath)||!same(value.sourcePath,value.resolvedPath)||!same(value.sourcePath,value.sourcePath.join('::').split('::'))||!accept(value.sourcePath.join('::'),kind==='constructor'&&value.sourcePath.length===1&&names.includes(value.sourcePath[0]))||!same(value.canonicalPath,kind==='result'?policy.canonicalResult:policy.canonicalConstructor)||!Array.isArray(value.arguments)||value.arguments.length!==1)fail('an actual standard owner path or its explicit type argument is invalid');
   const arg=value.arguments[0];exact(arg,policy.fields.argument);validSpan(arg.span);
   if(!same(arg.type,policy.elementType)||!same(arg.sourcePath,policy.elementPath)||!same(arg.resolvedPath,policy.elementPath)||!same(arg.canonicalPath,policy.elementPath)||!same(arg.arguments,[])||!same(arg.wrappers,[])||!same(arg.lifetimes,[]))fail('the explicit element argument differs from direct primitive f64');
  }
  exact(proof.result,policy.fields.position);validSpan(proof.result.span);checkOwner(proof.result.owner,'result');
  if(!same(proof.result.type,policy.valueType)||!same(entry.ret,policy.valueType)||!same(proof.result.wrappers,[])||!same(proof.result.lifetimes,[])||!inside(proof.result.owner.arguments[0].span,proof.result.span))fail('the source result differs from the exact optional value interpretation');
  exact(proof.construction,policy.fields.construction);validSpan(proof.construction.span);checkOwner(proof.construction.owner,'constructor');
  exact(entry.body,policy.fields.expression);validSpan(entry.body.span);validSpan(entry.span);
  if(!acceptRustEmptyOptionExpression(entry.body.k,entry.body.absence)||!same(entry.body.type,policy.valueType)||!same(proof.construction.path,[])||!same(proof.construction.span,entry.body.span)||!inside(proof.construction.owner.arguments[0].span,proof.construction.span)||!inside(proof.result.span,entry.span)||!inside(proof.construction.span,entry.span)||proof.result.span.end>proof.construction.span.start)fail('the actual empty constructor must own the complete checked body and its source site');
 }
}
