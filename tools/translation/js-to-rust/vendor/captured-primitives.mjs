// Private original-source collection issuance. No caller AST, capture map,
// literal data, type assertion or public provenance flag is accepted here.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual,types} from 'node:util';
import {createRequire} from 'node:module';
import {dirname,resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {callbackProducerInputs} from './callback-inputs.mjs';

const issuers=new WeakMap(),issued=new WeakMap();
const sourceRoot=process.env.ROUTER_NATIVE_TS_SOURCE_ROOT??resolve(dirname(fileURLToPath(import.meta.url)),'../../../..');
const require=createRequire(join(sourceRoot,'packages/javascript/package.json'));
const fail=message=>{throw Object.assign(new Error(message),{slug:'collection'});};
const hash=source=>createHash('sha256').update(Buffer.from(source,'utf16le')).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const plain=value=>{
  if(value===null||['string','number','boolean'].includes(typeof value))return;
  if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,Array.prototype,null].includes(Object.getPrototypeOf(value)))fail('a foreign captured-collection proof');
  for(const key of Reflect.ownKeys(value)) {
    if(typeof key!=='string')fail('a symbolic captured-collection field');
    const field=Object.getOwnPropertyDescriptor(value,key);
    if(!('value'in field)||!field.enumerable&&!(Array.isArray(value)&&key==='length'))fail('an accessor or hidden captured-collection field');
    plain(field.value);
  }
};

