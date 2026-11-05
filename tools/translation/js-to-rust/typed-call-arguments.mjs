// Source-only optional-argument substitutions from fresh native binding nodes.
// No public type name, source hash or retained Program supplies a call permit.
export function typedScalarCallArguments(ts,source){
 const fail=message=>{throw new TypeError('Typed portable call arguments: '+message);};
 const path='/__router_typed_calls__/input.ts',file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 if(ts.version!=='5.9.3'||file.parseDiagnostics.length)fail('complete lockfile native source required');
 const options={target:ts.ScriptTarget.Latest,module:ts.ModuleKind.ESNext,noLib:true,noEmit:true,strict:true},host={
  getSourceFile:name=>name===path?file:undefined,getDefaultLibFileName:()=>'/__router_typed_calls__/lib.d.ts',writeFile:()=>fail('native source host cannot emit'),
  getCurrentDirectory:()=>'/__router_typed_calls__',getDirectories:()=>[],fileExists:name=>name===path,readFile:name=>name===path?source:undefined,
  getCanonicalFileName:name=>name,useCaseSensitiveFileNames:()=>true,getNewLine:()=>'\n',
 };
 const program=ts.createProgram({rootNames:[path],options,host}),checker=program.getTypeChecker(),edits=[],calls=[];let nodes=0;
 function visit(node,depth=0){
  if(++nodes>200000||depth>256)fail('bounded complete native call traversal required');
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)){
   const symbol=checker.getSymbolAtLocation(node.expression),declarations=symbol?.declarations?.filter(declaration=>ts.isFunctionDeclaration(declaration)&&declaration.getSourceFile()===file)??[];
   if(declarations.length){
    if(declarations.length!==1)fail('one original local function declaration required');const declaration=declarations[0],parameters=declaration.parameters,supplied=node.arguments.length;
    if(node.arguments.some(ts.isSpreadElement)||parameters.some(parameter=>parameter.dotDotDotToken))fail('spread and rest call lowering remains separate');
    if(supplied>parameters.length||parameters.slice(supplied).some(parameter=>!parameter.questionToken&&!parameter.initializer))fail('original required call argument is missing or excessive');
    const optional=parameters.slice(supplied).some(parameter=>parameter.questionToken);
    if(optional){
     if(node.end<1||source[node.end-1]!==')')fail('native complete call close required');
     const replacement=(supplied&&!node.arguments.hasTrailingComma?', ':' ')+Array.from({length:parameters.length-supplied},()=> 'undefined').join(', ');
     edits.push({span:[node.end-1,node.end-1],expected:'',replacement,kind:'native-source-optional-argument-undefined'});
    }
    calls.push({span:[node.getStart(file),node.end],declarationSpan:[declaration.getStart(file),declaration.end],name:declaration.name.text,supplied,parameters:parameters.length,optionalAppended:optional?parameters.length-supplied:0,sourceAuthority:false,semanticAuthority:false});
   }
  }
  ts.forEachChild(node,child=>{visit(child,depth+1);});
 }
 visit(file);if(file.text!==source)fail('native source changed during call substitution');
 return {edits,calls,sourceAuthority:false,semanticAuthority:false};
}
