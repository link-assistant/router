// Complete authoritative JS/TS AST and lexical-binding DATA selector. It never
// issues nominal owners. The entire reconstructed native project must recheck.
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw new TypeError('Copied record authoritative target syntax: '+message);};
const ROOT='/__aggregate_copy_target__/';
function parse(ts,path,source,language){
 if(typeof source!=='string'||source.length>2097152||Buffer.byteLength(source)>8388608)fail('complete bounded source required');const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,language==='TypeScript'?ts.ScriptKind.TS:ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete actual native target grammar must parse');return file;
}
function bindingProgram(ts,file,source){
 const host={getSourceFile:name=>name===file.fileName?file:undefined,getDefaultLibFileName:()=>'',writeFile(){fail('selector cannot write compiler output');},getCurrentDirectory:()=>ROOT,getDirectories:()=>[],fileExists:name=>name===file.fileName,readFile:name=>name===file.fileName?source:undefined,getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=> '\n'};
 const program=ts.createProgram([file.fileName],{allowJs:true,checkJs:false,noLib:true,noResolve:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host);if(program.getSourceFile(file.fileName)!==file)fail('native full-source binding program differs');return program.getTypeChecker();
}
function functionCallback(ts,file,checker,plan,budget){
 const declarations=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===plan.target&&node.body);if(declarations.length!==1)fail('one actual whole emitted target function required');const fn=declarations[0],arrows=[];
 const walk=(node,depth=0)=>{if(++budget.nodes>200000||depth>256)fail('complete bounded native AST required');if(ts.isArrowFunction(node))arrows.push(node);ts.forEachChild(node,child=>walk(child,depth+1));};walk(fn.body);
 if(arrows.length!==1||arrows[0].parameters.length!==1||!ts.isIdentifier(arrows[0].parameters[0].name)||!ts.isBlock(arrows[0].body))fail('one canonical emitted owned-map callback required');
 const arrow=arrows[0],call=arrow.parent;
 if(!ts.isCallExpression(call)||call.arguments.length!==2||call.arguments[1]!==arrow||!ts.isIdentifier(call.expression))fail('one canonical lazy map helper invocation required');
 const callee=checker.getSymbolAtLocation(call.expression),decls=callee?.declarations;
 if(!decls||decls.length!==1||!ts.isFunctionDeclaration(decls[0])||decls[0].getSourceFile()!==file||decls[0].name?.text!=='ml_router_map'||call.expression.text!=='ml_router_map')fail('actual original local lazy map helper symbol required');
 const parameter=checker.getSymbolAtLocation(arrow.parameters[0].name);if(!parameter||parameter.declarations?.length!==1||parameter.declarations[0]!==arrow.parameters[0])fail('actual callback parameter lexical identity required');
 return {arrow,parameter};
}
function fieldSlot(ts,file,checker,plan,budget){
 if(plan.kind!=='field')fail('identity supports exact restoration only, without edited semantic slots');
 const {arrow,parameter}=functionCallback(ts,file,checker,plan,budget);
 if(arrow.body.statements.length!==1||!ts.isReturnStatement(arrow.body.statements[0]))fail('ENTIRE owned field callback must be one canonical return');
 let node=arrow.body.statements[0].expression;while(node&&ts.isParenthesizedExpression(node))node=node.expression;
 if(!node||!ts.isPropertyAccessExpression(node)||!ts.isIdentifier(node.name))fail('canonical actual owned field access required');
 let receiver=node.expression;while(ts.isParenthesizedExpression(receiver))receiver=receiver.expression;
 if(!ts.isIdentifier(receiver)||checker.getSymbolAtLocation(receiver)!==parameter)fail('owned field receiver must be the actual callback parameter symbol');
 const field=node.name.text;if(!plan.fields.some(row=>row.name===field))fail('edited field is absent from the freshly checked original record layout');
 return {span:[node.name.getStart(file),node.name.end],field};
}
function masked(source,slots){let at=0,result='';for(const row of slots.slice().sort((left,right)=>left.span[0]-right.span[0])){const [start,end]=row.span;if(start<at||start>=end||end>source.length)fail('nonoverlapping complete target field slots required');result+=source.slice(at,start)+'__OWNED_RECORD_FIELD__';at=end;}return result+source.slice(at);}
export function selectAuthoritativeAggregateFields({source,expected,language,sourcePath,plans}){
 accountPrimitiveVectorIteratorBulkData({source,expected,language,sourcePath,plans});if(!['JavaScript','TypeScript'].includes(language)||typeof sourcePath!=='string'||!Array.isArray(plans)||!plans.length||plans.length>128||source===expected)fail('one genuinely changed complete authoritative target required');
 const ts=ownershipCompiler(),guard=()=>{if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original native TypeScript5.9.3 source/binding runtime changed');};
 return withCompleteSourceClosingFence(()=>{
  guard();for(const value of [source,expected]){const concrete=transportConcreteSyntaxSource(value,{language});if(transportConcreteSyntaxMeta(concrete.meta).source!==value)fail('complete authoritative target CST inverse differs');}
  const path=ROOT+(language==='TypeScript'?'target.mts':'target.mjs'),file=parse(ts,path,source,language),baseline=parse(ts,path,expected,language),checker=bindingProgram(ts,file,source),beforeChecker=bindingProgram(ts,baseline,expected),actual=[],prior=[],functions=[],actualBudget={nodes:0},priorBudget={nodes:0};
  for(const plan of plans){if(plan.kind!=='field')fail('identity functions have no semantic field edit domain');const left=fieldSlot(ts,baseline,beforeChecker,plan,priorBudget),right=fieldSlot(ts,file,checker,plan,actualBudget);if(left.field!==plan.callback.field)fail('baseline exact emitted field differs from freshly checked native source');prior.push(left);actual.push(right);functions.push({qualifiedName:plan.qualifiedName,field:right.field});}
  if(masked(source,actual)!==masked(expected,prior))fail('only the canonical actual field identifier may change in the ENTIRE authoritative target');
  const result={schema:'whole-authoritative-owned-record-field-edits-v1',source,expected,sourcePath,language,functions,slots:actual,sourceAuthority:false,semanticAuthority:false};accountPrimitiveVectorIteratorBulkData(result);return result;
 },[guard]);
}
