// Native edited-target binding/skeleton/expression DATA. No source permission:
// the reconstructed application must pass the original complete private issuer.
import {posix} from 'node:path';
import {ownershipCompiler,ownershipCompilerRuntimeNativeCurrent} from './js-to-rust/vendor/module-syntax.mjs';
const fail=message=>{throw new TypeError('Scalar linear edited source syntax: '+message);};
const ROOT='/__scalar_linear_edit__';
function parse(ts,path,source){
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,path.endsWith('.mjs')?ts.ScriptKind.JS:ts.ScriptKind.TS);if(file.parseDiagnostics.length)fail('complete actual native source grammar required');
 let cells=0;const visit=(node,depth=0)=>{if(++cells>100000||depth>160)fail('complete native source cell/depth bound');ts.forEachChild(node,child=>visit(child,depth+1));};visit(file);return file;
}
function declarations(ts,file){
 return file.statements.filter(ts.isFunctionDeclaration).map(fn=>{
  const stages=fn.body?.statements.filter(ts.isVariableStatement).map(statement=>{
   if(statement.declarationList.declarations.length!==1)fail('one canonical stage local required');
   const call=statement.declarationList.declarations[0].initializer;
   if(!call||!ts.isCallExpression(call)||call.arguments.length!==5||!ts.isArrowFunction(call.arguments[4]))fail('complete canonical stage call required');
   const arrow=call.arguments[4];if(arrow.parameters.length!==1||!ts.isIdentifier(arrow.parameters[0].name)||ts.isBlock(arrow.body))fail('canonical scalar expression callback required');return {call,arrow};
  });
  if(!fn.name||!fn.body||!stages?.length)fail('complete canonical specialized function required');return {name:fn.name.text,fn,stages};
 });
}
function skeleton(source,file,rows){
 const spans=rows.flatMap(row=>row.stages.map(stage=>[stage.arrow.body.getStart(file),stage.arrow.body.end])).sort((a,b)=>a[0]-b[0]);let at=0;const parts=[];
 for(const [start,end]of spans){if(start<at)fail('nonoverlapping complete callback spans required');parts.push(source.slice(at,start),'__SCALAR_EDIT_CALLBACK_BODY__');at=end;}parts.push(source.slice(at));return parts.join('');
}
function nativeBindings(ts,file,source,path,data){
 const files=new Map();let bytes=0;
 for(const row of data.files){bytes+=Buffer.byteLength(row.source);if(bytes>16777216||files.size>=4096)fail('complete current in-memory source closure bound');files.set(posix.join(ROOT,row.path),row.source);}
 const actual=posix.join(ROOT,path),prior=files.get(actual);bytes+=Buffer.byteLength(source)-(prior===undefined?0:Buffer.byteLength(prior));if(bytes>16777216||prior===undefined&&files.size>=4096)fail('complete authoritative edited source closure bound');files.set(actual,source);const syntax=new Map([[actual,file]]);
 const read=name=>files.get(name),resolve=(name,containing)=>{
  if(!name.startsWith('.'))return undefined;const base=posix.normalize(posix.join(posix.dirname(containing),name));
  if(!base.startsWith(ROOT+'/'))return undefined;
  const candidates=base.endsWith('.mjs')?[base.slice(0,-4)+'.d.mts',base]:[base];
  const selected=candidates.find(path=>files.has(path));return selected?{resolvedFileName:selected,extension:selected.endsWith('.d.mts')?ts.Extension.Dmts:selected.endsWith('.mjs')?ts.Extension.Mjs:ts.Extension.Mts,isExternalLibraryImport:false}:undefined;
 };
 const host={getSourceFile(name){if(!files.has(name))return undefined;if(!syntax.has(name))syntax.set(name,parse(ts,name,read(name)));return syntax.get(name);},getDefaultLibFileName:()=>'',writeFile(){fail('native candidate binding must not write files');},getCurrentDirectory:()=>ROOT,getDirectories:()=>[],fileExists:name=>files.has(name),readFile:read,useCaseSensitiveFileNames:()=>true,getCanonicalFileName:name=>name,getNewLine:()=> '\n',resolveModuleNames:(names,containing)=>names.map(name=>resolve(name,containing))};
 const program=ts.createProgram([actual],{allowJs:true,checkJs:false,noLib:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.NodeNext,moduleResolution:ts.ModuleResolutionKind.NodeNext},host),checker=program.getTypeChecker(),bindings=new Map();
 if(program.getSourceFile(actual)!==file)fail('actual original target native syntax association differs');
 for(const statement of file.statements.filter(ts.isImportDeclaration)){
  if(!ts.isStringLiteral(statement.moduleSpecifier)||!statement.importClause?.namedBindings||!ts.isNamedImports(statement.importClause.namedBindings)||statement.importClause.name||statement.importClause.isTypeOnly)fail('actual named value imports required');
  const resolved=resolve(statement.moduleSpecifier.text,actual);if(!resolved)fail('actual current imported source missing');
  const kernel=resolved.resolvedFileName===posix.join(ROOT,data.runtimeRoot,'scalar-linear-kernel-20261101-runtime.d.mts')||resolved.resolvedFileName===posix.join(ROOT,data.declarationRoot,'scalar-linear-kernel-20261101-runtime.d.mts'),operator=resolved.resolvedFileName===posix.join(ROOT,data.runtimeRoot,'primitive-operator-runtime.d.mts')||resolved.resolvedFileName===posix.join(ROOT,data.declarationRoot,'primitive-operator-runtime.d.mts');
  if(!kernel&&!operator)fail('only genuine current kernel and primitive operator sources may bind');
  for(const entry of statement.importClause.namedBindings.elements){
   const exported=(entry.propertyName??entry.name).text,symbol=checker.getSymbolAtLocation(entry.name);if(!symbol||!(symbol.flags&ts.SymbolFlags.Alias))fail('actual original native import alias required');const owner=checker.getAliasedSymbol(symbol),declarations=owner?.declarations;
   if(entry.isTypeOnly||!symbol||!declarations?.length||declarations.some(node=>node.getSourceFile().fileName!==resolved.resolvedFileName||node.name?.text!==exported)||bindings.has(entry.name.text)||kernel&&exported!=='scalarLinearStage'||operator&&!['integerArithmetic','primitiveBitwise','primitiveNot','integerShift'].includes(exported))fail('actual original import symbol/export declaration differs');
   bindings.set(entry.name.text,{symbol,exported,kernel});
  }
 }
 return {checker,bindings};
}
function originalCallbacks(ts,file,selection){
 const functions=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===selection.function&&node.body);if(functions.length!==1)fail('one complete original selected application function required');
 const statements=functions[0].body.statements.filter(ts.isVariableStatement).filter(statement=>statement.declarationList.declarations.some(binding=>ts.isIdentifier(binding.name)&&binding.name.text===selection.local));
 if(statements.length!==1||statements[0].declarationList.declarations.length!==1)fail('one complete original chain binding required');
 const stages=[];let node=statements[0].declarationList.declarations[0].initializer;
 while(node&&ts.isCallExpression(node)){
  if(!ts.isPropertyAccessExpression(node.expression)||!['map','filter'].includes(node.expression.name.text)||node.arguments.length!==1||!ts.isArrowFunction(node.arguments[0]))fail('complete original source-backed map/filter chain required');
  const arrow=node.arguments[0];if(arrow.parameters.length!==1||!ts.isIdentifier(arrow.parameters[0].name)||ts.isBlock(arrow.body))fail('complete original scalar callback binding required');stages.push(arrow);node=node.expression.expression;
 }
 if(stages.length!==selection.domains.length)fail('complete original source stage census differs');return stages.reverse();
}
export function planEditedScalarLinearBridge({source,sourcePath,expected,originalSource,originalPath,data,functions,selections}){
 const ts=ownershipCompiler();if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original native compiler runtime changed');
 const actualPath=posix.join(ROOT,sourcePath),file=parse(ts,actualPath,source),baseline=parse(ts,actualPath,expected),rows=declarations(ts,file),beforeRows=declarations(ts,baseline);
 if(rows.length!==functions.length||beforeRows.length!==functions.length||skeleton(source,file,rows)!==skeleton(expected,baseline,beforeRows))fail('only scalar callback bodies inside the exact original stage/import/signature skeleton may change');
 const {checker,bindings}=nativeBindings(ts,file,source,sourcePath,data),original=parse(ts,posix.join(ROOT,originalPath),originalSource),edits=[];let cells=0;
 for(const row of rows){
  const plans=functions.filter(plan=>plan.javascript===row.name),requests=selections.filter(request=>request.function===row.name);if(plans.length!==1||requests.length!==1)fail('one freshly qualified original function and selection required');
  const plan=plans[0],arrows=originalCallbacks(ts,original,requests[0]);if(row.stages.length!==plan.stages.length||arrows.length!==plan.stages.length)fail('original and edited complete stage counts differ');
  row.stages.forEach(({call,arrow},index)=>{
   const stage=plan.stages[index],callee=ts.isIdentifier(call.expression)&&bindings.get(call.expression.text);if(!callee?.kernel||checker.getSymbolAtLocation(call.expression)!==callee.symbol)fail('actual current stage import binding required');
   const parameter=checker.getSymbolAtLocation(arrow.parameters[0].name);if(!parameter)fail('actual current callback parameter symbol required');
   const originalArrow=arrows[index],name=originalArrow.parameters[0].name.text,numericDomain=stage.inputDomain==='bool'?stage.domain:stage.inputDomain,numeric=numericDomain!=='bool',bits=numeric?Number(numericDomain.slice(1)):null,signed=numeric?numericDomain[0]==='i':null;
   const unwrap=node=>{let depth=0;while(ts.isParenthesizedExpression(node)){if(++depth>160)fail('bounded scalar parentheses required');node=node.expression;}return node;};
   const width=(node,value)=>{node=unwrap(node);return value===null?node.kind===ts.SyntaxKind.NullKeyword:typeof value==='boolean'?node.kind===(value?ts.SyntaxKind.TrueKeyword:ts.SyntaxKind.FalseKeyword):ts.isNumericLiteral(node)&&node.text===String(value);};
   const text=node=>{node=unwrap(node);return ts.isStringLiteral(node)?node.text:null;};
   function expression(node,depth=0){
    if(++cells>100000||depth>160)fail('bounded complete edited scalar expression required');node=unwrap(node);
    if(ts.isIdentifier(node)){if(checker.getSymbolAtLocation(node)!==parameter)fail('edited scalar callback capture refused');return name;}
    if(ts.isBigIntLiteral(node)||node.kind===ts.SyntaxKind.TrueKeyword||node.kind===ts.SyntaxKind.FalseKeyword)return node.getText(file);
    if(ts.isPrefixUnaryExpression(node)&&[ts.SyntaxKind.MinusToken,ts.SyntaxKind.ExclamationToken].includes(node.operator))return '('+(node.operator===ts.SyntaxKind.MinusToken?'-':'!')+expression(node.operand,depth+1)+')';
    if(ts.isConditionalExpression(node))return '('+expression(node.condition,depth+1)+'?'+expression(node.whenTrue,depth+1)+':'+expression(node.whenFalse,depth+1)+')';
    if(ts.isBinaryExpression(node)&&['===','!==','<','<=','>','>=','&&','||'].includes(node.operatorToken.getText(file)))return '('+expression(node.left,depth+1)+' '+node.operatorToken.getText(file)+' '+expression(node.right,depth+1)+')';
    if(!ts.isCallExpression(node)||!ts.isIdentifier(node.expression)||node.questionDotToken||node.typeArguments?.length||node.arguments.some(ts.isSpreadElement))fail('edited effects unknown calls writes references or suspension refused');
    const binding=bindings.get(node.expression.text);if(!binding||binding.kernel||checker.getSymbolAtLocation(node.expression)!==binding.symbol)fail('edited operator requires its actual current original import symbol');
    const args=node.arguments;
    if(binding.exported==='integerArithmetic'){
     const operation=args.length===5&&text(args[4]),operators={add:'+',sub:'-',mul:'*',div:'/',rem:'%'};
     if(!numeric||args.length!==5||!width(args[2],bits)||!width(args[3],signed))fail('edited arithmetic candidate width/sign differs from fixed current domains');
     if(operation==='neg'){if(signed!==true||!width(args[1],null))fail('actual signed unary arithmetic profile required');return '(-'+expression(args[0],depth+1)+')';}
     if(!Object.hasOwn(operators,operation))fail('finite checked arithmetic edit required');return '('+expression(args[0],depth+1)+' '+operators[operation]+' '+expression(args[1],depth+1)+')';
    }
    if(binding.exported==='primitiveNot'){if(!numeric||args.length!==3||!width(args[1],bits)||!width(args[2],signed))fail('fixed original complement domain required');return '(~'+expression(args[0],depth+1)+')';}
    if(binding.exported==='primitiveBitwise'){const operation=args.length===5&&text(args[2]);if(!['&','|','^'].includes(operation)||!width(args[3],bits)||!width(args[4],signed))fail('fixed original eager bitwise domain required');return '('+expression(args[0],depth+1)+' '+operation+' '+expression(args[1],depth+1)+')';}
    if(binding.exported==='integerShift'){const operation=args.length===7&&text(args[6]);if(!numeric||!['<<','>>'].includes(operation)||!width(args[2],bits)||!width(args[3],signed)||!width(args[4],bits)||!width(args[5],signed))fail('fixed original shift value/count domains required');return '('+expression(args[0],depth+1)+' '+operation+' '+expression(args[1],depth+1)+')';}
    fail('unsupported edited scalar operator');
   }
   const start=originalArrow.body.getStart(original),end=originalArrow.body.end;edits.push({span:[start,end],expected:originalSource.slice(start,end),replacement:expression(arrow.body)});
  });
 }
 if(!ownershipCompilerRuntimeNativeCurrent(ts))fail('original native compiler runtime changed');return {edits,functions:rows.map(row=>({name:row.name,stages:row.stages.length})),nativeOriginalImportSymbolsJoined:true,sourceAuthority:false,semanticAuthority:false};
}
