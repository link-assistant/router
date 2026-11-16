// Source-only partial-release helper expansion. All behavior remains UNRUN.
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from './js-to-rust/vendor/module-syntax.mjs';
import {ownedPlainData,ownedSourcePath} from './js-to-rust/owned-cancellation-source.mjs';
import {translateHttpResourceCallerJavaScript,translateHttpResourceCallerTypeScript,readHttpResourceCallerMeta} from './js-to-rust/http-resource-callers.mjs';
import {captureHttpResourceCallerInputs} from './js-to-rust/http-resource-caller-source.mjs';
import {translateHttpResourceCallerRust} from './js-to-rust/http-resource-rust.mjs';
import {orderHttpResourceLocalFunctions} from './js-to-rust/http-resource-local-functions.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {sameRustSourceSyntax} from './rust-syntax-cells.mjs';
import {accountPrimitiveVectorIteratorBulkData as accountData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
import {withSourceFailureOperation,withSourceInputValidation} from './source-failure-operations.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
const fail=message=>{throw new TypeError('HTTP outcome-sensitive helper expansion: '+message);};
const concrete=(source,language)=>{const value=transportConcreteSyntaxSource(source,{language});if(transportConcreteSyntaxMeta(value.meta).source!==source)fail('complete serialized/reparsed CST differs');return value;};
function edited(source,changes){let size=source.length;for(const row of changes){size+=row.text.length-(row.end-row.start);if(size>2097152)fail('complete expanded source unit bound');}let result=source,end=source.length;for(const row of [...changes].sort((a,b)=>b.start-a.start)){if(row.start<0||row.end> end||row.end<row.start)fail('complete nonoverlapping original edits required');result=result.slice(0,row.start)+row.text+result.slice(row.end);end=row.start;}return result;}
function select(source,input,language){
 const ts=ownershipCompiler();if(ts.version!=='5.9.3'||!ownershipCompilerRuntimeNativeCurrent(ts))fail('current original lockfile native TypeScript5.9.3 required');
 const cst=concrete(source,language),file=ts.createSourceFile(input.sourcePath,source,ts.ScriptTarget.Latest,true,language==='JavaScript'?ts.ScriptKind.JS:ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('complete original module grammar required');
 if(!Array.isArray(input.helpers)||!input.helpers.length||input.helpers.length>64||new Set(input.helpers).size!==input.helpers.length||input.helpers.some(name=>typeof name!=='string'))fail('unique bounded actual helper names required');
 const imports=new Map(),functions=new Map();let cells=0;
 const tick=()=>{if(++cells>100000)fail('complete helper/source cell bound');};
 for(const item of file.statements){tick();if(ts.isImportDeclaration(item)){
  if(!item.importClause?.namedBindings||!ts.isNamedImports(item.importClause.namedBindings)||item.importClause.name||item.importClause.isTypeOnly)fail('complete named original operation imports required');
  for(const binding of item.importClause.namedBindings.elements){if(imports.has(binding.name.text))fail('duplicate original module binding');imports.set(binding.name.text,binding.propertyName?.text??binding.name.text);}
 }else{if(!ts.isFunctionDeclaration(item)||!item.name||!item.body||functions.has(item.name.text)||imports.has(item.name.text))fail('complete ordinary named function module required');functions.set(item.name.text,item);}}
 const groups=orderHttpResourceLocalFunctions(ts,[...functions.values()],{groups:true});if(groups.some(group=>group.recursive))fail('cycles require a separate original effect rule');
 const chosen=new Map();
 for(const name of input.helpers){
  const fn=functions.get(name);if(!fn||fn.modifiers?.some(row=>row.kind!==ts.SyntaxKind.ExportKeyword)||fn.asteriskToken||fn.typeParameters?.length||fn.parameters.length>64)fail('ordinary synchronous leaf helper required');
  const parameters=fn.parameters.map(row=>{if(!ts.isIdentifier(row.name)||row.initializer||row.questionToken||row.dotDotDotToken)fail('ordinary required helper parameter');return row.name.text;});
  const allowed=new Set([...parameters,...imports.keys()]);let returns=0;
  function walk(node,depth=0){tick();if(depth>160)fail('complete helper depth bound');
   if(ts.isReturnStatement(node)){if(node.expression?.kind!==ts.SyntaxKind.TrueKeyword&&node.expression?.kind!==ts.SyntaxKind.FalseKeyword)fail('helper returns must be literal Boolean outcomes');returns++;return;}
   if(ts.isVariableStatement(node)||ts.isFunctionDeclaration(node)||ts.isArrowFunction(node)||ts.isAwaitExpression(node)||ts.isPropertyAccessExpression(node)||ts.isElementAccessExpression(node)||ts.isBinaryExpression(node)&&node.operatorToken.kind>=ts.SyntaxKind.FirstAssignment&&node.operatorToken.kind<=ts.SyntaxKind.LastAssignment||ts.isPrefixUnaryExpression(node)&&[ts.SyntaxKind.PlusPlusToken,ts.SyntaxKind.MinusMinusToken].includes(node.operator)||ts.isPostfixUnaryExpression(node))fail('helper declarations captures mutation properties and suspension require another complete rule');
   if(ts.isCallExpression(node)&&(!ts.isIdentifier(node.expression)||!imports.has(node.expression.text)))fail('only actual direct imported operations may appear in a leaf helper');
   if(ts.isIdentifier(node)&&!allowed.has(node.text))fail('unproved helper capture or local binding');
   ts.forEachChild(node,child=>walk(child,depth+1));
  }
  for(const statement of fn.body.statements)walk(statement);if(!returns)fail('complete helper outcomes required');chosen.set(name,{fn,parameters});
 }
 const sites=[],changes=[],seenHelpers=new Set();let retainedUnits=source.length;
 for(const [callerName,fn]of functions){if(chosen.has(callerName))continue;
  let body=fn.body;
  if(body.statements.length===1&&ts.isReturnStatement(body.statements[0])){
   const call=body.statements[0].expression;
   if(call&&ts.isCallExpression(call)&&ts.isIdentifier(call.expression)&&imports.get(call.expression.text)==='deferFilesystemFlow'){
    const callback=call.arguments[0];if(call.arguments.length!==1||!ts.isArrowFunction(callback)||callback.parameters.length||!ts.isBlock(callback.body)||callback.modifiers?.length!==1||callback.modifiers[0].kind!==ts.SyntaxKind.AsyncKeyword)fail('complete original cold wrapper required');body=callback.body;
   }
  }
  for(const statement of body.statements){if(!ts.isIfStatement(statement)||!ts.isCallExpression(statement.expression)||!ts.isIdentifier(statement.expression.expression)||!chosen.has(statement.expression.expression.text))continue;
   if(statement!==body.statements.at(-1)||!statement.elseStatement)fail('selected helper condition requires both complete terminal caller branches');
   const terminal=branch=>ts.isReturnStatement(branch)||ts.isBlock(branch)&&ts.isReturnStatement(branch.statements.at(-1));if(!terminal(statement.thenStatement)||!terminal(statement.elseStatement))fail('both caller continuations must end in their original return');
   const call=statement.expression,helper=chosen.get(call.expression.text),parameters=new Set(fn.parameters.filter(row=>ts.isIdentifier(row.name)).map(row=>row.name.text));
   if(call.typeArguments?.length||call.arguments.length!==helper.parameters.length)fail('complete actual helper arity required');
   const argumentsData=call.arguments.map(argument=>{if(ts.isIdentifier(argument)&&parameters.has(argument.text))return {kind:'parameter',name:argument.text,source:argument.getText(file)};if(argument.kind===ts.SyntaxKind.TrueKeyword||argument.kind===ts.SyntaxKind.FalseKeyword)return {kind:'literal',type:'bool',source:argument.getText(file)};if(ts.isStringLiteral(argument))return {kind:'literal',type:'str',source:argument.getText(file)};fail('helper arguments must be actual caller inputs or closed literals');});
   const identifiers=argumentsData.filter(row=>row.kind==='parameter').map(row=>row.name);if(new Set(identifiers).size!==identifiers.length)fail('repeated helper arguments require a separate alias proof');
   const replacements=new Map(helper.parameters.map((name,index)=>[name,argumentsData[index].source])),edits=[],helperText=helper.fn.body.getText(file),yesText=statement.thenStatement.getText(file),noText=statement.elseStatement.getText(file);let expandedUnits=helperText.length;
   const retain=change=>{expandedUnits+=change.text.length-(change.end-change.start);if(expandedUnits>2097152)fail('complete helper continuation expansion bound');edits.push(change);};
   function substitute(node){tick();if(ts.isReturnStatement(node)){retain({start:node.getStart(file)-helper.fn.body.getStart(file),end:node.end-helper.fn.body.getStart(file),text:node.expression.kind===ts.SyntaxKind.TrueKeyword?yesText:noText});return;}
    if(ts.isIdentifier(node)&&replacements.has(node.text))retain({start:node.getStart(file)-helper.fn.body.getStart(file),end:node.end-helper.fn.body.getStart(file),text:'('+replacements.get(node.text)+')'});ts.forEachChild(node,substitute);
   }
   substitute(helper.fn.body);const replacement=edited(helperText,edits);retainedUnits+=replacement.length;if(retainedUnits>4194304)fail('complete retained helper projection source bound');
   changes.push({start:statement.getStart(file),end:statement.end,text:replacement});sites.push({caller:callerName,helper:call.expression.text,arguments:argumentsData,original:statement.getText(file),replacement});seenHelpers.add(call.expression.text);
  }
 }
 if(!sites.length||sites.length>64||seenHelpers.size!==chosen.size)fail('complete nonempty bounded actual helper/caller selection required');
 const helperSource=file.statements.filter(item=>ts.isImportDeclaration(item)||ts.isFunctionDeclaration(item)&&chosen.has(item.name.text)).map(item=>source.slice(item.getFullStart(),item.end)).join('\n');
 const canonical=edited(source,changes);concrete(canonical,language);if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original native syntax runtime changed');
 return {original:source,canonical,helperSource,sites,originalConcreteSyntax:cst.meta,canonicalConcreteSyntax:concrete(canonical,language).meta};
}
function translate(source,input,language){return withSourceFailureOperation(()=>withSourceInputValidation(()=>{
 const data=ownedPlainData(input),keys=['sourcePath','rustPath','runtimeRoot','declarationRoot','files','helpers'];if(Object.keys(data).sort().join('\0')!==keys.sort().join('\0'))fail('complete closed helper source input required');ownedSourcePath(data.sourcePath);ownedSourcePath(data.rustPath);if(!/\.(mjs|mts)$/u.test(data.sourcePath)||!data.rustPath.endsWith('.rs'))fail('actual paired caller/native paths required');
 const original=captureHttpResourceCallerInputs({sourcePath:data.sourcePath,runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot,files:data.files});if(original.callerSource!==source)fail('complete actual original caller source differs');
 const javascriptPath=data.sourcePath.replace(/\.mts$/u,'.mjs'),typescriptPath=javascriptPath.replace(/\.mjs$/u,'.mts');
 const at=(path,text,extra=[])=>({sourcePath:path,runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot,files:data.files.filter(row=>row.path!==path&&!extra.some(add=>add.path===row.path)).concat([{path,source:text}],extra)});
 const check=(text,path,kind)=>kind==='JavaScript'?translateHttpResourceCallerJavaScript(text,at(path,text)):translateHttpResourceCallerTypeScript(text,at(path,text));
 return withCompleteSourceClosingFence(()=>{
  const run=createRulePipeline([
   {phase:'language',rules:[
    {id:'language:select-complete-original-leaf-helper-graph-and-outcome-continuations',apply:()=>select(source,data,language)},
    {id:'language:check-every-original-helper-body-and-each-complete-expanded-caller',apply:projection=>{
     const helpers=check(projection.helperSource,data.sourcePath,language);readHttpResourceCallerMeta(helpers.meta,projection.helperSource,at(data.sourcePath,projection.helperSource),{language});
     const checked=check(projection.canonical,data.sourcePath,language);readHttpResourceCallerMeta(checked.meta,projection.canonical,at(data.sourcePath,projection.canonical),{language});
     const helperRows=JSON.parse(helpers.meta).functions,callerRows=JSON.parse(checked.meta).functions;
     for(const site of projection.sites){const helper=helperRows.find(row=>row.name===site.helper),caller=callerRows.find(row=>row.name===site.caller);if(!helper||!caller||helper.lazy||helper.returns!=='bool')fail('fresh original synchronous Boolean helper required');
      for(let index=0;index<site.arguments.length;index++){const argument=site.arguments[index],actual=argument.kind==='literal'?argument.type:caller.parameters.find(row=>row.name===argument.name)?.type;if(actual!==helper.parameters[index].type)fail('actual original helper/caller argument domains differ');}
     }
     return {projection,helpers,checked};
    }},
    {id:'language:reissue-paired-targets-and-complete-canonical-Rust-inverse',apply:value=>{
     const result=value.checked,pairedJS=check(result.javascript,javascriptPath,'JavaScript'),pairedTS=check(result.typescript,typescriptPath,'TypeScript');
     const reverse=translateHttpResourceCallerRust(result.rust,{sourcePath:data.rustPath,javascriptPath,runtimeRoot:data.runtimeRoot,declarationRoot:data.declarationRoot,files:at(javascriptPath,result.javascript,[{path:data.rustPath,source:result.rust}]).files});
     if(![pairedJS,pairedTS,reverse].every(row=>sameRustSourceSyntax(row.rust,result.rust)))fail('whole canonical paired/native helper inverse differs');return {...value,pairedJS,pairedTS,reverse};
    }},
   ]},
   {phase:'repository',rules:[{id:'repository:retain-full-original-helper-caller-proposals-and-source-inverses',apply:value=>({
    schema:'router-http-helper-bulk-20261101-v1',...value,equations:transportConcreteSourceEquations([{before:source,after:value.projection.helperSource,language},{before:source,after:value.projection.canonical,language}]),
    sources:{original:source,JavaScript:value.checked.javascript,TypeScript:value.checked.typescript,Rust:value.checked.rust},
    sourceAuthority:false,semanticAuthority:false,runtimeParity:false,receivingExecuted:false,rustExecuted:false,crossInvocationCache:false,wholeRouterSynchronization:false,asynchronousHelperInlining:false,originalBodyEquivalenceQualified:false,
   })}]},
  ]).run(null);const output={...run.value,trace:run.trace};accountData(output);return output;
 },[()=>withSourceInputValidation(()=>original.current())]);
}));}
export const translateHttpHelperBulkJavaScript=(source,input)=>translate(source,input,'JavaScript');
export const translateHttpHelperBulkTypeScript=(source,input)=>translate(source,input,'TypeScript');