export function createCapturedPrimitiveIssuer(source,sourcePath=null) {
  if(typeof source!=='string'||sourcePath!==null&&typeof sourcePath!=='string')fail('invalid original captured-collection source');
  // Do not read the public module-syntax cache's mutable file or ts property.
  const ts=require('typescript'),file=ts.createSourceFile('captured-source.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length)fail('invalid original captured-collection syntax');
  const host={getSourceFile:name=>name==='captured-source.mjs'?file:undefined,fileExists:name=>name==='captured-source.mjs',readFile:()=>source,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=> '/',getDirectories:()=>[],directoryExists:()=>true,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
  const checker=ts.createProgram(['captured-source.mjs'],{allowJs:true,noLib:true,noResolve:true},host).getTypeChecker();
  const functionNode=node=>ts.isArrowFunction(node)||ts.isFunctionExpression(node)||ts.isFunctionDeclaration(node),functions=new Map();
  const walk=node=>{if(functionNode(node))functions.set(node.getStart(file)+':'+node.end,node);ts.forEachChild(node,walk);};walk(file);
  const symbol=node=>ts.isShorthandPropertyAssignment(node.parent)?checker.getShorthandAssignmentValueSymbol(node.parent):ts.isExportSpecifier(node.parent)?checker.getExportSpecifierLocalTargetSymbol(node.parent):checker.getSymbolAtLocation(node);
  const nonReference=node=>{const p=node.parent;return ts.isPropertyAccessExpression(p)&&p.name===node||ts.isPropertyAssignment(p)&&p.name===node||ts.isMethodDeclaration(p)&&p.name===node||ts.isBindingElement(p)&&p.propertyName===node||ts.isImportSpecifier(p)&&p.propertyName===node;};
  const handle=Object.freeze({});issuers.set(handle,{source,sourcePath,ts,file,checker,functionNode,functions,symbol,nonReference});return handle;
}

export function issueCapturedPrimitivesFrom(issuer,start,end) {
  const state=issuers.get(issuer);if(!state)fail('a copied or foreign captured-collection issuer');
  const {source,sourcePath,ts,file,checker,functionNode,functions,symbol,nonReference}=state;
  if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>source.length)fail('invalid captured-collection source span');
  const target=functions.get(start+':'+end);
  if(!target||target.parent===file||ts.isVariableDeclaration(target.parent)&&target.parent.parent.parent.parent===file)fail('a capture without an exact original nested body');
  if(target.asteriskToken||target.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.AsyncKeyword)||target.parameters.some(param=>param.initializer||param.dotDotDotToken||param.type))fail('an effectful captured-collection callback');
  const ancestors=[];for(let parent=target.parent;parent&&parent!==file;parent=parent.parent)ancestors.push(parent);
  if(ancestors.some(node=>(functionNode(node)||ts.isMethodDeclaration(node))&&(node.asteriskToken||node.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.AsyncKeyword)||node.parameters.some(param=>param.initializer||param.dotDotDotToken))))fail('an effectful or async enclosing collection owner');
  const inside=(node,container)=>node.pos>=container.pos&&node.end<=container.end;
  const span=node=>({kind:ts.SyntaxKind[node.kind],start:node.getStart(file),end:node.end});
  const collections=new Map();
  const primitive=node=>{
    if(ts.isStringLiteral(node)){if(/\p{Surrogate}/u.test(node.text))fail('an unimplemented captured surrogate literal');return {kind:'string',value:node.text};}
    if(node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return {kind:'boolean',value:node.kind===ts.SyntaxKind.TrueKeyword};
    if(ts.isNumericLiteral(node)&&/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(node.getText(file))&&Number.isFinite(Number(node.getText(file)))) {
      const text=String(Number(node.getText(file)));
      if(/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(text))return {kind:'number',text};
    }
    if(ts.isPrefixUnaryExpression(node)&&node.operator===ts.SyntaxKind.MinusToken){const value=primitive(node.operand);if(value.kind==='number')return {kind:'unary',op:'negate',operand:value};}
    fail('a nonliteral or unsupported captured primitive initializer');
  };
  const collection=bound=>{
    if(collections.has(bound))return collections.get(bound);
    const declarations=bound.declarations??[];
    if(declarations.length!==1||!ts.isVariableDeclaration(declarations[0]))fail('a captured collection without one original const declaration');
    const declaration=declarations[0],list=declaration.parent,statement=list.parent;
    if(!ts.isIdentifier(declaration.name)||!ts.isVariableDeclarationList(list)||!ts.isVariableStatement(statement)||!(list.flags&ts.NodeFlags.Const)||!declaration.initializer||declaration.end>start||!(statement.parent===file||ancestors.includes(statement.parent)))fail('a non-dominating or mutable captured collection');
    if(statement.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword))fail('an exported captured collection escapes');
    let initializer=declaration.initializer,kind='array';
    if(ts.isNewExpression(initializer)) {
      if(!ts.isIdentifier(initializer.expression)||initializer.expression.text!=='Set'||symbol(initializer.expression)?.declarations?.length||initializer.arguments?.length!==1)fail('an unproved captured constructor');
      kind='set';initializer=initializer.arguments[0];
    }
    if(!ts.isArrayLiteralExpression(initializer)||initializer.elements.length>256)fail('a nonliteral or oversized captured collection');
    const values=initializer.elements.map(primitive),value={name:declaration.name.text,kind,declaration:span(declaration),initializer:span(declaration.initializer),initializerSource:declaration.initializer.getText(file),values,references:[]};
    collections.set(bound,value);return value;
  };
  const inspect=node=>{
    if(ts.isJSDoc(node))return;
    if(node!==target&&functionNode(node)||ts.isGetAccessorDeclaration(node)||ts.isSetAccessorDeclaration(node)||[ts.SyntaxKind.ThisKeyword,ts.SyntaxKind.SuperKeyword,ts.SyntaxKind.MetaProperty,ts.SyntaxKind.PrivateIdentifier].includes(node.kind))fail('an unsupported captured body or receiver');
    if(ts.isIdentifier(node)&&!nonReference(node)) {
      const bound=symbol(node),declarations=bound?.declarations??[];
      if(!declarations.length){if(node.text!=='undefined')fail('an unresolved captured-body global');}
      else if(!declarations.every(declaration=>inside(declaration,target)))collection(bound).references.push(span(node));
    }
    ts.forEachChild(node,inspect);
  };inspect(target);
  if(!collections.size)fail('a collection environment without captured data');
  const callbackInputs=callbackProducerInputs({ts,file,checker,checkedCallbacks:new Map()})(target);
  if(target.parameters.some(param=>!ts.isIdentifier(param.name))&&!callbackInputs)fail('unproved captured-body destructuring');
  const key=node=>ts.isStringLiteralLike(node)?node.text:ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken&&key(node.left)!==null&&key(node.right)!==null?key(node.left)+key(node.right):null;
  const written=node=>{
    let member=node;
    while(member.parent&&(ts.isParenthesizedExpression(member.parent)||ts.isArrayLiteralExpression(member.parent)||ts.isObjectLiteralExpression(member.parent)||ts.isPropertyAssignment(member.parent)&&member.parent.initializer===member||ts.isShorthandPropertyAssignment(member.parent)||ts.isSpreadElement(member.parent)||ts.isSpreadAssignment(member.parent)||ts.isPropertyAccessExpression(member.parent)&&member.parent.expression===member||ts.isElementAccessExpression(member.parent)&&member.parent.expression===member))member=member.parent;
    const parent=member.parent;
    return parent&&(ts.isBinaryExpression(parent)&&parent.left===member&&ts.isAssignmentOperator(parent.operatorToken.kind)||ts.isPrefixUnaryExpression(parent)&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(parent.operator)||ts.isPostfixUnaryExpression(parent)||ts.isDeleteExpression(parent)||ts.isForOfStatement(parent)&&parent.initializer===member||ts.isForInStatement(parent)&&parent.initializer===member);
  };
  const forbidden=new Set(['constructor','prototype','__proto__','defineProperty','defineProperties','getPrototypeOf','setPrototypeOf','iterator']);
  const harmlessCallback=call=>{
    const callback=call.arguments[0];
    if(call.arguments.length!==1||!callback||!functionNode(callback)||callback.asteriskToken||callback.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.AsyncKeyword)||callback.parameters.length>2||callback.parameters.some(param=>param.dotDotDotToken||param.initializer))fail('an escaping captured-array callback capability');
  };
  const audit=node=>{
    if(ts.isJSDoc(node))return;
    if(ts.isWithStatement(node)||ts.isPropertyAccessExpression(node)&&forbidden.has(node.name.text)||ts.isElementAccessExpression(node)&&forbidden.has(key(node.argumentExpression)))fail('an unproved captured-collection prototype or dynamic scope');
    if(ts.isIdentifier(node)&&!nonReference(node)) {
      const bound=symbol(node),parent=node.parent;
      if(['eval','Function','arguments','globalThis','global','window','Reflect'].includes(node.text))fail('a dynamic or escaping captured-collection environment');
      if(['Array','Set','Object','String'].includes(node.text)&&!bound?.declarations?.length) {
        const directNew=node.text==='Set'&&ts.isNewExpression(parent)&&parent.expression===node;
        const directString=node.text==='String'&&(ts.isCallExpression(parent)||ts.isNewExpression(parent))&&parent.expression===node;
        const directMember=ts.isPropertyAccessExpression(parent)&&parent.expression===node&&ts.isCallExpression(parent.parent)&&parent.parent.expression===parent;
        if(!directNew&&!directString&&!directMember||written(node))fail('an escaping or written captured-collection intrinsic');
      }
      const capture=collections.get(bound);
      if(capture&&written(node))fail('a written captured collection binding or member');
      if(capture&&node!==bound.declarations[0].name) {
        const member=parent,call=member.parent;
        if(ts.isPropertyAccessExpression(member)&&member.expression===node&&!ts.isOptionalChain(member)&&ts.isCallExpression(call)&&call.expression===member&&!ts.isOptionalChain(call)) {
          if(member.name.text===(capture.kind==='set'?'has':'includes')&&call.arguments.length===1&&!ts.isSpreadElement(call.arguments[0])) { /* exact read */ }
          else if(capture.kind==='array'&&['every','some','filter','map'].includes(member.name.text))harmlessCallback(call);
          else fail('an unproved captured-collection operation or write');
        } else if(capture.kind==='array'&&ts.isForOfStatement(parent)&&parent.expression===node) { /* primitive iteration */ }
        else if(capture.kind==='array'&&ts.isSpreadElement(parent)&&ts.isArrayLiteralExpression(parent.parent)) { /* fresh copied values; original identity does not escape */ }
        else fail('a captured collection alias, write or identity escape');
      }
      if(inside(node,target))for(const[owned,value]of collections)if(node.text===value.name&&bound!==owned)fail('a shadowed captured-collection spelling');
    }
    ts.forEachChild(node,audit);
  };audit(file);
  const scope=ancestors.filter(node=>functionNode(node)||ts.isBlock(node)||ts.isClassDeclaration(node)||ts.isClassExpression(node)||ts.isMethodDeclaration(node)||ts.isCatchClause(node)||ts.isForStatement(node)||ts.isForOfStatement(node)||ts.isForInStatement(node)).reverse().map(node=>({...span(node),name:node.name?.getText(file)??null}));
  const proof=freeze({schema:'original-lexical-primitive-collection-environment-v1',sourcePath,sourceUtf16:source,sourceUtf16Sha256:hash(source),start,end,sourceScope:scope,collections:[...collections.values()],...(callbackInputs?{conditionalInputs:callbackInputs}:{}),standardCollectionIntrinsicsRequired:true,collectionLookupStabilityProved:false,originalSignatureFullDomainPreserved:false,parentCreationLowered:false,captureIdentityObservable:false,runtimeParity:false});
  const parameters=target.parameters.map(param=>param.getText(file)).join(','),body=target.body.getText(file);
  const handle=Object.freeze({});issued.set(handle,Object.freeze({proof,callbackInputs,wrapper:Object.freeze(name=>'const '+name+'=('+parameters+')=>'+body+';')}));return handle;
}

export function readCapturedPrimitives(handle) {
  const value=issued.get(handle);if(!value)fail('a copied or foreign captured-collection environment');return value;
}
export function reissueCapturedPrimitives(proof) {
  plain(proof);
  if(!proof||typeof proof!=='object'||['schema','sourceUtf16','sourcePath','start','end'].some(key=>!Object.hasOwn(proof,key)))fail('missing own captured-collection source coordinates');
  const handle=issueCapturedPrimitivesFrom(createCapturedPrimitiveIssuer(proof.sourceUtf16,proof.sourcePath),proof.start,proof.end);
  if(!isDeepStrictEqual(readCapturedPrimitives(handle).proof,proof))fail('a changed captured-collection source, declaration, value, symbol, scope or producer');return handle;
}
