// Complete authoritative JS/TS AST and lexical-binding DATA selector. It never
// issues nominal owners. The entire reconstructed native project must recheck.
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {accountPrimitiveVectorIteratorBulkData} from './primitive-vector-iterator-bulk-20261101-accounting.mjs';
const fail=message=>{throw new TypeError('Nominal authoritative target syntax: '+message);};
const ROOT='/__nominal_edited_target__/';
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
function leaves(ts,file,checker,plan,budget){
 const {arrow,parameter}=functionCallback(ts,file,checker,plan,budget),result=[];
 const leaf=statement=>{
  if(!ts.isReturnStatement(statement)||!statement.expression)fail('canonical owned callback branch return required');const node=statement.expression;
  if(plan.output==='bool'){if(![ts.SyntaxKind.TrueKeyword,ts.SyntaxKind.FalseKeyword].includes(node.kind))fail('only canonical Boolean predicate branch values may change');return {span:[node.getStart(file),node.end],leaf:{kind:'bool',value:node.kind===ts.SyntaxKind.TrueKeyword}};}
  if(!ts.isCallExpression(node)||!ts.isPropertyAccessExpression(node.expression)||!ts.isIdentifier(node.expression.expression)||node.expression.expression.text!=='Object'||node.expression.name.text!=='freeze'||checker.getSymbolAtLocation(node.expression.expression)!==undefined||node.arguments.length!==1||!ts.isObjectLiteralExpression(node.arguments[0]))fail('canonical unshadowed emitted immutable unit constructor required');
  const properties=node.arguments[0].properties;if(properties.length!==1||!ts.isPropertyAssignment(properties[0])||properties[0].name.getText(file)!=='$'||!ts.isStringLiteral(properties[0].initializer))fail('one exact emitted unit discriminant field required');
  const value=properties[0].initializer;if(!plan.variants.includes(value.text))fail('edited variant is not even a candidate in the fresh actual owner census');return {span:[value.getStart(file),value.end],leaf:{kind:'variant',variant:value.text}};
 };
 if(plan.callback.kind==='constant'){if(arrow.body.statements.length!==1)fail('entire canonical constant callback body required');result.push(leaf(arrow.body.statements[0]));}
 else{
  if(arrow.body.statements.length!==1||!ts.isSwitchStatement(arrow.body.statements[0]))fail('entire canonical owned unit match callback required');const statement=arrow.body.statements[0],subject=statement.expression;
  if(!ts.isPropertyAccessExpression(subject)||subject.name.text!=='$'||!ts.isIdentifier(subject.expression)||checker.getSymbolAtLocation(subject.expression)!==parameter)fail('owned match must inspect its exact callback parameter');
  const clauses=statement.caseBlock.clauses,cases=clauses.filter(ts.isCaseClause),defaults=clauses.filter(ts.isDefaultClause);
  if(cases.length!==plan.callback.cases.length||defaults.length!==1||clauses.at(-1)!==defaults[0])fail('complete original owned constructor match/default census required');
  cases.forEach((clause,index)=>{if(!ts.isStringLiteral(clause.expression)||clause.expression.text!==plan.callback.cases[index].variant||clause.statements.length!==1||!ts.isBlock(clause.statements[0])||clause.statements[0].statements.length!==1)fail('complete fixed owned match branch pattern/body required');result.push(leaf(clause.statements[0].statements[0]));});
  // The canonical default throw is not an editable leaf. Full source masking
  // below retains every byte, including runtime refusal behavior and imports.
 }
 return result;
}
function masked(source,slots){let at=0,result='';for(const row of slots.slice().sort((left,right)=>left.span[0]-right.span[0])){const [start,end]=row.span;if(start<at||start>=end||end>source.length)fail('nonoverlapping full target literal slots required');result+=source.slice(at,start)+'__NOMINAL_EDITED_VALUE__';at=end;}return result+source.slice(at);}
export function selectAuthoritativeNominalEdits({source,expected,language,sourcePath,plans}){
 accountPrimitiveVectorIteratorBulkData({source,expected,language,sourcePath,plans});if(!['JavaScript','TypeScript'].includes(language)||typeof sourcePath!=='string'||!Array.isArray(plans)||!plans.length||plans.length>128||source===expected)fail('one genuinely edited complete fixed-language target and bounded selection required');
 const ts=ownershipCompiler(),guard=()=>{if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original native TypeScript5.9.3 source/binding runtime changed');};
 return withCompleteSourceClosingFence(()=>{
  guard();for(const value of [source,expected]){const concrete=transportConcreteSyntaxSource(value,{language});if(transportConcreteSyntaxMeta(concrete.meta).source!==value)fail('complete authoritative target CST inverse differs');}const file=parse(ts,ROOT+(language==='TypeScript'?'target.mts':'target.mjs'),source,language),baseline=parse(ts,ROOT+(language==='TypeScript'?'baseline.mts':'baseline.mjs'),expected,language),checker=bindingProgram(ts,file,source),beforeChecker=bindingProgram(ts,baseline,expected),actualSlots=[],priorSlots=[],functions=[],actualBudget={nodes:0},priorBudget={nodes:0};
  for(const plan of plans){const actual=leaves(ts,file,checker,plan,actualBudget),prior=leaves(ts,baseline,beforeChecker,plan,priorBudget);if(actual.length!==prior.length)fail('complete edited leaf census differs');actualSlots.push(...actual);priorSlots.push(...prior);functions.push({qualifiedName:plan.qualifiedName,leaves:actual.map(row=>row.leaf)});}
  if(masked(source,actualSlots)!==masked(expected,priorSlots))fail('only canonical unit constructor/predicate branch literal values may change in the entire source');
  const result={schema:'complete-authoritative-nominal-value-edits-v1',source,expected,sourcePath,language,functions,slots:actualSlots.map(row=>({span:row.span,leaf:row.leaf})),sourceAuthority:false,semanticAuthority:false};accountPrimitiveVectorIteratorBulkData(result);return result;
 },[guard]);
}
