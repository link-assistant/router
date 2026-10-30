// Original checked TypeScript -> JavaScript annotation DATA. This is source
// packaging only; actual native domains and ownership remain body obligations.
const fail=message=>{throw new TypeError('Resource TypeScript source docs: '+message);};
function canonical(ts,written,file,printer,expandType=null){
 if(!printer)fail('actual invocation-local native type printer required');let target=written,owner=file;if(expandType){const source=expandType(written);owner=ts.createSourceFile('original-resource-alias-doc.mts','type OriginalAliasDoc = '+source+';',ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);if(owner.parseDiagnostics.length||owner.statements.length!==1||!ts.isTypeAliasDeclaration(owner.statements[0]))fail('complete expanded original native alias doc required');target=owner.statements[0].type;}const source=printer.printNode(ts.EmitHint.Unspecified,target,owner).replace(/\s+/gu,' ').trim();if(!source||source.includes('/*')||source.includes('*/')||source.length>65536)fail('bounded original native type spelling must remain inside its JSDoc field');return source;
}
function replaceDocType(previous,type,file,erase){if(previous.getText(file)!==type)erase.push({span:[previous.getStart(file),previous.end],replacement:type});}
export function captureHttpResourceTypeScriptParameterDoc(ts,parameter,written,{file,erase,docs}){
 if(parameter.getSourceFile()!==file||!ts.isIdentifier(parameter.name))fail('actual original native parameter required');const type=canonical(ts,written,file,docs.printer,docs.expandType),previous=ts.getJSDocType(parameter);erase.push({span:[parameter.name.end,written.end],replacement:''});docs.parameters.push({name:parameter.name.text,type});if(previous)replaceDocType(previous,type,file,erase);else docs.needed=true;
}
export function finishHttpResourceTypeScriptDocs(ts,item,{language,file,erase,docs}){
 if(language!=='TypeScript')return;if(item.getSourceFile()!==file)fail('actual whole original native function required');let returns=null;
 if(item.type){returns=canonical(ts,item.type,file,docs.printer,docs.expandType);const previous=ts.getJSDocReturnType(item);if(previous)replaceDocType(previous,returns,file,erase);else docs.needed=true;}
 if(!docs.needed)return;const tags=docs.parameters.map(row=>' * @param {'+row.type+'} '+row.name);if(returns!==null)tags.push(' * @returns {'+returns+'}');if(!tags.length)return;const at=item.getStart(file);erase.push({span:[at,at],replacement:'/**\n'+tags.join('\n')+'\n */\n'});
}
