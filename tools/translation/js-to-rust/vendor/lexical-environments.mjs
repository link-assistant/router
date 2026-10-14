// Source-owned closure environments. Issuance accepts original text/spans only;
// callers cannot provide bindings, types, ASTs or capture values.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual,types} from 'node:util';
import {ownershipSyntax} from './module-syntax.mjs';
import {readCapturedPrimitives,reissueCapturedPrimitives} from './captured-primitives.mjs';
const issued=new WeakMap(),issuers=new WeakMap();
const fail=message=>{throw Object.assign(new Error(message),{slug:'collection'});};
const hash=source=>createHash('sha256').update(Buffer.from(source,'utf16le')).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const plain=value=>{
  if(value===null||['string','number','boolean'].includes(typeof value))return;
  if(!value||typeof value!=='object'||types.isProxy(value))fail('a non-data lexical environment');
  if(![Object.prototype,Array.prototype,null].includes(Object.getPrototypeOf(value)))fail('a foreign lexical environment prototype');
  for(const key of Reflect.ownKeys(value)){
    if(typeof key!=='string')fail('a symbolic lexical environment field');
    const descriptor=Object.getOwnPropertyDescriptor(value,key);
    if(!('value' in descriptor))fail('a lexical environment accessor');
    if(!descriptor.enumerable&&!(Array.isArray(value)&&key==='length'))fail('a hidden lexical environment field');
    plain(descriptor.value);
  }
};
// This opaque issuer owns one fresh tree/checker for a single discovery call.
// No AST, symbol, checker or caller capture map crosses this boundary.
export function createLexicalEnvironmentIssuer(source,sourcePath=null) {
  if(typeof source!=='string'||sourcePath!==null&&typeof sourcePath!=='string')fail('invalid original lexical source coordinates');
  const {ts}=ownershipSyntax(source);
  // Bind a fresh tree, never the public module-syntax cache's mutable tree.
  const file=ts.createSourceFile('closure-source.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length)fail('invalid original lexical source syntax');
  const host={getSourceFile:name=>name==='closure-source.mjs'?file:undefined,fileExists:name=>name==='closure-source.mjs',readFile:()=>source,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=> '/',getDirectories:()=>[],directoryExists:()=>true,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
  const checker=ts.createProgram(['closure-source.mjs'],{allowJs:true,noLib:true,noResolve:true},host).getTypeChecker();
  const fn=node=>ts.isArrowFunction(node)||ts.isFunctionExpression(node)||ts.isFunctionDeclaration(node),functions=new Map();
  const symbol=node=>ts.isShorthandPropertyAssignment(node.parent)?checker.getShorthandAssignmentValueSymbol(node.parent):checker.getSymbolAtLocation(node);
  const nonReference=node=>{const p=node.parent;return ts.isPropertyAccessExpression(p)&&p.name===node||ts.isPropertyAssignment(p)&&p.name===node||ts.isMethodDeclaration(p)&&p.name===node||ts.isBindingElement(p)&&p.propertyName===node;};
  const index=node=>{if(fn(node))functions.set(node.getStart(file)+':'+node.end,node);ts.forEachChild(node,index);};index(file);
  const writes=node=>{
    let member=node;
    while(ts.isParenthesizedExpression(member.parent)||ts.isShorthandPropertyAssignment(member.parent)||ts.isArrayLiteralExpression(member.parent)||ts.isObjectLiteralExpression(member.parent)||ts.isPropertyAssignment(member.parent)&&member.parent.initializer===member||ts.isSpreadElement(member.parent)||ts.isSpreadAssignment(member.parent))member=member.parent;
    const outer=member.parent;
    return ts.isBinaryExpression(outer)&&outer.left===member&&ts.isAssignmentOperator(outer.operatorToken.kind)||ts.isPrefixUnaryExpression(outer)&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(outer.operator)||ts.isPostfixUnaryExpression(outer)||ts.isForOfStatement(outer)&&outer.initializer===member||ts.isForInStatement(outer)&&outer.initializer===member;
  };
  const forbidden=new Set(['constructor','prototype','__proto__','defineProperty','defineProperties','getPrototypeOf','setPrototypeOf']);
  const key=node=>ts.isStringLiteralLike(node)?node.text:ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken&&key(node.left)!==null&&key(node.right)!==null?key(node.left)+key(node.right):null;
  let orderedEvents;
  const auditEvents=()=>{if(orderedEvents)return orderedEvents;const events=[];
    const audit=node=>{
    if(ts.isJSDoc(node))return;
    if(ts.isPropertyAccessExpression(node)&&forbidden.has(node.name.text)||ts.isElementAccessExpression(node)&&forbidden.has(key(node.argumentExpression))||ts.isIdentifier(node)&&['globalThis','global','window','Reflect'].includes(node.text)&&!nonReference(node))events.push({reason:'an unproved closure prototype or global intrinsic capability'});
    if(ts.isIdentifier(node)&&['Math','Number','Buffer','String','Array','RegExp','Object'].includes(node.text)&&!symbol(node)?.declarations?.length&&!nonReference(node)) {
      const member=node.parent,directConstructor=['Number','String','Array','RegExp'].includes(node.text)&&(ts.isCallExpression(member)||ts.isNewExpression(member))&&member.expression===node;
      if(!directConstructor&&!(ts.isPropertyAccessExpression(member)&&member.expression===node&&!writes(member)))events.push({reason:'a mutable or escaping closure intrinsic'});
    }
    if(ts.isWithStatement(node)||ts.isIdentifier(node)&&['eval','Function','arguments'].includes(node.text)&&!nonReference(node))events.push({reason:'an unproved dynamic or arguments environment'});
    if(ts.isIdentifier(node)){const bound=symbol(node);if(writes(node))events.push({symbol:bound,reason:'a reassigned captured parameter binding'});}
    ts.forEachChild(node,audit);
    };audit(file);return Object.freeze(events.map(Object.freeze));
  };
  const events=()=>orderedEvents??=auditEvents();
  const handle=Object.freeze({});issuers.set(handle,{source,sourcePath,sourceHash:hash(source),ts,file,checker,fn,symbol,nonReference,functions,auditEvents:events});return handle;
}
export function issueLexicalEnvironmentFrom(issuer,start,end) {
  const state=issuers.get(issuer);if(!state)fail('a copied or foreign lexical source issuer');
  const {source,sourcePath,ts,file,fn,symbol,nonReference,functions}=state;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>source.length)fail('invalid original lexical source coordinates');
  const target=functions.get(start+':'+end);
  if(!target||target.parent===file||ts.isVariableDeclaration(target.parent)&&target.parent.parent.parent.parent===file)fail('a closure without an exact nested original function span');
  const ancestors=[];for(let node=target.parent;node&&node!==file;node=node.parent)ancestors.push(node);
  const within=node=>node.pos>=target.pos&&node.end<=target.end;
  const captures=new Map();
  const inspect=node=>{
    if(ts.isJSDoc(node))return;
    if(node!==target&&fn(node)||ts.isGetAccessorDeclaration(node)||ts.isSetAccessorDeclaration(node)||[ts.SyntaxKind.ThisKeyword,ts.SyntaxKind.SuperKeyword,ts.SyntaxKind.MetaProperty,ts.SyntaxKind.PrivateIdentifier].includes(node.kind))fail('an unsupported nested or receiver closure capability');
    if(ts.isIdentifier(node)&&!nonReference(node)){
      if(node.text==='arguments')fail('a closure arguments capability');
      const bound=symbol(node),declarations=bound?.declarations??[];
      if(!declarations.length){if(node.text!=='undefined')fail('an unresolved closure global or intrinsic');}
      else if(!declarations.every(within)){
        if(declarations.length!==1||!ts.isParameter(declarations[0]))fail('a capture without a unique enclosing parameter binding');
        const declaration=declarations[0],owner=declaration.parent;
        if(!fn(owner)||!ancestors.includes(owner)||!(target===owner.body||ancestors.includes(owner.body))||!ts.isIdentifier(declaration.name)||declaration.initializer||declaration.dotDotDotToken||declaration.type)fail('an unproved enclosing parameter environment');
        if(owner.parameters.some(param=>!ts.isIdentifier(param.name)||param.initializer||param.dotDotDotToken||param.type)||owner.asteriskToken||owner.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.AsyncKeyword))fail('an effectful or destructured enclosing parameter list');
        let record=captures.get(bound);
        if(!record){record={name:node.text,type:'value',binding:{kind:'Parameter',start:declaration.getStart(file),end:declaration.end,ownerStart:owner.getStart(file),ownerEnd:owner.end},references:[]};captures.set(bound,record);}
        record.references.push({start:node.getStart(file),end:node.end});
      }
    }
    ts.forEachChild(node,inspect);
  };
  if(target.asteriskToken||target.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.AsyncKeyword)||target.parameters.some(param=>!ts.isIdentifier(param.name)||param.initializer||param.dotDotDotToken||param.type))fail('an effectful or unsupported closure parameter list');
  inspect(target);
  if(!captures.size)fail('a closure environment without captures');
  for(const event of state.auditEvents())if(!Object.hasOwn(event,'symbol')||captures.has(event.symbol))fail(event.reason);
  const scope=ancestors.filter(node=>fn(node)||ts.isBlock(node)||ts.isClassDeclaration(node)||ts.isClassExpression(node)||ts.isMethodDeclaration(node)||ts.isCatchClause(node)||ts.isForStatement(node)||ts.isForOfStatement(node)||ts.isForInStatement(node)).reverse().map(node=>({kind:ts.SyntaxKind[node.kind],name:node.name?.getText(file)??null,start:node.getStart(file),end:node.end}));
  const proof=freeze({schema:'original-lexical-parameter-environment-v1',sourcePath,sourceUtf16:source,sourceUtf16Sha256:state.sourceHash,start,end,sourceScope:scope,captures:[...captures.values()],parentCreationLowered:false});
  const parameters=[...captures.values()].map(c=>c.name).concat(target.parameters.map(param=>param.getText(file))).join(','),body=target.body.getText(file);
  const handle=Object.freeze({});issued.set(handle,Object.freeze({proof,wrapper:Object.freeze(name=>'const '+name+'=('+parameters+')=>'+body+';')}));return handle;
}
export function issueLexicalEnvironment(source,start,end,sourcePath=null) {
  if(typeof source!=='string'||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>source.length||sourcePath!==null&&typeof sourcePath!=='string')fail('invalid original lexical source coordinates');
  return issueLexicalEnvironmentFrom(createLexicalEnvironmentIssuer(source,sourcePath),start,end);
}
export function lexicalClosureName(handle) {
  const {proof}=readLexicalEnvironment(handle),sourceSha=proof.sourceUtf16Sha256,namespace=createHash('sha256').update(JSON.stringify([proof.sourcePath,sourceSha])).digest('hex').slice(0,16);
  return 'scoped_src'+namespace+'_at'+proof.start;
}
export function readLexicalEnvironment(handle) {
  const value=issued.get(handle);if(value)return value;
  return readCapturedPrimitives(handle);
}
export function reissueLexicalEnvironment(proof) {
  plain(proof);
  if(Object.getOwnPropertyDescriptor(proof,'schema')?.value==='original-lexical-primitive-collection-environment-v1')return reissueCapturedPrimitives(proof);
  const handle=issueLexicalEnvironment(proof.sourceUtf16,proof.start,proof.end,proof.sourcePath),value=readLexicalEnvironment(handle);
  if(!isDeepStrictEqual(value.proof,proof))fail('a changed lexical environment source, symbol, span or ancestor');return handle;
}
