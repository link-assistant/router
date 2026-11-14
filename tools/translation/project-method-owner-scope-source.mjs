// Native-selected source DATA only. The existing private method issuer decides
// the actual namespace; this recipe cannot issue or normalize scope evidence.
const fail=message=>{throw new TypeError('Project method owner scope source: '+message);};
const one=(rows,label)=>{if(rows.length!==1)fail('one actual native selection required: '+label);return rows[0];};
const PATH='tools/translation/project.mjs';
function parse(ts,source){
 if(typeof source!=='string'||source.length>262144||ts.version!=='5.9.3')fail('bounded complete source and installed TypeScript 5.9.3 required');
 const file=ts.createSourceFile(PATH,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;
}
export function deriveProjectMethodOwnerScope(ts,before){
 const file=parse(ts,before),imports=file.statements.filter(node=>ts.isImportDeclaration(node)&&node.moduleSpecifier.text==='./matches-macro-context.mjs');
 const originalImport=one(imports,'actual private method namespace module'),bindings=originalImport.importClause?.namedBindings;
 if(!bindings||!ts.isNamedImports(bindings)||bindings.elements.some(node=>node.propertyName)||!bindings.elements.some(node=>node.name.text==='createMatchesMacroContext')||!bindings.elements.some(node=>node.name.text==='OriginalMethodOwnerUnproved')||bindings.elements.some(node=>node.name.text==='originalMethodParserNamespace'))fail('original private context import differs');
 const calls=[];function visit(node){if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&node.expression.text==='linkProjectMethodDeclaration')calls.push(node);ts.forEachChild(node,visit);}visit(file);
 const call=one(calls,'actual original method source linker');
 if(call.arguments.length!==5||call.arguments.slice(0,4).map(node=>node.getText(file)).join('|')!=='parser|originalParsed.entry|surface|semantic')fail('original source linker arguments differ');
 const options=call.arguments[4];
 const property=(object,name)=>{if(!ts.isObjectLiteralExpression(object))fail('original linker options must be native object literals');return one(object.properties.filter(node=>ts.isPropertyAssignment(node)&&node.name.getText(file)===name),name);};
 const scope=property(options,'scope'),evidence=property(scope.initializer,'bindingEvidence');
 if(evidence.initializer.getText(file)!=='scopes.get(moduleScopeKey(module))'||property(scope.initializer,'compilationProfile').initializer.getText(file)!=='graph.compilationProfile'||property(scope.initializer,'configurationCondition').initializer.getText(file)!=='module.configurationCondition')fail('original whole owner scope selection differs');
 const edits=[
  {span:[bindings.getStart(file),bindings.end],expected:bindings.getText(file),replacement:bindings.getText(file).slice(0,-1)+',originalMethodParserNamespace}'},
  {span:[evidence.initializer.getStart(file),evidence.initializer.end],expected:evidence.initializer.getText(file),replacement:'originalMethodParserNamespace(matchesMacroContext,method).scope'},
 ].sort((a,b)=>a.span[0]-b.span[0]);
 let after=before,shift=0;
 for(const edit of edits){if(before.slice(...edit.span)!==edit.expected)fail('complete native input selection differs');edit.afterSpan=[edit.span[0]+shift,edit.span[0]+shift+edit.replacement.length];shift+=edit.replacement.length-edit.expected.length;}
 for(const edit of [...edits].reverse())after=after.slice(0,edit.span[0])+edit.replacement+after.slice(edit.span[1]);parse(ts,after);
 let inverse=after;
 for(const edit of [...edits].reverse()){if(inverse.slice(...edit.afterSpan)!==edit.replacement)fail('complete native inverse selection differs');inverse=inverse.slice(0,edit.afterSpan[0])+edit.expected+inverse.slice(edit.afterSpan[1]);}
 if(inverse!==before)fail('complete native inverse differs');
 return {before,after,inverse,edits,languageRules:[{id:'javascript:link-original-method-private-parser-scope',edits}],repositoryRules:[],sourceAuthority:false,semanticAuthority:false};
}
