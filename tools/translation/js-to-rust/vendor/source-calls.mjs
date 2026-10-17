// Pure callable creation and use are joined to complete original lexical text.
// No caller-provided AST, capture map, type contract or callable graph is used.
import {createHash} from 'node:crypto';
import {types,isDeepStrictEqual} from 'node:util';
import {createRequire} from 'node:module';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {lex} from './lexer.mjs';
import {parseJavaScriptItem} from './frontends.mjs';
import {check,toLino,lowerSourceClosure,snakeFromCamel} from './ir.mjs';
import {createLexicalEnvironmentIssuer,issueSourceCallEnvironmentFrom,lexicalClosureName,readLexicalEnvironment} from './lexical-environments.mjs';
const root=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const require=createRequire(join(root,'packages/javascript/package.json'));
const issued=new WeakMap(),checking=new WeakSet(),issuers=new WeakMap();
const fail=message=>{throw Object.assign(new Error(message),{slug:'collection'});};
const hash=source=>createHash('sha256').update(Buffer.from(source,'utf16le')).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
function data(value,seen=new Set()) {
  if(value===null||['string','number','boolean'].includes(typeof value))return;
  if(!value||typeof value!=='object'||types.isProxy(value)||seen.has(value)||![Object.prototype,Array.prototype,null].includes(Object.getPrototypeOf(value)))fail('a foreign or cyclic source-call proof');
  seen.add(value);
  for(const key of Reflect.ownKeys(value)){const field=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||!Object.hasOwn(field,'value')||!field.enumerable&&!(Array.isArray(value)&&key==='length'))fail('a source-call proof accessor or hidden field');data(field.value,seen);}
  seen.delete(value);
}

