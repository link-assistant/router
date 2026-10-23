// Keep every private project issuer in its original module. Select DATA only.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {verifyNativeCopiedSourceBindings} from './source-copy-native-bindings.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),P='tools/translation/',PROFILE=P+'source-profiles/flat-semantic-meta/';
const PIN='8a83cf40fe68ae27644d02cda87670a49a323f521d3056976a37d5fa464d3cd4',hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Project semantic storage source: '+message);};
function one(rows,label){if(rows.length!==1)fail('one original '+label+' required');return rows[0];}
function grammar(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;}
function apply(source,edits){let text=source,last=source.length;for(const edit of [...edits].sort((a,b)=>b.span[0]-a.span[0])){if(edit.span[1]>last||source.slice(...edit.span)!==edit.expected)fail('native edit overlap or source differs');text=text.slice(0,edit.span[0])+edit.replacement+text.slice(edit.span[1]);last=edit.span[0];}return text;}
function stages(before,language,after){const rows=[{before,after:language,language:'JavaScript'},{before:language,after,language:'JavaScript'}],equations=transportConcreteSourceEquations(rows);return equations.map((equation,index)=>({phase:index?'repository':'language',before:rows[index].before,after:rows[index].after,beforeMeta:equation.beforeMeta,afterMeta:equation.afterMeta,inverse:equation.inverse,completeInverse:equation.inverse===rows[index].before,concreteTransaction:equation}));}
export function prepareProjectFlatSemanticEntry({root=ROOT}={}){
 root=resolve(root);const manifestBytes=readFileSync(resolve(root,PROFILE+'manifest.json'));if(hash(manifestBytes)!==PIN)fail('complete original profile pin differs');const manifest=JSON.parse(manifestBytes),inputs=manifest.files.map(row=>{const bytes=readFileSync(resolve(root,PROFILE+row.path));if(bytes.length!==row.bytes||hash(bytes)!==row.sha256)fail('complete original member differs');return {...row,source:bytes.toString('utf8')};});
 const ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('native TypeScript 5.9.3 required');const before=inputs[0].source,file=grammar(ts,'project.mjs',before),names=['flatten','declarationProgram','compileProjectLanguage'],functions=names.map(name=>one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name),name)),edits=[];
 const select=(node,replacement)=>edits.push({span:[node.getStart(file),node.end],expected:node.getText(file),replacement});
 for(const fn of functions){if(fn.parameters.some(node=>node.name.getText(file)==='semanticStorage'))fail('unexpected preceding storage parameter');edits.push({span:[fn.parameters.end,fn.parameters.end],expected:'',replacement:', semanticStorage = originalProjectSemanticStorage'});}
 const counts={roundTrip:0,serialize:0,forward:0};
 function owner(node){for(let parent=node.parent;parent;parent=parent.parent)if(functions.includes(parent))return parent;return null;}
 function visit(node){
  if(ts.isCallExpression(node)&&ts.isIdentifier(node.expression)&&owner(node)){
   if(node.expression.text==='roundTripProgram'){select(node.expression,'semanticStorage.roundTripProgram');counts.roundTrip++;}
   if(node.expression.text==='serializeProgram'){select(node.expression,'semanticStorage.serializeProgram');counts.serialize++;}
   if(['flatten','declarationProgram'].includes(node.expression.text)){edits.push({span:[node.arguments.end,node.arguments.end],expected:'',replacement:', semanticStorage'});counts.forward++;}
  }ts.forEachChild(node,visit);
 }visit(file);if(counts.roundTrip!==3||counts.serialize!==2||counts.forward!==2)fail('complete original semantic call census differs');
 const pipelineNode=one(file.statements.filter(node=>ts.isVariableStatement(node)&&node.declarationList.declarations.some(row=>row.name.getText(file)==='projectTranslationRules')),'complete project pipeline'),entry=one(file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='translateProject'),'complete public entry');
 const pipelineText=pipelineNode.getText(file),entryText=entry.getText(file),pipelineSource=ts.createSourceFile('pipeline.mjs',pipelineText,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),entrySource=ts.createSourceFile('entry.mjs',entryText,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),pipelineEdits=[],entryEdits=[];
 function route(node,source,out){if(ts.isIdentifier(node)){if(node.text==='projectTranslationRules')out.push({span:[node.getStart(source),node.end],expected:node.getText(source),replacement:'flatSemanticProjectTranslationRules'});if(node.text==='translateProject')out.push({span:[node.getStart(source),node.end],expected:node.getText(source),replacement:'translateProjectWithFlatSemanticMeta'});if(node.text==='compileProjectLanguage')out.push({span:[node.getStart(source),node.end],expected:node.getText(source),replacement:'options=>compileProjectLanguage(options,false,flatProjectSemanticStorage)'});}ts.forEachChild(node,child=>route(child,source,out));}
 route(pipelineSource,pipelineSource,pipelineEdits);route(entrySource,entrySource,entryEdits);if(pipelineEdits.length!==2||entryEdits.length!==2)fail('complete pipeline/entry native binding census differs');
 const prefix="import {roundTripProgram as roundTripFlatProgram,serializeProgram as serializeFlatProgram} from './semantic-meta-flat.mjs';\nconst originalProjectSemanticStorage={roundTripProgram,serializeProgram};\nconst flatProjectSemanticStorage={roundTripProgram:roundTripFlatProgram,serializeProgram:serializeFlatProgram};\n";
 const suffix='\n// Explicit stock-native DATA storage; all original private issuers stay here.\n'+apply(pipelineText,pipelineEdits)+'\n'+apply(entryText,entryEdits)+'\n';
 let language;const run=createRulePipeline([{phase:'language',rules:[{id:'semantic-meta:select-private-serialization-only',apply:source=>language=apply(source,edits)}]},{phase:'repository',rules:[{id:'router:closed-flat-entry-in-original-issuer-module',apply:source=>prefix+source+suffix}]}]).run(before),after=run.value;grammar(ts,'project.mjs',after);if(after.split('\n').length>=1000)fail('source line bound');
 const parsed=grammar(ts,'after.mjs',after),unchanged=[];for(const node of file.statements.filter(ts.isFunctionDeclaration))if(!names.includes(node.name.text)){const candidate=one(parsed.statements.filter(row=>ts.isFunctionDeclaration(row)&&row.name?.text===node.name.text),'unchanged original issuer/helper '+node.name.text);if(candidate.getText(parsed)!==node.getText(file))fail('unselected original function changed');unchanged.push(node.name.text);}
 const rows=[{path:P+'project.mjs',before,language,after,selections:edits,trace:run.trace,unchangedOriginalFunctions:unchanged,originalIssuersRetainedInSameModule:true}];
 const wrapperBefore=inputs[1].source,wrapperLanguage="export * from './project.mjs';\nexport {translateProjectWithFlatSemanticMeta as translateProject} from './project.mjs';\n",wrapperAfter='// Generated adapter; delegates to the actual original project issuer.\n'+wrapperLanguage;
 rows.push({path:P+'project-flat-semantic.mjs',before:wrapperBefore,language:wrapperLanguage,after:wrapperAfter,selections:[{span:[0,wrapperBefore.length],expected:wrapperBefore,replacement:wrapperLanguage}],originalIssuersRetainedInSameModule:true});
 for(const row of rows){row.current=readFileSync(resolve(root,row.path),'utf8');if(row.current!==row.before&&row.current!==row.after)fail('unknown current project output');row.inverse=row.before;row.stages=stages(row.before,row.language,row.after);row.nativeBindings=verifyNativeCopiedSourceBindings(ts,resolve(root,row.path),row.after);}
 for(const row of inputs)if(hash(readFileSync(resolve(root,PROFILE+row.path)))!==row.sha256)fail('complete original source changed');
 return {schema:'original-project-flat-semantic-entry-v1',files:rows,inputs,allOriginalPublicEntriesDefaultToOriginalStorage:true,privateIssuersNotCopied:true,callerCannotSupplySemanticStorage:true,newAcrossInvocationCache:false,semanticAuthority:false,rustExecuted:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [mode,...rest]=process.argv.slice(2);if(rest.length||!['--emit','--check','--write'].includes(mode))fail('use --emit|--check|--write');const plan=prepareProjectFlatSemanticEntry();
 if(mode==='--emit')console.log(JSON.stringify(plan));else if(mode==='--check'){if(plan.files.some(row=>row.current!==row.after))fail('complete source output stale');console.log('Original-issuer flat project entry current.');}else{for(const row of plan.files)if(readFileSync(resolve(ROOT,row.path),'utf8')!==row.current)fail('current output changed');for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);console.log('Wrote original-issuer project storage entry and adapter.');}
}
