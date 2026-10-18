// Complete checked definition source proposals. Pairing below validates DATA;
// it issues no owned item and never permits erasing runtime guards on reversal.
import {createHash} from 'node:crypto';
import {JSON_DATA} from './extensions/json-contracts.mjs';
import {valueSchema} from './type-layout.mjs';
import {annotateRuntimeTypes} from './translate.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {transportConcreteSyntaxSources} from './concrete-syntax-meta.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {ownedJsonReaderOperation} from './js-to-rust/owned-json-source.mjs';
import {prepareOwnedCorePairedTypes} from './js-to-rust/owned-core-paired-types.mjs';
const fail=message=>{throw TypeError('Forward JSON reader definition: '+message);};
const hash=value=>{assertReverseConcreteSourceHost();const result=createHash('sha256').update(value).digest('hex');assertReverseConcreteSourceHost();return result;};
const roles=['Value','Number','MapEntry','Map_String_Value'];
const ordered=value=>Array.isArray(value)?value.map(ordered):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
const same=(a,b)=>JSON.stringify(ordered(a))===JSON.stringify(ordered(b));
function renamed(value,names){
 if(Array.isArray(value))return value.map(child=>renamed(child,names));
 if(!value||typeof value!=='object')return value;
 return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,key==='name'&&typeof child==='string'&&names.has(child)?names.get(child):key==='path'&&Array.isArray(child)&&names.has(child.filter((part,at)=>at!==0||part!=='crate').join('.'))?['crate',names.get(child.filter((part,at)=>at!==0||part!=='crate').join('.'))]:renamed(child,names)]));
}
function canonicalLayouts(checked,target,lowered){
 const sourceNames=new Map(),targetNames=new Map(),sourceData=new Map(),targetData=new Map(),lowerData=new Map();
 for(const role of roles){
  const path='serde_json::'+role,rows=[...checked.declarations.values()].filter(row=>row.k==='data'&&row.generated==='router-json-contract'&&row.hostTypePath?.join('::')===path);
  if(rows.length!==1)fail('actual canonical JSON source owner absent or ambiguous');
  const source=rows[0],name=target.names.get(source.fullName),current=target.program.declarations.get(name),actual=lowered.program.declarations.get(name);
  if(!current||!actual||current.generated!=='router-project-flattened'||actual.generated!=='router-project-flattened'||current.hostTypePath?.join('::')!==path||actual.hostTypePath?.join('::')!==path)fail('actual canonical JSON target owner differs');
  sourceNames.set(source.fullName,'serde_json.'+role);targetNames.set(name,'serde_json.'+role);sourceData.set(source.fullName,source);targetData.set(name,current);lowerData.set(name,actual);
 }
 const expected=new Map(JSON_DATA[0].items.filter(row=>roles.includes(row.name)).map(row=>['serde_json.'+row.name,{...row,fullName:'serde_json.'+row.name}]));
 const schema=(data,names)=>{const all=valueSchema(data);return {schemaVersion:all.schemaVersion,types:Object.fromEntries([...names].map(([name,registered])=>[registered,renamed(all.types[name],names)]))};};
 const wanted=schema(expected,new Map([...expected.keys()].map(name=>[name,name])));
 for(const [data,names]of [[sourceData,sourceNames],[targetData,targetNames],[lowerData,targetNames]])if(!same(schema(data,names),wanted))fail('complete canonical JSON layouts differ');
 return {sourceNames,targetNames};
}
function directReader(entry){
 if(!entry||entry.k!=='fn'||entry.async||!entry.params.length||entry.params.length>2)return null;
 const call=entry.body,op=call?.k==='routerHostCall'&&ownedJsonReaderOperation(call.id);
 if(!op||call.args.length!==entry.params.length||op.args.length!==entry.params.length)return null;
 for(let at=0;at<call.args.length;at++){
  let arg=call.args[at];
  if(arg.k==='routerStandardSharedReceiver'){
   if(arg.sourceReceiverCopy?.profile!=='rust-1.89-shared-reference-copy'||arg.sourceReceiverCopy.contract!==call.id||arg.object?.k!=='var')return null;
   arg=arg.object;
  }
  if(arg.k!=='var'||arg.name!==entry.params[at].name||!same(arg.type,entry.params[at].type))return null;
 }
 return {call,op};
}
function nativeModule(ts,path,source,kind,target){
 if(typeof source!=='string'||Buffer.byteLength(source)>1048576)fail('complete module byte bound');
 const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,kind);if(file.parseDiagnostics.length)fail('complete native definition syntax');
 const targets=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===target);
 if(targets.length!==1||!targets[0].body||targets[0].asteriskToken||targets[0].typeParameters?.length||targets[0].parameters.length<1||targets[0].parameters.length>2)fail('actual ordinary parameterized target absent');
 for(const node of file.statements){
  if(ts.isEmptyStatement(node)||ts.isTypeAliasDeclaration(node))continue;
  if(ts.isFunctionDeclaration(node)){if(!node.body||node.asteriskToken)fail('unsupported emitted helper');continue;}
  if(ts.isVariableStatement(node)){
   if((node.declarationList.flags&ts.NodeFlags.BlockScoped)!==ts.NodeFlags.Const||node.modifiers?.length||node.declarationList.declarations.some(row=>!ts.isIdentifier(row.name)||!/^ml_host_value_(?:schema|refinements)_[a-f0-9]{64}$/u.test(row.name.text)||!row.initializer))fail('unknown emitted module setup');continue;
  }
  if(!ts.isImportDeclaration(node)||!node.importClause?.namedBindings||!ts.isNamedImports(node.importClause.namedBindings)||!ts.isStringLiteral(node.moduleSpecifier)||!['json-runtime.mjs','json-values.mjs','type-layout-runtime.mjs','iterator-runtime.mjs','copy-runtime.mjs'].some(name=>node.moduleSpecifier.text==='../runtime/'+name))fail('unsupported emitted import or startup');
 }
 return {file,fn:targets[0]};
}
function tokens(ts,source){
 const scanner=ts.createScanner(ts.ScriptTarget.Latest,false,ts.LanguageVariant.Standard,source),rows=[];
 for(let kind=scanner.scan();kind!==ts.SyntaxKind.EndOfFileToken;kind=scanner.scan())if(kind!==ts.SyntaxKind.WhitespaceTrivia&&kind!==ts.SyntaxKind.NewLineTrivia){if(rows.length>=200000)fail('paired token budget');rows.push({kind,text:scanner.getTokenText(),start:scanner.getTokenPos(),end:scanner.getTextPos()});}
 return rows;
}
/** Source DATA equality only; callers must still perform semantic admission. */
export function prepareForwardJsonReaderPair(javascriptPath,javascript,typescriptPath,typescript){
 assertReverseConcreteSourceHost();
 if([javascriptPath,typescriptPath,javascript,typescript].some(value=>typeof value!=='string')||Buffer.byteLength(javascript)>1048576||Buffer.byteLength(typescript)>1048576)fail('complete paired primitive source bound');
 const batch=transportConcreteSyntaxSources([{source:javascript,language:'JavaScript'},{source:typescript,language:'TypeScript'}]);
 if(batch.rows[0].source!==javascript||batch.rows[1].source!==typescript)fail('whole paired CST reconstruction differs');
 const ts=ownershipCompiler(),js=ts.createSourceFile(javascriptPath,javascript,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),typed=ts.createSourceFile(typescriptPath,typescript,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
 if(js.parseDiagnostics.length||typed.parseDiagnostics.length)fail('paired native syntax');
 const stream=tokens(ts,typescript),edits=[];let cells=0;
 function erase(start,end,kind){if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=end||end>typescript.length)fail('paired erasure span');edits.push({kind,span:[start,end],expected:typescript.slice(start,end)});}
 function annotation(type){if(!type)return;const start=type.getStart(typed);let low=0,high=stream.length;while(low<high){const middle=low+((high-low)>>>1);if(stream[middle].end<=start)low=middle+1;else high=middle;}const prior=stream[low-1];if(prior?.kind!==ts.SyntaxKind.ColonToken)fail('native type annotation colon');erase(prior.start,type.end,'annotation');}
 function visit(node,depth){
  if(++cells>200000||depth>256)fail('paired syntax budget');
  if(ts.isTypeAliasDeclaration(node)){erase(node.getStart(typed),node.end,'type-alias');return;}
  if(ts.isTypeNode(node))return;
  if(ts.isImportDeclaration(node)){if(node.importClause?.isTypeOnly)erase(node.getStart(typed),node.end,'type-import');else if(node.importClause?.namedBindings&&ts.isNamedImports(node.importClause.namedBindings)&&node.importClause.namedBindings.elements.some(row=>row.isTypeOnly))fail('mixed type-only import');return;}
  if(ts.isFunctionDeclaration(node)){
   if(!node.name||!node.body||node.typeParameters?.length)fail('unsupported paired function form');annotation(node.type);
  }else if(ts.isParameter(node)||ts.isVariableDeclaration(node))annotation(node.type);
  if(ts.isAsExpression(node)){erase(node.expression.end,node.end,'checked-type-assertion');visit(node.expression,depth+1);return;}
  if(node.typeParameters?.length||node.typeArguments?.length||ts.isTypeAssertionExpression(node)||ts.isNonNullExpression(node)||ts.isSatisfiesExpression(node)||ts.isInterfaceDeclaration(node)||ts.isEnumDeclaration(node)||ts.isModuleDeclaration(node))fail('unsupported executable TypeScript form');
  ts.forEachChild(node,child=>{visit(child,depth+1);});
 }
 for(const node of typed.statements){if(!ts.isImportDeclaration(node)&&!ts.isTypeAliasDeclaration(node)&&!ts.isFunctionDeclaration(node)&&!ts.isVariableStatement(node)&&!ts.isEmptyStatement(node))fail('unsupported paired top-level source');visit(node,0);}
 edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=1;at<edits.length;at++)if(edits[at-1].span[1]>edits[at].span[0])fail('overlapping native erasure');
 let erased=typescript;for(const row of [...edits].reverse())erased=erased.slice(0,row.span[0])+erased.slice(row.span[1]);
 const left=tokens(ts,javascript),right=tokens(ts,erased);if(left.length!==right.length||left.some((row,at)=>row.kind!==right[at].kind||row.text!==right[at].text))fail('whole executable tokens differ');
 const erasedFile=ts.createSourceFile(javascriptPath,erased,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(erasedFile.parseDiagnostics.length)fail('erased native syntax');
 const pending=[[js,erasedFile,0]];let nodes=0;
 while(pending.length){const [a,b,depth]=pending.pop();if(++nodes>200000||depth>256)fail('whole native topology budget');if(a.kind!==b.kind)fail('whole executable topology differs');const x=[],y=[];ts.forEachChild(a,node=>{x.push(node);});ts.forEachChild(b,node=>{y.push(node);});if(x.length!==y.length)fail('whole executable topology differs');for(let at=0;at<x.length;at++)pending.push([x[at],y[at],depth+1]);}
 let inverse=erased,removed=0;for(const row of edits){row.afterSpan=[row.span[0]-removed,row.span[0]-removed];removed+=row.span[1]-row.span[0];}for(const row of [...edits].reverse())inverse=inverse.slice(0,row.afterSpan[0])+row.expected+inverse.slice(row.afterSpan[0]);if(inverse!==typescript)fail('complete paired type inverse differs');
 assertReverseConcreteSourceHost();return {schema:'forward-json-reader-paired-source-data-v1',javascript:{path:javascriptPath,source:javascript,meta:batch.rows[0].meta},typescript:{path:typescriptPath,source:typescript,meta:batch.rows[1].meta},erasure:{source:erased,edits,wholeUndo:true},semanticAuthority:false,guardedReverseAdmission:false};
}
/** Called by the existing real checked project branch, never an issuer API. */
export function prepareForwardJsonReaderDefinition({project,entry,checked,target,sourceModules,lower,index,transform,format}){
 if(format!==undefined&&format!=='core-reader')fail('unknown explicit reader target format');
 const original=checked.declarations.get(entry.name),current=target.program.declarations.get(target.names.get(entry.name));
 const selected=entry.term==='fn'&&directReader(original),actual=directReader(current);if(!selected||!actual||selected.call.id!==actual.call.id)return null;
 const lowered=lower(entry),emittedReader=directReader(lowered.own);if(!emittedReader||emittedReader.call.id!==selected.call.id)fail('fresh lowered direct reader differs');
 const {sourceNames,targetNames}=canonicalLayouts(checked,target,lowered),allNames=new Map([...target.names].map(([name,flat])=>[name,flat]));
 for(const [before,after]of [[original,current],[current,lowered.own]]){
  const normalize=before===original?value=>renamed(value,allNames):value=>value;
  if(before.params.length!==after.params.length||before.params.some((param,at)=>!same(normalize(param.type),after.params[at].type))||!same(normalize(before.ret),after.ret))fail('full checked source signature or ownership differs');
 }
 const receiver=original.params[0].type;if(receiver.kind!=='data'||sourceNames.get(receiver.name)!=='serde_json.Value'||receiver.rustReference?.kind!=='shared'||receiver.rustReference.pointee?.kind!=='data'||sourceNames.get(receiver.rustReference.pointee.name)!=='serde_json.Value')fail('requires actual shared canonical JSON input');
 const mappings=lowered.emitted.mappings.filter(row=>row.source===lowered.own.fullName);if(mappings.length!==1)fail('actual emitted mapping absent or ambiguous');const mapping=mappings[0];
 const parents=sourceModules.filter(module=>module.file===entry.file&&module.path.join('.')===entry.path.join('.'));if(parents.length!==1)fail('actual physical source parent absent or ambiguous');const parent=parents[0];
 if(!Number.isSafeInteger(entry.span.start)||!Number.isSafeInteger(entry.span.end)||entry.span.start<0||entry.span.start>=entry.span.end||entry.span.end>parent.source.length)fail('physical declaration span');
 const sourceHash=hash(parent.source),parentId=entry.file+':'+sourceHash,stem='definition_'+index,javascriptPath='app/owned-definitions/'+stem+'.mjs',typescriptPath='typed/owned-definitions/'+stem+'.mts',ts=ownershipCompiler(),javascript=lowered.emitted.text,js=nativeModule(ts,javascriptPath,javascript,ts.ScriptKind.JS,mapping.target);
 const declarations=[...lowered.program.declarations.values()],data=declarations.filter(row=>row.k==='data'),params=new Map([[mapping.target,lowered.own.params]]),returns=new Map([[mapping.target,lowered.own.ret]]),typescript=annotateRuntimeTypes(javascript,params,data,returns,lowered.emitted.checkedLocalBindings??[]),typed=nativeModule(ts,typescriptPath,typescript,ts.ScriptKind.TS,mapping.target);
 if(js.fn.parameters.length!==original.params.length||typed.fn.parameters.length!==original.params.length||!typed.fn.type||typed.fn.parameters.some(param=>!param.type))fail('complete checked parameter annotations absent');
 const pipeline=createRulePipeline([{phase:'language',rules:[{id:'forward-json-reader:complete-current-emitted-cst',apply:()=>({javascript,typescript})}]},{phase:'repository',rules:[{id:'forward-json-reader:export-only-whole-guarded-definition',apply:value=>({javascript:transform(value.javascript,[{start:js.fn.getStart(js.file),end:js.fn.getStart(js.file),replacement:'export '}],'JavaScript'),typescript:transform(value.typescript,[{start:typed.fn.getStart(typed.file),end:typed.fn.getStart(typed.file),replacement:'export '}],'TypeScript')})}]}]),result=pipeline.run(null),pair=prepareForwardJsonReaderPair(javascriptPath,result.value.javascript.after.source,typescriptPath,result.value.typescript.after.source);
 const source=parent.source.slice(entry.span.start,entry.span.end),identity=Buffer.from(JSON.stringify([project,entry.file,sourceHash,entry.name,entry.span]),'utf8').toString('hex');
 assertReverseConcreteSourceHost();const candidate={row:{identity,name:entry.name,source:entry.file,sourceSha256:sourceHash,span:entry.span,original:{parent:parentId,source,sha256:hash(source)},javascriptPath,typescriptPath,target:mapping.target,canonicalAbi:'registered-json-reader-definition-v1',reader:selected.call.id,signature:{original:{params:original.params,ret:original.ret},target:{params:current.params,ret:current.ret},lowered:{params:lowered.own.params,ret:lowered.own.ret}},canonicalNames:{source:[...sourceNames],target:[...targetNames]},javascript:result.value.javascript,typescript:result.value.typescript,pair,trace:result.trace,semanticAuthority:false,guardedReverseAdmission:false,applicationEffectCompleteness:false,moduleStartupEquivalent:false},parent:{id:parentId,file:entry.file,source:parent.source,sha256:sourceHash}};
 return format==='core-reader'?directCoreReaderTarget(candidate,transform):candidate;
}