export function createSourceCallIssuer(source,sourcePath=null) {
  if(typeof source!=='string'||sourcePath!==null&&typeof sourcePath!=='string')fail('invalid original source-call text');
  const ts=require('typescript'),file=ts.createSourceFile('source-calls.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length)fail('invalid original source-call syntax');
  const host={getSourceFile:name=>name==='source-calls.mjs'?file:undefined,fileExists:name=>name==='source-calls.mjs',readFile:()=>source,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=> '/',getDirectories:()=>[],directoryExists:()=>true,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
  let checkedGraph;
  const checker=()=>checkedGraph??=ts.createProgram(['source-calls.mjs'],{allowJs:true,noLib:true,noResolve:true},host).getTypeChecker();
  const handle=Object.freeze({});issuers.set(handle,{source,sourcePath,ts,file,checker});return handle;
}
export function issueSourceCallsFrom(issuer,start,end) {
  const state=issuers.get(issuer);if(!state)fail('a copied or foreign original caller issuer');
  const {source,sourcePath,ts,file,checker}=state;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>source.length)fail('invalid original source-call coordinates');
  const fn=node=>ts.isArrowFunction(node)||ts.isFunctionExpression(node)||ts.isFunctionDeclaration(node);
  let owner;const locate=node=>{if(fn(node)&&node.getStart(file)===start&&node.end===end)owner=node;ts.forEachChild(node,locate);};locate(file);
  if(!owner||owner.asteriskToken||owner.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.AsyncKeyword)||owner.parameters.some(param=>!ts.isIdentifier(param.name)||param.initializer||param.dotDotDotToken||param.type))fail('an effectful or unsupported original caller signature');
  const originalName=owner.name?.text??(ts.isVariableDeclaration(owner.parent)&&ts.isIdentifier(owner.parent.name)?owner.parent.name.text:null);
  if(!originalName)fail('an original caller without a lexical declaration name');
  const name=snakeFromCamel(originalName),children=[];
  const collect=node=>{if(node!==owner&&fn(node)){children.push(node);return;}ts.forEachChild(node,collect);};collect(owner);
  if(!children.length||children.length>16)fail('a source caller without bounded original callable creation');
  let lexical;const environments=new Map(),bindings=[],iterations=[];
  for(const child of children) {
    if(!ts.isArrowFunction(child))fail('function declarations, named functions and hoisted callable creation remain refused');
    const parent=child.parent;let binding=null,mode;
    if(ts.isVariableDeclaration(parent)&&parent.initializer===child&&ts.isIdentifier(parent.name)&&ts.isVariableDeclarationList(parent.parent)&&(parent.parent.flags&ts.NodeFlags.Const)!==0){
      binding=parent.name;mode='direct';
      const checked=checker(),symbol=checked.getSymbolAtLocation(binding),uses=[];
      const references=node=>{if(ts.isIdentifier(node)&&node!==binding&&checked.getSymbolAtLocation(node)===symbol)uses.push(node);ts.forEachChild(node,references);};references(file);
      if(!uses.length||uses.some(node=>node.getStart(file)<=parent.end||node.getStart(file)<start||node.end>end||!ts.isCallExpression(node.parent)||node.parent.expression!==node||node.parent.arguments.length!==child.parameters.length||node.parent.questionDotToken))fail('a callable alias, escape, early use, mutation or unproved call arity');
      bindings.push({name:binding.text,start:binding.getStart(file),end:binding.end,calls:uses.map(node=>({start:node.parent.getStart(file),end:node.parent.end}))});
    } else if(ts.isCallExpression(parent)&&parent.arguments.length===1&&parent.arguments[0]===child&&ts.isPropertyAccessExpression(parent.expression)&&parent.expression.name.text==='some'&&ts.isArrayLiteralExpression(parent.expression.expression)&&child.parameters.length===1) {
      const array=parent.expression.expression;
      if(array.elements.length>256||array.elements.some(node=>!(ts.isStringLiteralLike(node)&&!ts.isNoSubstitutionTemplateLiteral(node)||ts.isNumericLiteral(node)||[ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword].includes(node.kind))))fail('an owned iteration without dense closed primitive elements');
      mode='some';iterations.push({start:parent.getStart(file),end:parent.end,arrayStart:array.getStart(file),arrayEnd:array.end,standardArraySomeRequired:true,lookupStabilityProved:false});
    } else fail('a callable creation outside a const direct-call binding or owned literal some');
    lexical??=createLexicalEnvironmentIssuer(source,sourcePath);
    const environment=issueSourceCallEnvironmentFrom(lexical,child.getStart(file),child.end),proof=readLexicalEnvironment(environment).proof;
    if(proof.captures.some(capture=>capture.binding.ownerStart!==start||capture.binding.ownerEnd!==end))fail('a callable capture outside the actual enclosing caller parameters');
    environments.set(child.getStart(file),{environment,mode,end:child.end});
  }
  // Keep original coordinates and gaps, including restricted-production ASI.
  const tokens=lex(source,'JavaScript').filter(token=>token.start>=start&&token.end<=end),replaced=[];
  for(let index=0;index<tokens.length;index++){
    const token=tokens[index],entry=environments.get(token.start);
    if(entry){replaced.push({type:'source-callable',text:'source callable',start:token.start,end:entry.end,environment:entry.environment});while(tokens[index+1]?.start<entry.end)index++;}
    else replaced.push(token);
  }
  let wrapper=replaced;
  if(ts.isArrowFunction(owner)||ts.isFunctionExpression(owner))wrapper=[{type:'ident',text:'const'},{type:'ident',text:originalName},{type:'punct',text:'='},...replaced,{type:'punct',text:';'}];
  const exported=owner.parent===file&&owner.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword)||ts.isVariableDeclaration(owner.parent)&&owner.parent.parent.parent.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword);
  if(exported&&!wrapper.some(token=>token.text==='export'))wrapper=[{type:'ident',text:'export'},...wrapper];
  const proof=freeze({schema:'original-source-call-body-v1',sourcePath,sourceUtf16:source,sourceUtf16Sha256:hash(source),start,end,name,bindings,iterations,children:[...environments].map(([start,value])=>({start,end:value.end,mode:value.mode,environment:readLexicalEnvironment(value.environment).proof})),parentBodyCheckRequired:true,escapingCallableReferencesSupported:false,runtimeParity:false});
  const declaration=ts.isVariableDeclaration(owner.parent)?owner.parent.parent.parent:owner;
  const doc=source.slice(declaration.getFullStart(),declaration.getStart(file));
  const handle=Object.freeze({});issued.set(handle,{proof,tokens:wrapper,source,doc});return handle;
}
export function issueSourceCalls(source,start,end,sourcePath=null){return issueSourceCallsFrom(createSourceCallIssuer(source,sourcePath),start,end);}
export function issueTopLevelSourceCallsFrom(issuer,start,end) {
  const state=issuers.get(issuer);if(!state)fail('a copied or foreign original caller issuer');
  const {ts,file,source}=state;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>source.length)fail('invalid original enclosing item coordinates');
  const statement=file.statements.find(node=>node.getStart(file)===start&&node.end<=end);
  if(statement&&lex(source.slice(statement.end,end),'JavaScript').some(token=>token.type!=='comment'&&token.text!==';'))fail('an active original suffix outside the checked caller');
  let owner;
  if(statement&&ts.isFunctionDeclaration(statement))owner=statement;
  if(statement&&ts.isVariableStatement(statement)&&statement.declarationList.declarations.length===1){const declaration=statement.declarationList.declarations[0];if((statement.declarationList.flags&ts.NodeFlags.Const)!==0&&declaration.initializer&&(ts.isArrowFunction(declaration.initializer)||ts.isFunctionExpression(declaration.initializer)))owner=declaration.initializer;}
  if(!owner)fail('a refused enclosing item cannot be replaced by an admitted child');
  return issueSourceCallsFrom(issuer,owner.getStart(file),owner.end);
}
export function sourceCallItem(item){if(!item||typeof item!=='object'||types.isProxy(item))fail('a foreign source-call item');const descriptor=Object.getOwnPropertyDescriptor(item,'sourceCalls');if(descriptor){data(item);return true;}return false;}
export function readSourceCalls(handle){const value=issued.get(handle);if(!value)fail('a copied or foreign source-call issuer');return value.proof;}
export function reissueSourceCalls(proof){
  data(proof);
  if(!proof||typeof proof!=='object'||Array.isArray(proof))fail('a non-record original caller proof');
  const values={__proto__:null};
  for(const key of ['schema','sourcePath','sourceUtf16','sourceUtf16Sha256','start','end','name','bindings','iterations','children','parentBodyCheckRequired','escapingCallableReferencesSupported','runtimeParity']){
    const descriptor=Object.getOwnPropertyDescriptor(proof,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('a missing own original caller proof field');
    values[key]=descriptor.value;
  }
  if(values.schema!=='original-source-call-body-v1')fail('a foreign original caller proof schema');
  const handle=issueSourceCalls(values.sourceUtf16,values.start,values.end,values.sourcePath);
  if(!isDeepStrictEqual(readSourceCalls(handle),proof))fail('a changed original caller, binding, creation, call or source proof');return handle;
}
export function lowerSourceCalls(handle) {
  const value=issued.get(handle);if(!value)fail('a copied or foreign source-call issuer');
  const parsed=parseJavaScriptItem(value.tokens,value.doc,{source:value.source,sourceCalls:true});
  if(parsed.params.some(param=>param.type!=='value'))fail('a narrowed caller parameter without a proved source producer contract');
  const candidate={...parsed,lossless:true,...(value.proof.iterations.length?{conditionalCalls:true}:{})};checking.add(candidate);
  let checked;try{checked=check(candidate,new Map());}finally{checking.delete(candidate);}
  return {...checked,sourceCalls:value.proof,...(value.proof.iterations.length?{conditionalCalls:true}:{})};
}
export const isOriginalSourceCallCheck=item=>checking.has(item);
function suppliedFields(value,expected) {
  if(value===null||typeof value!=='object'){if(!isDeepStrictEqual(value,expected))fail('a changed checked source-call field');return;}
  if(!expected||typeof expected!=='object'||Array.isArray(value)!==Array.isArray(expected)||Array.isArray(value)&&value.length!==expected.length)fail('a changed checked source-call shape');
  for(const key of Object.keys(value)){if(!Object.hasOwn(expected,key))fail('an extra checked source-call field');suppliedFields(value[key],expected[key]);}
}
export function checkSourceCalls(item){data(item);const descriptor=Object.getOwnPropertyDescriptor(item,'sourceCalls');if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('a missing own source-call item proof');const expected=lowerSourceCalls(reissueSourceCalls(descriptor.value));if(toLino(expected)!==toLino(item))fail('a changed original source-call body, signature, qualification or target');suppliedFields(item,expected);return expected;}
export function sourceCallable(environment) {
  const closure=lowerSourceClosure(environment,lexicalClosureName(environment));
  return {kind:'source-create',environment:closure.environment,captures:closure.captures.map(capture=>({kind:'variable',name:capture.name}))};
}
