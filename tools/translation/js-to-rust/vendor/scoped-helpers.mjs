import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {ownershipSyntax,ownershipCompiler} from './module-syntax.mjs';
import {parseMeta} from '../translator.mjs';
import {toLino,lowerSourceClosure} from './ir.mjs';
import {createLexicalEnvironmentIssuer,issueLexicalEnvironmentFrom,lexicalClosureName} from './lexical-environments.mjs';
import {createCapturedPrimitiveIssuer,issueCapturedPrimitivesFrom} from './captured-primitives.mjs';
import {callbackProducerInputs,withCallbackInputs} from './callback-inputs.mjs';

const globals=new Set(['Math','Number','Buffer','undefined']);
const intrinsicOwners=new Set(['Math','Number','Buffer','String','Array','RegExp','Object']);
export function discoverScopedHelpers(source,owners,analyze,sourcePath=null) {
  let syntax;try{syntax=ownershipSyntax(source);}catch(error){return {complete:false,sourceItems:0,translatedItems:0,unsupportedItems:0,items:[],program:[],diagnostics:[{kind:'syntax',message:'complete scoped syntax is unavailable: '+error.message,span:{start:0,end:source.length,encoding:'utf16'}}]};}
  const {ts,file}=syntax;
  const sourceSha256=createHash('sha256').update(source).digest('hex'),namespace=createHash('sha256').update(JSON.stringify([sourcePath,sourceSha256])).digest('hex').slice(0,16);
  const host={getSourceFile:name=>name.endsWith('module-ownership.mjs')?file:undefined,fileExists:name=>name.endsWith('module-ownership.mjs'),readFile:name=>name.endsWith('module-ownership.mjs')?source:undefined,getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=> '/',getDirectories:()=>[],directoryExists:()=>true,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
  const checker=ts.createProgram(['module-ownership.mjs'],{allowJs:true,checkJs:false,noLib:true,noResolve:true},host).getTypeChecker();
  const isFunction=node=>ts.isArrowFunction(node)||ts.isFunctionExpression(node)||ts.isFunctionDeclaration(node);
  const isTop=node=>node.parent===file||ts.isVariableDeclaration(node.parent)&&node.parent.parent.parent.parent===file;
  const isName=node=>{const p=node.parent;return p&&(ts.isPropertyAccessExpression(p)&&p.name===node||ts.isPropertyAssignment(p)&&p.name===node||ts.isBindingElement(p)&&p.propertyName===node||ts.isImportSpecifier(p)&&p.propertyName===node||ts.isMethodDeclaration(p)&&p.name===node);};
  const lexical=declaration=>[ts.SyntaxKind.VariableDeclaration,ts.SyntaxKind.BindingElement,ts.SyntaxKind.Parameter,ts.SyntaxKind.ImportSpecifier,ts.SyntaxKind.ImportClause,ts.SyntaxKind.NamespaceImport,ts.SyntaxKind.FunctionDeclaration,ts.SyntaxKind.FunctionExpression,ts.SyntaxKind.ClassDeclaration,ts.SyntaxKind.ClassExpression].includes(declaration.kind);
  const inside=(node,container)=>node.pos>=container.pos&&node.end<=container.end;
  const referenceSymbol=node=>ts.isShorthandPropertyAssignment(node.parent)?checker.getShorthandAssignmentValueSymbol(node.parent):checker.getSymbolAtLocation(node);
  const scopeOf=node=>{const scopes=[];for(let parent=node.parent;parent&&parent!==file;parent=parent.parent)if(isFunction(parent)||ts.isClassDeclaration(parent)||ts.isClassExpression(parent)||ts.isMethodDeclaration(parent)||ts.isGetAccessorDeclaration(parent)||ts.isSetAccessorDeclaration(parent)||ts.isCatchClause(parent)||ts.isForStatement(parent)||ts.isForOfStatement(parent)||ts.isForInStatement(parent)||ts.isBlock(parent))scopes.push({kind:ts.SyntaxKind[parent.kind],name:parent.name?.getText(file)??null,start:parent.getStart(file),end:parent.end});return scopes.reverse();};
  let intrinsicReason=null;
  const keyOf=node=>ts.isStringLiteralLike(node)?node.text:ts.isBinaryExpression(node)&&node.operatorToken.kind===ts.SyntaxKind.PlusToken&&keyOf(node.left)!==null&&keyOf(node.right)!==null?keyOf(node.left)+keyOf(node.right):null;
  const written=expression=>{
    let member=expression;
    while(ts.isParenthesizedExpression(member.parent)||ts.isArrayLiteralExpression(member.parent)||ts.isObjectLiteralExpression(member.parent)||ts.isPropertyAssignment(member.parent)&&member.parent.initializer===member||ts.isSpreadElement(member.parent)||ts.isSpreadAssignment(member.parent)||ts.isPropertyAccessExpression(member.parent)&&member.parent.expression===member||ts.isElementAccessExpression(member.parent)&&member.parent.expression===member)member=member.parent;
    const outer=member.parent;
    return ts.isBinaryExpression(outer)&&outer.left===member&&ts.isAssignmentOperator(outer.operatorToken.kind)||ts.isPrefixUnaryExpression(outer)||ts.isPostfixUnaryExpression(outer)||ts.isDeleteExpression(outer)||ts.isForOfStatement(outer)&&outer.initializer===member||ts.isForInStatement(outer)&&outer.initializer===member;
  };
  const forbidden=new Set(['constructor','prototype','__proto__','defineProperty','defineProperties','getPrototypeOf','setPrototypeOf']);
  const audit=node=>{
    if(ts.isJSDoc(node))return;
    if(ts.isWithStatement(node))intrinsicReason??='an unproved dynamic scope';
    if(ts.isPropertyAccessExpression(node)&&forbidden.has(node.name.text)||ts.isElementAccessExpression(node)&&forbidden.has(keyOf(node.argumentExpression)))intrinsicReason??='an unproved prototype or intrinsic mutation';
    if(ts.isIdentifier(node)&&!isName(node)&&!referenceSymbol(node)?.declarations?.some(lexical)) {
      const member=node.parent;
      if(['eval','Function','Reflect'].includes(node.text))intrinsicReason??='an unproved dynamic intrinsic capability';
      if(['globalThis','global','window'].includes(node.text)) {
        const key=ts.isPropertyAccessExpression(member)&&member.expression===node?member.name.text:ts.isElementAccessExpression(member)&&member.expression===node?keyOf(member.argumentExpression):null;
        if(key===null||['Math','Number','Buffer','String','Object','JSON','Response','Map','Set','eval','Function'].includes(key)||written(member))intrinsicReason??='an escaping or mutable global intrinsic capability';
      }
      if(intrinsicOwners.has(node.text)) {
        const directConstructor=['Number','String','Array','RegExp'].includes(node.text)&&(ts.isCallExpression(member)||ts.isNewExpression(member))&&member.expression===node;
        if(!directConstructor&&!(ts.isPropertyAccessExpression(member)&&member.expression===node&&!written(member)))intrinsicReason??='a mutable or escaping standard primitive intrinsic';
      }
    }
    ts.forEachChild(node,audit);
  };
  audit(file);
  let lexicalIssuer,primitiveIssuer;
  const items=[],program=[],checkedCallbacks=new Map(),inputFor=callbackProducerInputs({ts,file,checker,checkedCallbacks});
  const visit=node=>{
    if(isFunction(node)&&!isTop(node)) {
      const start=node.getStart(file),end=node.end,owner=owners.find(owner=>owner.start<=start&&owner.end>=end),name='scoped_src'+namespace+'_at'+start;
      const row={name,sourcePath,sourceSha256,originalName:node.name?.getText(file)??(ts.isVariableDeclaration(node.parent)?node.parent.name.getText(file):null),kind:ts.SyntaxKind[node.kind],start,end,sourceScope:scopeOf(node),owner:owner?{start:owner.start,end:owner.end,name:owner.name??null,status:owner.status}:null,status:'unsupported',captures:[]};
      const inputContract=inputFor(node);
      let reason=intrinsicReason,kind='collection';
      if(node.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.AsyncKeyword)){reason='an async scoped function';kind='async';}
      if(node.asteriskToken)reason='a generator scoped function';
      if(node.parameters.some(param=>!ts.isIdentifier(param.name)&&!inputContract||param.type))reason??='a scoped parameter without an identifier JavaScript binding';
      const inspect=child=>{
        if(ts.isJSDoc(child))return;
        if([ts.SyntaxKind.ThisKeyword,ts.SyntaxKind.SuperKeyword,ts.SyntaxKind.MetaProperty,ts.SyntaxKind.PrivateIdentifier].includes(child.kind))reason??='a lexical this/super/meta/private capability';
        if(child!==node&&isFunction(child))reason??='a nested closure inside the isolated body';
        if(ts.isGetAccessorDeclaration(child)||ts.isSetAccessorDeclaration(child))reason??='a scoped accessor effect';
        if(ts.isIdentifier(child)&&!isName(child)) {
          const symbol=referenceSymbol(child),declarations=symbol?.declarations??[];
          if(child.text==='arguments')reason??='a scoped arguments capability';
          else if(declarations.length&&!declarations.every(declaration=>inside(declaration,node))) {
            row.captures.push({name:child.text,start:child.getStart(file),end:child.end,bindings:declarations.map(declaration=>({kind:ts.SyntaxKind[declaration.kind],start:declaration.getStart(file),end:declaration.end}))});reason??='a scoped lexical capture';
          } else if(!declarations.length&&!globals.has(child.text)) {row.captures.push({name:child.text,start:child.getStart(file),end:child.end,bindings:[]});reason??='an unresolved scoped free identifier';}
        }
        ts.forEachChild(child,inspect);
      };
      inspect(node);
      if(reason==='a scoped lexical capture'&&row.captures.every(capture=>capture.bindings.length===1&&capture.bindings[0].kind==='Parameter')) {
        // A failed environment attempt retains the complete previous refusal.
        // Parent execution and closure creation are still outside this draft.
        try {
          lexicalIssuer??=createLexicalEnvironmentIssuer(source,sourcePath);
          const environment=issueLexicalEnvironmentFrom(lexicalIssuer,start,end),closure=lowerSourceClosure(environment,lexicalClosureName(environment));
          if(!isDeepStrictEqual(parseMeta(toLino(closure)),[closure]))throw Error('closure meta drift');
          program.push(closure);row.name=closure.name;row.status='translated';row.coverageContract='full-domain-body';row.environmentContract={schema:closure.environment.schema,parentCreationLowered:false};reason=null;
        } catch { /* complete original capture census remains authoritative */ }
      }
      if(reason==='a scoped lexical capture'&&row.captures.every(capture=>capture.bindings.length===1&&capture.bindings[0].kind==='VariableDeclaration')) {
        try {
          primitiveIssuer??=createCapturedPrimitiveIssuer(source,sourcePath);
          const environment=issueCapturedPrimitivesFrom(primitiveIssuer,start,end),closure=lowerSourceClosure(environment,lexicalClosureName(environment));
          if(!isDeepStrictEqual(parseMeta(toLino(closure)),[closure]))throw Error('captured collection meta drift');
          program.push(closure);row.name=closure.name;row.status='translated';row.coverageContract='conditional-private-body-draft';row.environmentContract={schema:closure.environment.schema,parentCreationLowered:false,standardCollectionIntrinsicsRequired:true,collectionLookupStabilityProved:false,originalSignatureFullDomainPreserved:false};reason=null;
        } catch { /* retain every original unproved capture/refusal origin */ }
      }
      if(!reason&&row.status!=='translated') {
        const text=node.getText(file),temporary='scopedSrc'+namespace+'At'+start,wrapper=ts.isFunctionDeclaration(node)?'function '+temporary+'('+node.parameters.map(param=>param.getText(file)).join(',')+') '+node.body.getText(file):'const '+temporary+'='+text+';';
        let checked=analyze(wrapper,{includeScoped:false,lossless:true});
        if((checked.diagnostics.length||checked.program.length!==1)&&inputContract){checked=withCallbackInputs(wrapper,inputContract,analyze);row.inputContract=inputContract;}
        if(checked.diagnostics.length||checked.program.length!==1) {const diagnostic=checked.diagnostics[0];reason=diagnostic?.message??'an unimplemented scoped function body';kind=diagnostic?.kind??'unsupported';}
        else {
          try{const original=checked.program[0],reparsed=parseMeta(toLino(original));if(!isDeepStrictEqual(reparsed,[original]))throw Error('scoped meta drift');let pipeline=original;
            if(inputContract&&!row.inputContract&&!['string','utf16-string'].includes(original.returns)){const witness=withCallbackInputs(wrapper,inputContract,analyze);if(!witness.diagnostics.length&&witness.program.length===1&&['string','utf16-string'].includes(witness.program[0].returns)){const witnessMeta=toLino(witness.program[0]);if(!isDeepStrictEqual(parseMeta(witnessMeta),witness.program))throw Error('callback pipeline witness drift');row.pipelineWitness={inputContract,returns:witness.program[0].returns,meta:witnessMeta};pipeline=witness.program[0];}}
            program.push(original);checkedCallbacks.set(node,pipeline);row.status='translated';row.coverageContract=original.conditionalInputs?'conditional-private-body-draft':'full-domain-body';}
          catch(error){reason=error.message;kind=error.slug??'type';}
        }
      }
      if(reason)row.diagnostic={kind,message:reason,span:{start,end,encoding:'utf16'},example:source.slice(start,end).slice(0,180)};
      items.push(row);
    }
    ts.forEachChild(node,visit);
  };
  visit(file);
  return {complete:true,sourceItems:items.length,translatedItems:program.length,fullDomainTranslatedItems:program.filter(fn=>!fn.conditionalInputs&&!fn.conditionalCaptures&&!fn.conditionalCalls).length,conditionalPrivateBodyDraftItems:program.filter(fn=>fn.conditionalInputs||fn.conditionalCaptures||fn.conditionalCalls).length,unsupportedItems:items.length-program.length,items,program,diagnostics:items.filter(item=>item.diagnostic).map(item=>item.diagnostic)};
}

