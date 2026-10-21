// Additive original-checker source view. Saved DATA never issues source owners.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),PROFILE=new URL('./source-profiles/executable-checked-source/',import.meta.url);
const MANIFEST='7649586ff9fe2f9856f9499bf2f3d0966b7fce406b8c76e17986a9950cfe4184';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Executable checked source preparation: '+message);};
function original(){
 const bytes=readFileSync(new URL('manifest.json',PROFILE));if(hash(bytes)!==MANIFEST)fail('complete original manifest changed');const row=JSON.parse(bytes),packed=readFileSync(new URL(row.archive,PROFILE));
 if(row.schema!=='original-executable-checked-source-project-v1'||row.path!=='tools/translation/project.mjs'||packed.length!==row.archiveBytes||hash(packed)!==row.archiveSha256)fail('complete original archive changed');
 const raw=gunzipSync(packed,{maxOutputLength:1024*1024});if(raw.length!==row.bytes||hash(raw)!==row.sha256)fail('complete original source changed');
 const source=new TextDecoder('utf8',{fatal:true,ignoreBOM:true}).decode(raw);if(hash(source)!==row.sha256)fail('complete original Unicode changed');return {...row,source};
}
const ACCESSOR=String.raw`,checkedSource:()=>{
    const own=checked.declarations.get(entry.name),modules=graph.modules.filter(module=>module.file===entry.file&&JSON.stringify(module.path)===JSON.stringify(entry.path));
    const origin=originalParsedDeclarationEvidence(entry.surface),module=modules.length===1?modules[0]:null;
    if(entry.term!=='fn'||own?.k!=='fn'||own.fullName!==entry.name||!origin||!module||origin.sourcePath!==entry.file||origin.sourceSha256!==sha256(module.source)||origin.declarationSpan.start!==entry.span.start||origin.declarationSpan.end!==entry.span.end||origin.checkedSpan.start!==entry.surface.span.start||origin.checkedSpan.end!==entry.surface.span.end||own.span.start!==entry.surface.span.start||own.span.end!==entry.surface.span.end)throw new TypeError('Original executable checked source association differs');
    return freezeMacroTree(structuredClone({schema:'original-checked-executable-source-v1',source:entry.file,sourceSha256:sha256(module.source),qualifiedName:entry.name,module:entry.path,span:entry.span,checkedSpan:own.span,sourceSignature:{params:entry.surface.params,ret:entry.surface.ret},declaration:own}));
  }`;
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
export function prepareExecutableCheckedSource({root=ROOT}={}){
 const input=original(),before=input.source,ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('actual TypeScript5.9.3 required');
 const file=ts.createSourceFile(input.path,before,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete original native grammar differs');
 const rows=[];function visit(node){if(ts.isVariableDeclaration(node)&&node.name.getText(file)==='executableDeclarations')rows.push(node);ts.forEachChild(node,visit);}visit(file);
 if(rows.length!==1)fail('one original executable carrier required');const call=rows[0].initializer,arrow=call?.arguments?.[0];
 if(!ts.isCallExpression(call)||call.expression.getText(file)!=='entries.map'||call.arguments.length!==1||!ts.isArrowFunction(arrow)||arrow.parameters.length!==1||arrow.parameters[0].name.getText(file)!=='entry'||!ts.isParenthesizedExpression(arrow.body)||!ts.isObjectLiteralExpression(arrow.body.expression))fail('complete original carrier construction differs');
 const object=arrow.body.expression,keys=object.properties.map(row=>row.name?.getText(file));
 if(JSON.stringify(keys)!==JSON.stringify(['source','sourceSha256','name','span','project','qualifiedName','lower'])||object.properties.at(-1).initializer.getText(file)!=="lowerDeclaration(entry,entry.name.split('.').at(-1))")fail('complete original lowering carrier differs');
 const at=object.end-1,language=before.slice(0,at)+ACCESSOR+before.slice(at),after=language;
 const native=ts.createSourceFile(input.path,after,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(native.parseDiagnostics.length||after.split('\n').length>=1000)fail('complete generated native grammar or line budget differs');
 const nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,input.path),after),first=transportConcreteSyntaxSource(before,{language:'JavaScript'});
 const sequence={languageRules:[rule(before,language,'javascript:retain-original-checked-declaration-and-parsed-signature')],repositoryRules:[rule(language,after,'router:add-explicit-executable-source-view-without-changing-lower')]};
 const run=applyConcreteSyntaxSubstitutions(first.document,sequence),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('complete generated CST differs');
 const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[rule(after,before,'javascript:restore-complete-original-project')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==before)fail('complete source inverse differs');
 let current=null;try{current=readFileSync(resolve(root,input.path),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 return {schema:'executable-checked-source-source-v1',typescriptVersion:ts.version,input,files:[{path:input.path,before,language,after,current,beforeSha256:hash(before),afterSha256:hash(after),beforeMeta:first.meta,afterMeta,inverse:before,sequence,trace:run.trace,nativeBindings}],lowerAPIUnchanged:true,newAcrossInvocationCache:false,semanticAuthority:false};
}
export function composeExecutableCheckedSource(prior,options={}){
 const plan=prepareExecutableCheckedSource(options),sources={...prior};for(const row of plan.files){if(sources[row.path]&&sources[row.path].after!==row.before)fail('preceding complete project equation differs');sources[row.path]=row;}return {sources,layers:[plan],historicalSources:prior};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--check','--write'].includes(args[0]))fail('usage: --check|--write');const plan=prepareExecutableCheckedSource();
 if(args[0]==='--write'){for(const row of plan.files){if(![row.before,row.after].includes(row.current)||readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('complete current project changed');writeFileSync(resolve(ROOT,row.path),row.after);}}
 else if(plan.files.some(row=>row.current!==row.after))fail('complete generated project source is stale');
 console.log(JSON.stringify({schema:plan.schema,files:plan.files.map(row=>row.path),semanticAuthority:false}));
}
