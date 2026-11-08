// Retain primitive compiler source DATA while allowing its fresh AST to expire.
// Every original parse, native binder, predicate and hash check still executes.
export function proposeRuntimeCompilerLifetime(ts,path,source){
 const fail=message=>{throw TypeError('Runtime compiler lifetime source: '+message);};
 if(ts.version!=='5.9.3'||typeof path!=='string'||typeof source!=='string')fail('installed compiler and complete primitive source required');
 const parse=text=>{const file=ts.createSourceFile(path,text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;};
 const file=parse(source),one=(rows,label)=>{if(rows.length!==1)fail('unique complete '+label+' required');return rows[0];};
 const declarations=file.statements.filter(ts.isFunctionDeclaration);
 if(declarations.some(node=>node.name?.text==='freshRuntimeCompilerSourceData'))fail('private compiler scope already exists');
 const owner=one(declarations.filter(node=>node.name?.text==='prepareOwnedRuntimeImportEdges'),'runtime producer');
 if(!owner.body||owner.body.statements[0]?.getText(file)!=='root=resolve(root);')fail('complete root selection differs');
 const statements=[...owner.body.statements],packed=statements.findIndex(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(value=>ts.isIdentifier(value.name)&&value.name.text==='packed'));
 if(packed!==9)fail('complete compiler prefix statement domain differs');
 const prefix=statements.slice(1,packed),names=prefix.filter(ts.isVariableStatement).flatMap(node=>node.declarationList.declarations.map(value=>value.name.getText(file)));
 const expected=['require','ts','compilerPath','compilerBytes','compilerSource','compilerFile','selections','lazy','native','parentTail','table'];
 if(JSON.stringify(names)!==JSON.stringify(expected))fail('complete compiler prefix declaration domain differs');
 const text=prefix.map(node=>node.getText(file)).join('\n ');
 if(!text.includes('selections=nativeCompilerSelections(ts,compilerFile)')||!text.includes('lazy=nativeLazyAssertions(ts,compilerFile,selections)')||prefix.at(-1).getText(file)!=="parentTail.push({name:'forEachChildTable',source:table.getText(compilerFile),span:[table.getStart(compilerFile),table.end]});")fail('complete compiler selection prefix differs');
 const retained=['ts','compilerPath','compilerBytes','compilerSource','lazy','native','parentTail'];
 const remaining=source.slice(statements[packed].getStart(file),owner.body.end),forbidden=new Set(['require','compilerFile','selections','table']);
 const remainingFile=parse('function receiving(){'+remaining.slice(0,-1)+'}');
 function visit(node){if(ts.isIdentifier(node)&&forbidden.has(node.text))fail('compiler prefix binding escapes into later source');ts.forEachChild(node,visit);}visit(remainingFile);
 const addition='\n// A fresh invocation returns source DATA; native nodes remain in this scope.\nfunction freshRuntimeCompilerSourceData(root){\n '+text+'\n return {'+retained.join(',')+'};\n}\n';
 const edits=[{kind:'close-complete-fresh-native-compiler-scope',span:[prefix[0].getStart(file),prefix.at(-1).end],expected:source.slice(prefix[0].getStart(file),prefix.at(-1).end),replacement:'const {'+retained.join(',')+'}=freshRuntimeCompilerSourceData(root);'},
  {kind:'private-whole-original-compiler-prefix',span:[source.length,source.length],expected:'',replacement:addition}];
 let after=source,last=source.length;
 for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
  if(edit.span[1]>last||after.slice(...edit.span)!==edit.expected)fail('complete original native span differs');
  after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);last=edit.span[0];
 }
 parse(after);
 let shift=0,inverse=after;
 const mapped=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(edit=>{const start=edit.span[0]+shift;shift+=edit.replacement.length-edit.expected.length;return {...edit,start};});
 for(const edit of mapped.reverse()){
  if(inverse.slice(edit.start,edit.start+edit.replacement.length)!==edit.replacement)fail('complete inverse native span differs');
  inverse=inverse.slice(0,edit.start)+edit.expected+inverse.slice(edit.start+edit.replacement.length);
 }
 if(inverse!==source)fail('complete source inverse differs');
 return {before:source,after,inverse,nativeSelections:edits,retainedNames:retained,
  unchangedCompilerPrefix:prefix.map(node=>node.getText(file)),compilerStateRetained:false,
  originalChecksRemoved:0,semanticAuthority:false,runtimeParity:false,performanceQualified:false};
}
