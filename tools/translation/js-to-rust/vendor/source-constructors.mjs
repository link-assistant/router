// Actual source text issues the constructor capability. An import name, type,
// class schema or caller-supplied constructor/capture table cannot issue it.
import {createHash} from 'node:crypto';
import {types,isDeepStrictEqual} from 'node:util';
import {posix} from 'node:path';
import {ownershipCompiler} from './module-syntax.mjs';
import {SOURCE_CONSTRUCTOR_CONDITIONS} from './completions.mjs';

const graphs=new WeakMap(),constructors=new WeakMap(),proofGraphs=new WeakMap();
const fail=message=>{throw Object.assign(new Error(message),{slug:'collection'});};
const sha=source=>createHash('sha256').update(Buffer.from(source,'utf16le')).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freeze(child);Object.freeze(value);}return value;};
const filename=value=>typeof value==='string'&&/^(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.mjs$/u.test(value);
function plain(value,active=new Set(),budget={cells:200000,bytes:8388608},depth=0) {
  if(depth>160||--budget.cells<0)fail('constructor source proof exceeds its depth or cell bound');
  if(typeof value==='string'){budget.bytes-=value.length*2;if(budget.bytes<0)fail('constructor source proof exceeds its string bound');return;}
  if(typeof value==='number'){if(!Number.isFinite(value))fail('a nonfinite constructor source scalar');return;}
  if(value===null||typeof value==='boolean')return;
  if(!value||typeof value!=='object'||types.isProxy(value)||active.has(value)
    ||![Object.prototype,Array.prototype,null].includes(Object.getPrototypeOf(value)))fail('a foreign or cyclic constructor source record');
  const keys=Reflect.ownKeys(value);
  if(keys.length>budget.cells+1)fail('constructor source proof exceeds its field bound');
  if(Array.isArray(value)) {
    const length=Object.getOwnPropertyDescriptor(value,'length');
    if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<0||length.value>200000
      ||keys.length!==length.value+1||keys[length.value]!=='length')fail('a sparse or extended constructor source array');
    for(let index=0;index<length.value;index++)if(keys[index]!==String(index))fail('a sparse or reordered constructor source array');
  }
  active.add(value);
  for(const key of keys) {
    const field=Object.getOwnPropertyDescriptor(value,key);
    if(typeof key!=='string'||!Object.hasOwn(field,'value')||!field.enumerable&&!(Array.isArray(value)&&key==='length'))fail('an accessor or hidden constructor source field');
    budget.bytes-=key.length*2;if(budget.bytes<0)fail('constructor source proof exceeds its key bound');
    plain(field.value,active,budget,depth+1);
  }
  active.delete(value);
}
export const assertConstructorProofData=value=>plain(value);
function own(row,key) {
  const field=Object.getOwnPropertyDescriptor(row,key);
  if(!field||!Object.hasOwn(field,'value'))fail('missing original constructor source '+key);
  return field.value;
}
function span(node,file){return {start:node.getStart(file),end:node.end};}
function scalar(ts,node) {
  if(ts.isStringLiteral(node)||ts.isNoSubstitutionTemplateLiteral(node))return {kind:'string',value:node.text};
  if(ts.isNumericLiteral(node)&&Number.isFinite(Number(node.text)))return {kind:'number',value:Number(node.text)};
  if(node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return {kind:'boolean',value:node.kind===ts.SyntaxKind.TrueKeyword};
  if(node.kind===ts.SyntaxKind.NullKeyword)return {kind:'null'};
  fail('an effectful or unsupported original constructor initializer');
}
function propertyName(ts,node) {
  const parent=node.parent;
  return ts.isPropertyAccessExpression(parent)&&parent.name===node
    ||(ts.isPropertyAssignment(parent)||ts.isMethodDeclaration(parent))&&parent.name===node;
}

function constructorSyntaxChecker(ts,files) {
  const host={getSourceFile:name=>files.get(name)?.file,fileExists:name=>files.has(name),readFile:name=>files.get(name)?.source,
    getDefaultLibFileName:()=>'',writeFile:()=>{},getCurrentDirectory:()=>'',getDirectories:()=>[],directoryExists:()=>true,
    getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
  return ts.createProgram([...files.keys()],{allowJs:true,noLib:true,noResolve:true},host).getTypeChecker();
}

export function createConstructorSourceGraph(records) {
  if(!records||typeof records!=='object'||types.isProxy(records)||!Array.isArray(records))fail('a foreign original constructor source graph');
  const length=Object.getOwnPropertyDescriptor(records,'length');
  if(!length||!Object.hasOwn(length,'value')||!Number.isSafeInteger(length.value)||length.value<1||length.value>128)fail('an incomplete or oversized constructor source graph');
  plain(records);
  const sources=[],files=new Map();let bytes=0;
  for(const record of records) {
    if(!record||typeof record!=='object'||Reflect.ownKeys(record).length!==2)fail('invalid original constructor source record');
    const path=own(record,'path'),source=own(record,'source');
    if(!filename(path)||typeof source!=='string'||files.has(path))fail('invalid or duplicate original constructor source path');
    bytes+=source.length*2;if(bytes>4194304)fail('original constructor source graph exceeds its byte bound');
    const ts=ownershipCompiler();
    const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
    // Preserve the old ownershipSyntax parse failure contract, now without
    // allocating its otherwise discarded dummy-filename AST first.
    if(file.parseDiagnostics.length)throw new Error('invalid module ownership syntax');
    // TypeScript's parse diagnostics do not reject every JavaScript restricted
    // production. A line terminator inside a comment still separates throw
    // from its operand and must never acquire a recovered-AST capability.
    // Keep occurrences, never semantic/effect decisions. These linked entries
    // use only fresh own-data literals; no collection callback sees private AST.
    const traversal={children:ts.forEachChild,identifier:ts.isIdentifier,property:ts.isPropertyAccessExpression};
    let effectHead=null,effectTail=null;
    const validateThrow=node=>{
      if(ts.isPropertyAccessExpression(node)||ts.isIdentifier(node)) {
        const occurrence={node,next:null};
        if(effectTail===null)effectHead=occurrence;else effectTail.next=occurrence;
        effectTail=occurrence;
      }
      if(ts.isThrowStatement(node)) {
        const operand=node.expression;
        // TS parseThrowStatement recovers a restricted-production newline by
        // synthesizing an empty zero-width identifier before the newline.
        if(!operand||operand.pos===operand.end||ts.isIdentifier(operand)&&operand.text===''||/[\n\r\u2028\u2029]/u.test(source.slice(node.getStart(file)+5,operand.getStart(file))))fail('invalid original constructor module: a line terminator or missing operand after throw');
      }
      ts.forEachChild(node,validateThrow);
    };validateThrow(file);
    sources.push({path,source});files.set(path,{ts,file,source,effectHead,traversal});
  }
  sources.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0);
  // This private checker joins identifiers to actual lexical declarations. It
  // never executes imported modules or invokes their exported constructors.
  const ts=files.values().next().value.ts;
  let checker;
  const handle=Object.freeze({});graphs.set(handle,{sources:freeze(sources),files,ts,checker:()=>checker??=constructorSyntaxChecker(ts,files)});
  return handle;
}

function resolveImport(graph,path,node) {
  const {ts}=graph,consumer=graph.files.get(path),checker=graph.checker(),symbol=checker.getSymbolAtLocation(node);
  const declarations=symbol?.declarations;
  if(!declarations||declarations.length!==1||!ts.isImportSpecifier(declarations[0]))fail('an unresolved, shadowed or non-named constructor import');
  const binding=declarations[0],statement=binding.parent.parent.parent;
  if(!ts.isImportDeclaration(statement)||!ts.isStringLiteral(statement.moduleSpecifier)||statement.importClause?.isTypeOnly)fail('a non-runtime constructor import');
  const specifier=statement.moduleSpecifier.text;
  if(!specifier.startsWith('./')&&!specifier.startsWith('../'))fail('an external constructor without original source');
  const target=posix.normalize(posix.join(posix.dirname(path),specifier));
  if(!filename(target)||!graph.files.has(target))fail('a constructor import escapes or lacks original source');
  const original=graph.files.get(target),exported=binding.propertyName?.text??binding.name.text;
  const declarations_=original.file.statements.filter(item=>ts.isClassDeclaration(item)&&item.name?.text===exported&&item.modifiers?.some(mod=>mod.kind===ts.SyntaxKind.ExportKeyword));
  if(declarations_.length!==1)fail('a constructor import without one original exported class');
  return {consumer,original,target,binding,statement,klass:declarations_[0]};
}

function classRecipe(graph,owner) {
  return closedClassRecipe(graph.ts,owner.original.file,owner.klass,graph.checker());
}

function closedClassRecipe(ts,file,klass,checker) {
  if(klass.modifiers?.some(mod=>mod.kind!==ts.SyntaxKind.ExportKeyword)||klass.typeParameters?.length)fail('an unsupported original constructor class modifier or generic');
  const heritage=klass.heritageClauses;
  if(heritage?.length!==1||heritage[0].token!==ts.SyntaxKind.ExtendsKeyword||heritage[0].types.length!==1
    ||heritage[0].types[0].typeArguments?.length||!ts.isIdentifier(heritage[0].types[0].expression)
    ||heritage[0].types[0].expression.text!=='Error'||checker.getSymbolAtLocation(heritage[0].types[0].expression))fail('an original class without unshadowed builtin Error ancestry');
  if(klass.members.length!==1||!ts.isConstructorDeclaration(klass.members[0]))fail('an original constructor with methods, accessors or extra members');
  const ctor=klass.members[0],params=[];
  if(!ctor.body||ctor.modifiers?.length||!ctor.parameters.length||ctor.parameters.length>8)fail('an unsupported original constructor body');
  for(const parameter of ctor.parameters) {
    if(!ts.isIdentifier(parameter.name)||parameter.dotDotDotToken||parameter.modifiers?.length||parameter.type||parameter.questionToken)fail('an unsupported original constructor parameter');
    params.push({name:parameter.name.text,...(parameter.initializer?{default:scalar(ts,parameter.initializer)}:{})});
  }
  if(new Set(params.map(param=>param.name)).size!==params.length)fail('duplicate original constructor parameters');
  const [first,...rest]=ctor.body.statements;
  if(!first||!ts.isExpressionStatement(first)||!ts.isCallExpression(first.expression)
    ||first.expression.expression.kind!==ts.SyntaxKind.SuperKeyword||first.expression.arguments.length!==1
    ||!ts.isIdentifier(first.expression.arguments[0]))fail('an unsupported original Error super invocation');
  const message=ctor.parameters.findIndex(parameter=>checker.getSymbolAtLocation(parameter.name)===checker.getSymbolAtLocation(first.expression.arguments[0]));
  if(message<0)fail('an original Error super message without its actual parameter');
  const fields=[];
  for(const statement of rest) {
    if(!ts.isExpressionStatement(statement)||!ts.isBinaryExpression(statement.expression)||statement.expression.operatorToken.kind!==ts.SyntaxKind.EqualsToken)fail('an effectful original constructor statement');
    const {left,right}=statement.expression;
    if(!ts.isPropertyAccessExpression(left)||left.expression.kind!==ts.SyntaxKind.ThisKeyword
      ||['__proto__','prototype','constructor','stack','message'].includes(left.name.text)||fields.some(field=>field.name===left.name.text))fail('an unsupported or repeated original Error field assignment');
    const parameter=ts.isIdentifier(right)?ctor.parameters.findIndex(param=>checker.getSymbolAtLocation(param.name)===checker.getSymbolAtLocation(right)):-1;
    fields.push({name:left.name.text,value:parameter<0?scalar(ts,right):{kind:'parameter',index:parameter},span:span(statement,file)});
  }
  return {name:klass.name.text,span:span(klass,file),constructorSpan:span(ctor,file),params,message,fields};
}

// Known original mutations/escapes are refusals. Absence of these syntactic
// events does not prove unknown imported/host effects or outside code pure.
function rejectKnownConstructorEffects(graph,owner) {
  const {ts}=graph,checker=graph.checker(),targetSymbol=checker.getSymbolAtLocation(owner.klass.name);
  for(const [path,{file,effectHead,traversal}]of graph.files) {
    const aliases=new Set(),candidateNames=new Set(['Error','eval','Function']);
    // Necessary lexical spellings only; no symbol or effect result is cached.
    // A shadow with a matching spelling still takes the original fresh lookup.
    if(path===owner.target){aliases.add(targetSymbol);candidateNames.add(owner.klass.name.text);}
    for(const statement of file.statements)if(ts.isImportDeclaration(statement)&&statement.importClause?.namedBindings&&ts.isNamedImports(statement.importClause.namedBindings)) {
      for(const binding of statement.importClause.namedBindings.elements) {
        if((binding.propertyName?.text??binding.name.text)!==owner.klass.name.text)continue;
        const module=statement.moduleSpecifier;
        if(ts.isStringLiteral(module)&&posix.normalize(posix.join(posix.dirname(path),module.text))===owner.target){aliases.add(checker.getSymbolAtLocation(binding.name));candidateNames.add(binding.name.text);}
      }
    }
    const visit=node=>{
      if(ts.isPropertyAccessExpression(node)&&node.name.text==='prototype'&&ts.isIdentifier(node.expression)
        &&['Array','Object'].includes(node.expression.text)&&!checker.getSymbolAtLocation(node.expression)) {
        let use=node;
        while(ts.isPropertyAccessExpression(use.parent)&&use.parent.expression===use||ts.isElementAccessExpression(use.parent)&&use.parent.expression===use)use=use.parent;
        const parent=use.parent;
        if(ts.isBinaryExpression(parent)&&parent.left===use&&parent.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&parent.operatorToken.kind<=ts.SyntaxKind.LastAssignment
          ||ts.isDeleteExpression(parent)||ts.isPrefixUnaryExpression(parent)||ts.isPostfixUnaryExpression(parent)
          ||ts.isVariableDeclaration(parent)||ts.isCallExpression(parent)&&parent.arguments.some(argument=>argument===use))fail('a known inherited prototype or collection intrinsic mutation/escape');
      }
      if(ts.isIdentifier(node)&&!propertyName(ts,node)&&candidateNames.has(node.text)) {
        const symbol=checker.getSymbolAtLocation(node),parent=node.parent;
        if(aliases.has(symbol)&&symbol) {
          const declaration=ts.isClassDeclaration(parent)&&parent.name===node||ts.isImportSpecifier(parent);
          const construction=ts.isNewExpression(parent)&&parent.expression===node;
          const observe=ts.isBinaryExpression(parent)&&parent.operatorToken.kind===ts.SyntaxKind.InstanceOfKeyword&&parent.right===node;
          if(!declaration&&!construction&&!observe)fail('an original constructor alias, mutation or reflected use');
        }
        if(node.text==='Error'&&!symbol) {
          const base=ts.isExpressionWithTypeArguments(parent)&&parent.expression===node;
          const construct=ts.isNewExpression(parent)&&parent.expression===node;
          const observe=ts.isBinaryExpression(parent)&&parent.operatorToken.kind===ts.SyntaxKind.InstanceOfKeyword&&parent.right===node;
          if(!base&&!construct&&!observe)fail('an original ambient Error alias, mutation or reflection');
        }
        if(['eval','Function'].includes(node.text)&&!symbol)fail('unproved dynamic constructor scope');
      }
    };
    if(ts.forEachChild===traversal.children&&ts.isIdentifier===traversal.identifier&&ts.isPropertyAccessExpression===traversal.property) {
      // Original preorder, including duplicate occurrences. Every applicable
      // original predicate/symbol/effect check above runs afresh on every audit.
      for(let occurrence=effectHead;occurrence!==null;occurrence=occurrence.next)visit(occurrence.node);
    } else {
      // A changed compiler helper cannot use a selection made by old helpers.
      const walk=node=>{visit(node);ts.forEachChild(node,walk);};walk(file);
    }
  }
}

export function issueImportedErrorConstructor(handle,path,start,end) {
  const graph=graphs.get(handle);if(!graph)fail('a copied or foreign original constructor graph');
  const module=graph.files.get(path);if(!module||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>module.source.length)fail('invalid original constructor source coordinates');
  const {ts}=graph;let expression;
  const visit=node=>{if(ts.isNewExpression(node)&&node.getStart(module.file)===start&&node.end===end)expression=node;ts.forEachChild(node,visit);};visit(module.file);
  if(!expression||!ts.isIdentifier(expression.expression)||expression.typeArguments?.length||!expression.arguments)fail('an unsupported original constructor expression');
  // Every supported recipe has at most eight parameters. Keep this existing
  // bound ahead of mapping even though its precise arity requires the recipe.
  if(expression.arguments.length>8)fail('unmodeled original constructor extra arguments');
  // Literal syntax can refuse an expression before expensive lexical/class
  // resolution; no constructor capability exists until all following checks.
  const arguments_=expression.arguments.map(arg=>scalar(ts,arg));
  const owner=resolveImport(graph,path,expression.expression),recipe=classRecipe(graph,owner);
  if(expression.arguments.length>recipe.params.length)fail('unmodeled original constructor extra arguments');
  const effective=recipe.params.map((param,index)=>arguments_[index]??param.default??{kind:'undefined'});
  if(effective[recipe.message].kind!=='string')fail('an original Error message without a primitive UTF16 literal contract');
  // Inadmissible arguments cannot issue a capability. Every candidate that
  // survives still performs the complete fresh original effect audit below.
  rejectKnownConstructorEffects(graph,owner);
  const proof=freeze({schema:'original-imported-error-constructor-v1',sources:graph.sources,
    caller:{path,sourceUtf16Sha256:sha(module.source),start,end},
    import:{span:span(owner.statement,module.file),binding:owner.binding.name.text,target:owner.target,exported:owner.klass.name.text},
    original:{sourceUtf16Sha256:sha(owner.original.source),...recipe},arguments:arguments_,
    conditions:{...SOURCE_CONSTRUCTOR_CONDITIONS},runtimeParity:false});
  // Only this exact frozen privately issued proof may retain its genuine
  // graph. Reissuance still recomputes every original recipe and effect check.
  proofGraphs.set(proof,handle);
  const token=Object.freeze({});constructors.set(token,freeze({proof,effective,message:effective[recipe.message],fields:recipe.fields.map(field=>({name:field.name,value:field.value.kind==='parameter'?effective[field.value.index]:field.value}))}));return token;
}

export function originalImportedErrorConstructor(token) {
  const state=constructors.get(token);if(!state)fail('a copied or foreign original constructor capability');return state;
}
export function originalConstructorSourceGraph(handle) {
  const graph=graphs.get(handle);if(!graph)fail('a copied or foreign original constructor graph');
  // Do not expose mutable TypeScript AST nodes, the checker or its symbol maps.
  return graph.sources;
}
export function reissueImportedErrorConstructor(proof) {
  plain(proof);
  if(!proof||typeof proof!=='object')fail('missing original constructor proof');
  // Persisted/copied proofs have no association and reconstruct all sources.
  // Even privately associated proofs join every complete source row to the
  // immutable captured graph before its private syntax/checker can be reused.
  const sources=own(proof,'sources'),associated=proofGraphs.get(proof);
  const graph=associated??createConstructorSourceGraph(sources),captured=originalConstructorSourceGraph(graph);
  if(!isDeepStrictEqual(sources,captured)||JSON.stringify(sources)!==JSON.stringify(captured))fail('constructor proof sources differ from its genuine original graph');
  const caller=own(proof,'caller');
  const token=issueImportedErrorConstructor(graph,own(caller,'path'),own(caller,'start'),own(caller,'end'));
  const expected=originalImportedErrorConstructor(token).proof;
  if(!isDeepStrictEqual(proof,expected)||JSON.stringify(proof)!==JSON.stringify(expected))fail('changed, missing or foreign original constructor proof');
  return token;
}

function semanticClassRecipe(recipe) {
  // Source positions stay in both complete recipes below. Only provenance
  // coordinates differ; every closed executable recipe field compares here.
  return {name:recipe.name,params:recipe.params,message:recipe.message,
    fields:recipe.fields.map(field=>({name:field.name,value:field.value}))};
}

export function observeOriginalImportedErrorConstructorClass(token,reflectedSource) {
  const issued=originalImportedErrorConstructor(token);
  const expected=originalImportedErrorConstructor(reissueImportedErrorConstructor(issued.proof)).proof;
  if(typeof reflectedSource!=='string'||reflectedSource.length*2>4194304)fail('an oversized or foreign reflected constructor class');
  const ts=ownershipCompiler(),name='reflected-constructor-observation.mjs';
  const file=ts.createSourceFile(name,reflectedSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  if(file.parseDiagnostics.length||file.statements.length!==1||!ts.isClassDeclaration(file.statements[0])
    ||file.statements[0].modifiers?.length)fail('an incomplete or effectful reflected constructor class');
  // Reflection receives a fresh syntax/checker view but never a graph handle,
  // source token or constructor capability. Original issuance stays above.
  const files=new Map([[name,{file,source:reflectedSource}]]);
  const observed=closedClassRecipe(ts,file,file.statements[0],constructorSyntaxChecker(ts,files));
  const originalSemantic=semanticClassRecipe(expected.original),reflectedSemantic=semanticClassRecipe(observed);
  if(!isDeepStrictEqual(originalSemantic,reflectedSemantic))fail('original constructor module cache class syntax differs from its checked source');
  let originalSource;
  for(const row of expected.sources)if(row.path===expected.import.target)originalSource=row.source;
  return freeze({schema:'original-constructor-class-observation-v1',originalSource,
    originalClassSource:originalSource.slice(expected.original.span.start,expected.original.span.end),
    reflectedSource,originalRecipe:expected.original,reflectedRecipe:observed,
    originalSemanticRecipe:originalSemantic,reflectedSemanticRecipe:reflectedSemantic,
    recipesEqual:true,sourceProofIssued:false,semanticAuthority:false});
}