// A NEW repository representation, not deletion of checks from old JS. This
// private function is reached only after the genuine fresh source/target/lower
// checks above. Its output receives no authority from any public DATA field.
function directCoreReaderTarget(candidate,transform){
 const guarded=candidate.row,operation=ownedJsonReaderOperation(guarded.reader),arity=guarded.signature.original.params.length;
 if(!operation||operation.args.length!==arity||arity<1||arity>2)fail('checked core reader signature changed');
 const args=Array.from({length:arity},(_,at)=>'input'+at),preamble='import {__core_operation as core_reader} from "../runtime/json-runtime.mjs";\n';
 const javascript=preamble+'function core_definition('+args.join(', ')+'){return core_reader('+args.join(', ')+');}\n';
 const typescript=preamble+'function core_definition('+args.map((name,at)=>name+': Parameters<typeof core_reader>['+at+']').join(', ')+'): ReturnType<typeof core_reader>{return core_reader('+args.join(', ')+');}\n';
 const ts=ownershipCompiler();
 function bind(source,path,kind,language){
  const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,kind);if(file.parseDiagnostics.length||file.statements.length!==2)fail('new core reader template syntax');
  const [imported,fn]=file.statements,leaf=ts.isImportDeclaration(imported)&&imported.importClause?.namedBindings&&ts.isNamedImports(imported.importClause.namedBindings)&&imported.importClause.namedBindings.elements;
  if(!leaf||leaf.length!==1||leaf[0].propertyName?.text!=='__core_operation'||leaf[0].name.text!=='core_reader'||!ts.isFunctionDeclaration(fn)||fn.name?.text!=='core_definition'||fn.parameters.length!==arity||!fn.body||fn.body.statements.length!==1||!ts.isReturnStatement(fn.body.statements[0]))fail('new complete core reader template changed');
  return transform(source,[{start:leaf[0].propertyName.getStart(file),end:leaf[0].propertyName.end,replacement:operation.name},{start:fn.getStart(file),end:fn.getStart(file),replacement:'export '},{start:fn.name.getStart(file),end:fn.name.end,replacement:guarded.target}],language);
 }
 const pipeline=createRulePipeline([
  {phase:'language',rules:[{id:'checked-json-reader:complete-new-ABI-template',apply:()=>({javascript,typescript,operation:operation.name,arity,signature:guarded.signature,parameterCorrespondence:args.map((target,index)=>({source:guarded.signature.original.params[index].name,target,index}))})}]},
  {phase:'repository',rules:[{id:'router-json-reader:bind-actual-core-import-and-definition',apply:value=>({...value,javascript:bind(value.javascript,guarded.javascriptPath,ts.ScriptKind.JS,'JavaScript'),typescript:bind(value.typescript,guarded.typescriptPath,ts.ScriptKind.TS,'TypeScript')})}]},
 ]),result=pipeline.run(null),pair=prepareOwnedCorePairedTypes(guarded.javascriptPath,result.value.javascript.after.source,guarded.typescriptPath,result.value.typescript.after.source);
 const identity=Buffer.from(JSON.stringify([guarded.identity,'direct-core-json-reader-definition-v1']),'utf8').toString('hex');
 assertReverseConcreteSourceHost();return {parent:candidate.parent,row:{...guarded,identity,canonicalAbi:'registered-json-reader-core-definition-v1',targetFormat:'direct-shared-core-reader-v1',javascript:result.value.javascript,typescript:result.value.typescript,pair,trace:result.trace,parameterCorrespondence:result.value.parameterCorrespondence,retainedGuardedEmission:{javascript:guarded.javascript,typescript:guarded.typescript,pair:guarded.pair,trace:guarded.trace,signature:guarded.signature},oldGuardObservationEquivalent:false,newSourceRequiresIndependentReverseAdmission:true,semanticAuthority:false,moduleStartupEquivalent:false}};
}