/** Syntactic pool only: no callback/type/owner/admission decisions are made. */
export function collectScopedWrapperSources(source,sourcePath=null){
  if(typeof source!=='string'||source.length>2097152||sourcePath!==null&&typeof sourcePath!=='string')throw Error('bounded primitive bulk source/path required');
  const ts=ownershipCompiler(),file=ts.createSourceFile('bulk-wrapper-census.mjs',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const sourceSha256=createHash('sha256').update(source).digest('hex'),namespace=createHash('sha256').update(JSON.stringify([sourcePath,sourceSha256])).digest('hex').slice(0,16);
  const rows=[{source,language:'JavaScript'}],occurrences=[];let units=source.length;
  const isFunction=node=>ts.isArrowFunction(node)||ts.isFunctionExpression(node)||ts.isFunctionDeclaration(node);
  const isTop=node=>node.parent===file||ts.isVariableDeclaration(node.parent)&&node.parent.parent.parent.parent===file;
  const visit=node=>{
    if(isFunction(node)&&!isTop(node)&&node.body){
      const start=node.getStart(file),end=node.end,text=node.getText(file),temporary='scopedSrc'+namespace+'At'+start;
      // Exact duplicate of the existing discover formula, deliberately not an
      // old-body refactor. A pool row is not a semantic parsing result.
      const wrapper=ts.isFunctionDeclaration(node)?'function '+temporary+'('+node.parameters.map(param=>param.getText(file)).join(',')+') '+node.body.getText(file):'const '+temporary+'='+text+';';
      units+=wrapper.length;if(rows.length>=256||units>2097152)throw Error('bulk wrapper aggregate row/source budget');
      occurrences.push({row:rows.length,start,end,kind:ts.SyntaxKind[node.kind],temporary,source:wrapper,language:'JavaScript'});rows.push({source:wrapper,language:'JavaScript'});
    }
    ts.forEachChild(node,visit);
  };
  visit(file);return {source,sourcePath,sourceSha256,namespace,rows,occurrences};
}
