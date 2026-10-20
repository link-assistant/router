// Native whole-function source copying; detached packets issue no authority.
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {prepareSourceBackedFormatting} from './prepare-source-backed-formatting.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url)),SOURCE='tools/translation/source-backed-core-formatting.mjs',SUPPORT='tools/translation/source-backed-formatting-support.mjs',TEMPLATE='tools/translation/migrate-core-json-readers.mjs',OUTPUT='tools/translation/source-backed-formatting-packets.mjs';
const fail=message=>{throw new TypeError('Formatting packet source preparation: '+message);};
function once(source,before,after){if(source.split(before).length!==2)fail('unique complete source anchor required: '+before);return source.replace(before,()=>after);}
function native(ts,path,source){const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native syntax differs: '+path);return file;}
function named(ts,file,name){const rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);if(rows.length!==1)fail('one complete original function required: '+name);return rows[0];}
function variable(ts,statements,name){const rows=statements.filter(ts.isVariableStatement).filter(node=>node.declarationList.declarations.some(row=>ts.isIdentifier(row.name)&&row.name.text===name));if(rows.length!==1)fail('one original variable required: '+name);return rows[0];}
function edits(source,changes){let result=source;for(const change of changes.sort((a,b)=>b.start-a.start)){if(result.slice(change.start,change.end)!==change.before)fail('native source span differs');result=result.slice(0,change.start)+change.after+result.slice(change.end);}return result;}
const rule=(before,after,id)=>({id,edits:[{span:[0,before.length],expected:before,replacement:after}]});
export function prepareSourceBackedFormattingPackets({root=ROOT}={}){
 const materialized=prepareSourceBackedFormatting({root});if(materialized.files.some(row=>row.current!==row.after))fail('original materialized producer equation is stale');
 const source=readFileSync(resolve(root,SOURCE),'utf8'),support=readFileSync(resolve(root,SUPPORT),'utf8'),template=readFileSync(resolve(root,TEMPLATE),'utf8'),ts=ownershipCompiler();if(ts.version!=='5.9.3')fail('installed TypeScript 5.9.3 required');
 const file=native(ts,SOURCE,source),supportFile=native(ts,SUPPORT,support),other=native(ts,TEMPLATE,template),fn=named(ts,file,'proposeSourceBackedCoreFormattingCorpus'),loops=fn.body.statements.filter(ts.isForOfStatement);if(loops.length!==1)fail('one complete original physical-file loop required');const loop=loops[0],start=fn.getStart(file),whole=fn.getText(file);
 let prefix=whole.slice(0,loop.getStart(file)-start),body=loop.statement.getText(file).slice(1,-1),tail=whole.slice(loop.end-start,fn.body.end-1-start);
 const originalHeader="export function proposeSourceBackedCoreFormattingCorpus({entry='src/lib.rs',files,compilationProfile=PRODUCTION_PROFILE,dependencyInputs}={}){";
 prefix=once(prefix,originalHeader,"export function iterateOriginalSourceBackedFormattingPacketData(options={}){\n const supplied=formattingPacketRecord(options,['entry','files','compilationProfile','dependencyInputs'],4,'options'),{entry='src/lib.rs',files,compilationProfile=PRODUCTION_PROFILE,dependencyInputs}=supplied.value,captured=formattingPacketRecord(files,null,4096,'files'),dependencies=dependencyInputs===undefined?null:formattingPacketRecord(dependencyInputs,['manifest','lock'],2,'dependency inputs');");
 prefix=once(prefix,'inputFiles(files)','inputFiles(captured.value)');prefix=once(prefix,'rows=[],inspection=createSourceBackedFormattingInspection(graph,dependencyInputs)','inspection=createFormattingPacketInspection(graph,dependencies?.value)');
 const bodyStart=loop.statement.getStart(file)+1,changes=[];
 function visit(node){
  if(ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&ts.isPropertyAccessExpression(node.expression.expression)&&ts.isIdentifier(node.expression.expression.expression)&&node.expression.expression.expression.text==='rows'&&node.expression.expression.name.text==='push'){
   if(node.expression.arguments.length!==1)fail('one complete original row argument required');changes.push({start:node.getStart(file)-bodyStart,end:node.end-bodyStart,before:node.getText(file),after:'return encodeFormattingRow('+node.expression.arguments[0].getText(file)+');'});return;
  }
  if(ts.isContinueStatement(node)){changes.push({start:node.getStart(file)-bodyStart,end:node.end-bodyStart,before:node.getText(file),after:''});return;}ts.forEachChild(node,visit);
 }visit(loop.statement);body=edits(body,changes);
 const resultStatement=fn.body.statements.find(node=>ts.isReturnStatement(node));if(!resultStatement)fail('whole original result required');
 let returned=resultStatement.expression.getText(file);returned=once(returned,'...inspection.finish()','...finishedInspection');returned=once(returned,'inputs,rows,summary','inputs,rows:[],summary');
 const summaryStatement=variable(ts,fn.body.statements,'inputs'),summarySource=summaryStatement.getText(file),summaryAt=summarySource.indexOf(',summary=');if(summaryAt<0)fail('complete original input and summary declaration required');
 tail=once(tail,summarySource,summarySource.slice(0,summaryAt)+';');
 tail=once(tail,resultStatement.getText(file),String.raw`const finishedInspection=inspection.finish(),result=`+returned+String.raw`;
 verifyFormattingInputs();
 for(let at=0;at<inputs.length;at++)yield packet('inputs',at,inputs[at]);
 yield packet('module-edges',0,result.moduleEdges);yield packet('module-diagnostics',0,result.moduleDiagnostics);
 const keys=Object.keys(result),excluded=new Set(['inputs','rows','bindingInspections','moduleEdges','moduleDiagnostics']),values={};for(const key of keys)if(!excluded.has(key))values[key]=result[key];
 yield packet('metadata',0,{keys,values});verifyFormattingInputs();finished=true;
 return {summary:{...summary},counts:{rows:paths.length,bindingInspections:inspectionCount}};`);
 const json=named(ts,other,'iterateCoreJsonReadersCorpusPackets'),packet=variable(ts,json.body.statements,'packet').getText(other),same=once(variable(ts,other.statements,'same').getText(other),'const same=','const formattingPacketSame='),record=once(named(ts,other,'record').getText(other),'function record(','function formattingPacketRecord(').replaceAll('!same(','!formattingPacketSame(');
 let inspection=named(ts,supportFile,'createSourceBackedFormattingInspection').getText(supportFile);inspection=once(inspection,'export function createSourceBackedFormattingInspection(','function createFormattingPacketInspection(').replaceAll('fail(','formattingPacketInspectionFail(');
 inspection=once(inspection,'inspections=new Map()','inspections=new Map(),pending=[]');inspection=once(inspection,'row.before.source!==source','row.beforeSource!==source');
 inspection=once(inspection,'inspections.set(path,row);return row;',"const encoded={beforeSource:source,afterSource:after.source,inactiveItemSpans:inactiveItems.map(row=>[...row.span])};pending.push(JSON.stringify(row)+'\\n');inspections.set(path,encoded);return encoded;");
 inspection=inspection.replaceAll('inspect(path,owner.source).after.source','inspect(path,owner.source).afterSource').replaceAll('inspect(row.path,row.source).after.source','inspect(row.path,row.source).afterSource');
 inspection=once(inspection,'inspect(path,owner.source).inactiveItems.map(row=>[...row.span])','inspect(path,owner.source).inactiveItemSpans');
 inspection=once(inspection,'finish(){verify();return {producerEffects:finishCoreAdoptionProducerContext(context),bindingInspections:[...inspections.values()]};}',"takePackets(){verify();return pending.splice(0);},finish(){verify();if(pending.length)formattingPacketInspectionFail('undrained complete inspection packets');return {producerEffects:finishCoreAdoptionProducerContext(context),bindingInspections:[]};}");
 const inspectionFail=once(variable(ts,supportFile.statements,'fail').getText(supportFile),'const fail=','const formattingPacketInspectionFail='),supportImports=supportFile.statements.filter(ts.isImportDeclaration).filter(node=>['./core-adoption-producer-context.mjs','./cfg-profile.mjs'].includes(node.moduleSpecifier.text)).map(node=>node.getText(supportFile)).join('\n');
 const copied=file.statements.filter(node=>node!==fn&&(!ts.isImportDeclaration(node)||node.moduleSpecifier.text!=='./source-backed-formatting-support.mjs')).map(node=>node.getText(file)).join('\n');
 const generated=prefix+String.raw`
 const summary={files:paths.length,proposed:0,unchanged:0,skipped:0,selectedFunctions:0};let finished=false,inspectionCount=0;
 `+packet+String.raw`
 function verifyFormattingInputs(){dependencies?.verify();captured.verify();supplied.verify();}
 function encodeFormattingRow(row){return {text:JSON.stringify(row)+'\n',status:row.status,selectedFunctions:row.proposal?.functions.length??0};}
 function encodedFormattingFile(path){`+body+String.raw`}
 function* packets(){
 for(let at=0;at<paths.length;at++){
  const encoded=encodedFormattingFile(paths[at]),inspections=inspection.takePackets();summary[encoded.status]++;summary.selectedFunctions+=encoded.selectedFunctions;
  for(const text of inspections)yield {section:'binding-inspections',ordinal:inspectionCount++,text};
  yield {section:'rows',ordinal:at,text:encoded.text};
 }
 `+tail+String.raw`
 }
 const iterator=packets();return {next:()=>iterator.next(),return:()=>iterator.return(),verify(){if(!finished)fail('unfinished formatting packet stream');verifyFormattingInputs();}};
}
`;
 const original=source+'\n'+support+'\n'+template,language='// Generated detached complete formatting packet DATA; original materialized APIs unchanged.\n'+copied+'\n'+supportImports+'\n'+same+'\n'+record+'\n'+inspectionFail+'\n'+inspection+'\n'+generated,after=once(language,'export function iterateOriginalSourceBackedFormattingPacketData(','export function iterateSourceBackedCoreFormattingCorpusPackets(');
 native(ts,OUTPUT,language);native(ts,OUTPUT,after);const before=transportConcreteSyntaxSource(original,{language:'JavaScript'}),run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[rule(original,language,'javascript:copy-complete-formatting-producer-and-detach-per-file-packets')],repositoryRules:[rule(language,after,'router:preserve-formatting-schema-and-name-detached-packet-api')]}),afterMeta=serializeConcreteSyntaxMeta(run.value),last=transportConcreteSyntaxMeta(afterMeta);if(last.source!==after)fail('complete packet producer CST differs');
 const inverse=applyConcreteSyntaxSubstitutions(last.document,{languageRules:[rule(after,original,'javascript:restore-all-original-complete-formatting-and-packet-sources')],repositoryRules:[]});if(transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(inverse.value)).source!==original)fail('whole packet source inverse differs');let current=null;try{current=readFileSync(resolve(root,OUTPUT),'utf8');}catch(error){if(error.code!=='ENOENT')throw error;}
 return {schema:'source-backed-formatting-packet-source-preparation-v1',typescriptVersion:ts.version,inputs:[{path:SOURCE,source},{path:SUPPORT,source:support},{path:TEMPLATE,source:template}],files:[{path:OUTPUT,current,original,language,after,beforeMeta:before.meta,afterMeta,inverse:original,trace:run.trace}],allOriginalMaterializedFunctionsUnchanged:true,newAcrossInvocationCache:false,sourceAuthority:false,executableAdmission:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check','--write'].includes(args[0]))fail('usage: prepare-source-backed-formatting-packets.mjs --emit|--check|--write');const plan=prepareSourceBackedFormattingPackets();if(args[0]==='--emit')console.log(JSON.stringify(plan));else if(args[0]==='--write'){for(const row of plan.files)writeFileSync(resolve(ROOT,row.path),row.after);console.log('Prepared detached complete formatting packet producer.');}else{if(plan.files.some(row=>row.current!==row.after))fail('generated formatting packet producer is stale');console.log('Formatting packet producer is current.');}
}
