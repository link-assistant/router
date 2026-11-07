// Full native source selection; both original APIs and runtime checks stay exact.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {transportConcreteSourcePhases} from './concrete-phased-equations.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),path='tools/translation/prepare-owned-runtime-import-edges.mjs';
const profile=new URL('./source-profiles/runtime-import-phased-data/',import.meta.url);
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Runtime import phased DATA source: '+message);};
const one=rows=>{if(rows.length!==1)fail('unique complete native selection required');return rows[0];};
function edit(source,edits){
 let result=source,last=source.length;
 for(const row of [...edits].sort((a,b)=>b.span[0]-a.span[0])){
  if(row.span[1]>last||source.slice(...row.span)!==row.expected)fail('complete selected span differs');
  result=result.slice(0,row.span[0])+row.replacement+result.slice(row.span[1]);last=row.span[0];
 }
 let shift=0,inverse=result;
 const mapped=[...edits].sort((a,b)=>a.span[0]-b.span[0]).map(row=>{const start=row.span[0]+shift;shift+=row.replacement.length-row.expected.length;return {...row,start};});
 for(const row of mapped.reverse()){
  if(inverse.slice(row.start,row.start+row.replacement.length)!==row.replacement)fail('complete native inverse differs');
  inverse=inverse.slice(0,row.start)+row.expected+inverse.slice(row.start+row.replacement.length);
 }
 if(inverse!==source)fail('complete original inverse differs');return result;
}
export function prepareRuntimeImportPhasedData(){
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',profile),'utf8')),packed=readFileSync(new URL('original.mjs.gz',profile));
 if(manifest.sha256!=='cdc1ba0e6d8857eb376978b437818f27bdce2dad5e0e6ea8b9e32707ee0eef35'||manifest.archiveSha256!=='b4951c169f7e89fff8c319e5d6fe19a36f9f8af3fc5ccda18f57a5a25edf37bb'||manifest.bytes!==31441||manifest.archiveBytes!==9121)fail('complete original pins differ');
 if(packed.length!==manifest.archiveBytes||hash(packed)!==manifest.archiveSha256)fail('complete original archive differs');
 const original=gunzipSync(packed,{maxOutputLength:131072}).toString('utf8');
 if(Buffer.byteLength(original)!==manifest.bytes||hash(original)!==manifest.sha256)fail('complete original source differs');
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const parse=source=>{const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;};
 const file=parse(original),equation=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='equation'));
 const tail=one(equation.body.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>row.name.getText(file)==='hashCalls')));
 const selected=(node,replacement)=>({span:[node.getStart(file),node.end],expected:node.getText(file),replacement});
 const prefix=`\n const [proof]=transportConcreteSourcePhases([{before,middle:language,after,language:'JavaScript'}]);
 const stages=proof.stages.map(stage=>({...stage,completeInverse:stage.inverse===stage.before}));
 const sequence={languageRules:stages[0].sequence.languageRules,repositoryRules:stages[1].sequence.repositoryRules};
 `;
 const languageEdits=[{span:[equation.body.getStart(file)+1,tail.getStart(file)],expected:original.slice(equation.body.getStart(file)+1,tail.getStart(file)),replacement:prefix}];
 const returned=one(equation.body.statements.filter(ts.isReturnStatement));
 function visit(node){
  if(ts.isPropertyAccessExpression(node)&&node.getText(file)==='first.meta')languageEdits.push(selected(node,'proof.beforeMeta'));
  if(ts.isCallExpression(node)&&node.getText(file)==='serializeConcreteSyntaxMeta(document)')languageEdits.push(selected(node,'proof.afterMeta'));
  ts.forEachChild(node,visit);
 }
 visit(returned);if(languageEdits.length!==3)fail('complete original metadata selections differ');
 const middle=edit(original,languageEdits),middleFile=parse(middle),composer=one(middleFile.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='composeOwnedRuntimeImportEdges')),calls=[];
 function callVisit(node){if(ts.isCallExpression(node)&&node.expression.getText(middleFile)==='prepareOwnedRuntimeImportEdges')calls.push(node);ts.forEachChild(node,callVisit);}
 callVisit(composer);const call=one(calls);
 if(call.getText(middleFile)!=='prepareOwnedRuntimeImportEdges(options)')fail('actual original source composition differs');
 const repositoryEdits=[{span:[0,0],expected:'',replacement:"import {transportConcreteSourcePhases} from './concrete-phased-equations.mjs';\nimport {freshNodeRuntimeImportSourceData} from './owned-runtime-node-source-data.mjs';\n"},
  {span:[call.getStart(middleFile),call.end],expected:call.getText(middleFile),replacement:'(process.versions.bun?freshNodeRuntimeImportSourceData(root):prepareOwnedRuntimeImportEdges(options))'}];
 const after=edit(middle,repositoryEdits);parse(after);
 const current=readFileSync(resolve(root,path),'utf8');if(current!==original&&current!==after)fail('unexpected complete physical source');
 const [proof]=transportConcreteSourcePhases([{before:original,middle,after,language:'JavaScript'}]);
 if(readFileSync(resolve(root,path),'utf8')!==current)fail('complete physical source changed');
 return {schema:'runtime-import-phased-data-source-v1',file:{path,current,original,middle,after,originalSha256:hash(original),afterSha256:hash(after),languageEdits,repositoryEdits,equation:proof},originalPublicPreparationUnchanged:true,originalRuntimeIssuersUnchanged:true,semanticAuthority:false,runtimeParity:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check'].includes(args[0]))fail('use --emit|--check');
 const result=prepareRuntimeImportPhasedData();
 if(args[0]==='--check'){if(result.file.current!==result.file.after)fail('complete generated source is stale');console.log('Complete runtime import phased/source-DATA composition is current; no runtime authority.');}
 else console.log(JSON.stringify(result));
}
