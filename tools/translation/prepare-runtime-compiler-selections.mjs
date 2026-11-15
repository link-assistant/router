// Source preparation only: collect the same fresh native AST candidates once.
// Original uniqueness, native binding and whole-source checks remain consumers.
export function proposeRuntimeCompilerSelections(ts,path,source){
 const fail=message=>{throw TypeError('Runtime compiler selection source: '+message);};
 if(ts.version!=='5.9.3'||typeof path!=='string'||typeof source!=='string')fail('installed compiler and complete primitive source required');
 const parse=text=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;};
 const file=parse(source),one=(rows,label)=>{if(rows.length!==1)fail('unique complete '+label+' required');return rows[0];};
 const find=(node,predicate)=>{const rows=[];function visit(value){if(predicate(value))rows.push(value);ts.forEachChild(value,visit);}visit(node);return rows;};
 const fn=name=>one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),name);
 const lazy=fn('nativeLazyAssertions'),owner=fn('prepareOwnedRuntimeImportEdges');
 if(lazy.parameters.length!==2||lazy.parameters.map(node=>node.getText(file)).join(',')!=='ts,file')fail('complete lazy parameters differ');
 const calls=(node,argument)=>find(node,value=>ts.isCallExpression(value)&&ts.isIdentifier(value.expression)&&value.expression.text==='find'&&value.arguments.length===3&&value.arguments[0].getText(file)==='ts'&&value.arguments[1].getText(file)===argument);
 const lazyCalls=calls(lazy,'file'),parentCalls=calls(owner,'compilerFile');
 if(lazyCalls.length!==3||parentCalls.length!==2)fail('complete compiler selection domain differs');
 const [helper,exports,module]=lazyCalls,[parent,table]=parentCalls;
 const predicate=call=>{const node=call.arguments[2];if(!ts.isArrowFunction(node)||node.parameters.length!==1||!ts.isIdentifier(node.parameters[0].name))fail('complete native predicate differs');return node;};
 const helperPredicate=predicate(helper),exportPredicate=predicate(exports),modulePredicate=predicate(module),parentPredicate=predicate(parent),tablePredicate=predicate(table);
 if(helperPredicate.getText(file)!=="node=>ts.isFunctionDeclaration(node)&&node.name?.text==='shouldAssertFunction'"||parentPredicate.getText(file)!=="value=>ts.isFunctionDeclaration(value)&&value.name?.text===name")fail('complete function-name predicate differs');
 if(exportPredicate.parameters[0].name.text!=='node'||modulePredicate.parameters[0].name.text!=='node'||tablePredicate.parameters[0].name.text!=='node')fail('complete collector predicate scope differs');
 const moduleBody=modulePredicate.body;
 if(!ts.isBinaryExpression(moduleBody)||moduleBody.operatorToken.kind!==ts.SyntaxKind.AmpersandAmpersandToken||moduleBody.right.getText(file)!=='binding(node.right.arguments[0])===binding(exportCall.arguments[0])')fail('complete native module binding join differs');
 const declaration=one(find(owner,node=>ts.isVariableDeclaration(node)&&ts.isIdentifier(node.name)&&node.name.text==='lazy'),'lazy declaration');
 if(declaration.getText(file)!=='lazy=nativeLazyAssertions(ts,compilerFile)')fail('complete fresh native lazy call differs');
 const edits=[];
 const select=(node,replacement,kind)=>edits.push({kind,span:[node.getStart(file),node.end],expected:node.getText(file),replacement});
 select(helper,"(selections.functions.get('shouldAssertFunction')??[])",'all-original-lazy-helper-candidates');
 select(exports,'selections.exportCalls','all-original-export-candidates');
 select(module,'selections.moduleExports.filter('+modulePredicate.getText(file)+')','original-fresh-native-binding-filter');
 select(parent,'(selections.functions.get(name)??[])','all-original-parent-function-candidates');
 select(table,'selections.childTables','all-original-child-table-candidates');
 select(declaration,'selections=nativeCompilerSelections(ts,compilerFile),lazy=nativeLazyAssertions(ts,compilerFile,selections)','one-fresh-complete-compiler-walk');
 edits.push({kind:'private-call-local-selection-parameter',span:[lazy.parameters[1].end,lazy.parameters[1].end],expected:'',replacement:',selections'});
 const addition=`
// Call-local candidates only. No AST, diagnostic or verdict survives this call.
function nativeCompilerSelections(ts,file){
 const functions=new Map(),childTables=[],exportCalls=[],moduleExports=[];
 function visit(node){
  if(ts.isFunctionDeclaration(node)&&node.name){const name=node.name.text,rows=functions.get(name)??[];rows.push(node);functions.set(name,rows);}
  if(${tablePredicate.body.getText(file)})childTables.push(node);
  if(${exportPredicate.body.getText(file)})exportCalls.push(node);
  if(${moduleBody.left.getText(file)})moduleExports.push(node);
  ts.forEachChild(node,visit);
 }
 visit(file);return {functions,childTables,exportCalls,moduleExports};
}
`;
 edits.push({kind:'private-original-predicate-collector',span:[source.length,source.length],expected:'',replacement:addition});
 let after=source,last=source.length;
 for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
  if(edit.span[1]>last||after.slice(...edit.span)!==edit.expected)fail('complete original native span differs');
  after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);last=edit.span[0];
 }
 parse(after);
 let shift=0,inverse=after;
 const mapped=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(edit=>{const start=edit.span[0]+shift;shift+=edit.replacement.length-edit.expected.length;return {...edit,start};});
 for(const edit of mapped.reverse()){
  if(inverse.slice(edit.start,edit.start+edit.replacement.length)!==edit.replacement)fail('complete native inverse span differs');
  inverse=inverse.slice(0,edit.start)+edit.expected+inverse.slice(edit.start+edit.replacement.length);
 }
 if(inverse!==source)fail('complete original native inverse differs');
 return {before:source,after,inverse,nativeSelections:edits,compilerWalksPerCall:1,
  originalNativeBindingJoinPreserved:true,originalUniquenessChecksPreserved:true,
  retainedCompilerState:false,semanticAuthority:false,runtimeParity:false};
}
