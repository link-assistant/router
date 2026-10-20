// Generated detached complete formatting packet DATA; original materialized APIs unchanged.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {rustTokens,sourceItems} from './rust-structure.mjs';
import {macroProvenance} from './macro-provenance.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {crateModuleSourcePath} from './repository-layout.mjs';
import {resolve,join,dirname,basename,posix} from 'node:path';
import {resolveModuleGraph} from './project.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from './router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-primitives.mjs';
const hash=source=>createHash('sha256').update(source).digest('hex');
const fail=message=>{throw new TypeError('Core formatting migration: '+message);};
const attributeNames=new Set(['doc','must_use','cfg','allow','warn','deny','forbid','inline','cold','test']);
function attributes(tokens,{macroUse=false}={}){
  for(let at=0;at<tokens.length;at++)if(tokens[at].text==='#'&&(tokens[at+1]?.text==='['||tokens[at+1]?.text==='!')){
    const open=at+(tokens[at+1].text==='!'?2:1),name=tokens[open+1]?.text;
    if(!attributeNames.has(name)&&!(macroUse&&name==='macro_use'))fail('unknown attribute producer '+name);
    let depth=1;at=open+1;for(;at<tokens.length&&depth;at++){if(tokens[at].text==='[')depth++;if(tokens[at].text===']')depth--;}
    if(depth)fail('unclosed attribute');at--;
  }
}
function sourceMap(value){
  if(!value||typeof value!=='object'||types.isProxy(value)||Array.isArray(value)||![null,Object.prototype].includes(Object.getPrototypeOf(value)))fail('macro sources require own primitive data');
  const result=Object.create(null),keys=Reflect.ownKeys(value);let size=0;
  if(keys.length>64)fail('too many imported macro source modules');
  for(const key of keys){
    if(typeof key!=='string'||!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(key))fail('invalid macro module name');
    const row=Object.getOwnPropertyDescriptor(value,key);if(!row||!Object.hasOwn(row,'value')||typeof row.value!=='string')fail('macro sources require own primitive data');size+=row.value.length;if(size>2_000_000)fail('imported macro source budget exceeded');result[key]=row.value;
  }
  return result;
}
function binding(source,rootSource,macroSources){
  attributes(rustTokens(source));
  const evidence=macroProvenance(source);
  if(evidence.unresolvedImportScope||evidence.shadowedNames.includes('format')||evidence.importedNames.includes('format'))fail('format binding is ambiguous in the complete module');
  // A textual macro_use parent is resolved from its actual complete source.
  // Unknown producer attributes/globs remain refusals instead of a spelling grant.
  let root=rootSource;
  const imports=[];
  for(const item of sourceItems(rootSource)){
    const tokens=item.tokens.filter(token=>token.type!=='comment');attributes(tokens,{macroUse:true});
    if(tokens.some(token=>token.text==='macro_use')){
      if(tokens.map(token=>token.text).join('')!=='#[macro_use]mod'+item.name+';'||!Object.hasOwn(macroSources,item.name))fail('unresolved parent macro_use producer');
      const original=macroSources[item.name],facts=macroProvenance(original);attributes(rustTokens(original));
      if(facts.unresolvedImportScope||facts.shadowedNames.includes('format')||facts.importedNames.includes('format'))fail('parent imports a competing format macro');
      for(const producer of sourceItems(original))if(!['comment','macro_rules!','fn','struct','impl','use','type','enum','const','static'].includes(producer.term))fail('unknown imported macro producer');
      imports.push({name:item.name,source:original,sha256:hash(original)});
      root=root.slice(0,item.start)+' '.repeat(item.end-item.start)+root.slice(item.end);
    }else if(item.term==='opaque'&&tokens.some(token=>token.text==='!'||token.text.endsWith('!')))fail('unknown parent macro producer');
  }
  const parent=macroProvenance(root);
  if(parent.unresolvedImportScope||parent.shadowedNames.includes('format')||parent.importedNames.includes('format'))fail('parent format binding is ambiguous');
  return {module:evidence,parent,imports};
}
function migrateOriginalProducerFormatting(source,{rootSource='',macroUseSources={},inspection}={}){
  if(typeof source!=='string'||typeof rootSource!=='string'||source.length>2_000_000||rootSource.length>2_000_000)fail('bounded primitive complete source required');
  const macroSources=sourceMap(macroUseSources),before=transportConcreteSyntaxSource(source,{language:'Rust'}),scope=binding(inspection.source,inspection.rootSource,sourceMap(inspection.macroUseSources)),tokens=rustTokens(source).filter(token=>token.type!=='comment');
  const edits=[],functions=[],skipped=[];
  const shadows=name=>scope.module.importedNames.includes(name)||tokens.some((token,index)=>['type','struct','enum','trait','mod'].includes(token.text)&&tokens[index+1]?.text===name);
  const stringShadow=shadows('String'),strShadow=shadows('str');
  for(const item of sourceItems(source)){
    if(item.term!=='fn'||inspection.inactiveItemSpans.some(span=>item.start>=span[0]&&item.end<=span[1]))continue;
    const rows=item.tokens.filter(token=>token.type!=='comment'),fn=rows.findIndex(token=>token.text==='fn');
    let parameters=0,body=-1;
    for(let at=fn+2;at<rows.length;at++){
      if(rows[at].text==='(')parameters++;if(rows[at].text===')')parameters--;
      if(!parameters&&rows[at].text==='{'){body=at;break;}
    }
    if(body<0){skipped.push({span:[item.start,item.end],reason:'function body unavailable'});continue;}
    const selected=[];
    for(let at=body+1;at<rows.length-1;at++){
      const token=rows[at],next=rows[at+1],previous=rows[at-1];
      if((token.text==='format!'||token.text==='format'&&next.text==='!')&&previous?.text!=='::'&&previous?.text!=='#'){const end=token.text==='format!'?token.end:next.end;selected.push({span:[token.start,end],expected:source.slice(token.start,end),replacement:'crate::translation_core::format!'});}
    }
    if(!selected.length)continue;
    if(!strShadow)for(let at=fn+2;at<body;at++)if(rows[at].text==='str'&&(rows[at-1]?.text==='&'||rows[at-1]?.text==="'static"&&rows[at-2]?.text==='&'))selected.push({span:[rows[at].start,rows[at].end],expected:'str',replacement:'crate::translation_core::Str'});
    // Only the actual simple return token is adopted. Complex/borrowed/aliased
    // types keep their ordinary checker obligations and are never erased.
    const arrow=rows.findIndex((token,index)=>index<body&&(token.text==='->'||token.text==='-'&&rows[index+1]?.text==='>'));
    const result=arrow<0?-1:arrow+(rows[arrow].text==='->'?1:2);
    if(!stringShadow&&result>=0&&rows[result]?.text==='String'&&result+1===body)selected.push({span:[rows[result].start,rows[result].end],expected:'String',replacement:'crate::translation_core::Text'});
    edits.push(...selected);functions.push({name:item.name,span:[item.start,item.end],edits:selected.length});
  }
  edits.sort((a,b)=>a.span[0]-b.span[0]);
  const applied=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'format-adoption:retain-primitive-language-source',edits:[]}],repositoryRules:[{id:'router-core:qualify-formatting-interface',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value));
  const mapping=[];let old=0,current=0;
  for(const edit of edits){
    if(edit.span[0]>old){const size=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}
    mapping.push({kind:'substitution',before:[...edit.span],after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});current+=edit.replacement.length;old=edit.span[1];
  }
  if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});
  let reverse=after.source;for(let at=mapping.length-1;at>=0;at--){const row=mapping[at];if(row.kind==='substitution'){if(reverse.slice(...row.after)!==row.replacement)fail('inverse source association changed');reverse=reverse.slice(0,row.after[0])+row.expected+reverse.slice(row.after[1]);}}
  if(reverse!==source)fail('complete inverse differs');
  return {schema:'router-core-formatting-migration-v1',before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},rootSource,scope,functions,skipped,edits,mapping,trace:applied.trace,libraryImplementation:'untranslated-rust-std-format',migrationSemantics:'explicit-owned-API-adoption; implicit standard-library implementation is not translated or proved',executableAdmission:false};
}
const samePath=(left,right)=>left.length===right.length&&left.every((word,index)=>word===right[index]);
function inputFiles(files){
  if(!files||typeof files!=='object'||types.isProxy(files)||Array.isArray(files)||![null,Object.prototype].includes(Object.getPrototypeOf(files)))fail('complete own source map required');
  const keys=Reflect.ownKeys(files);if(keys.length>4096)fail('source file count exceeded');
  const result=Object.create(null);let size=0;
  for(const path of keys){
    if(typeof path!=='string'||!path.endsWith('.rs')||path.length>4096||path.includes('\\')||/[\x00-\x1f:]/u.test(path)||posix.isAbsolute(path)||posix.normalize(path)!==path||path.split('/').some(part=>!part||part==='.'||part==='..'))fail('canonical relative Rust source path required');
    const row=Object.getOwnPropertyDescriptor(files,path);if(!row||!Object.hasOwn(row,'value')||typeof row.value!=='string'||row.value.length>2_000_000)fail('source rows require bounded primitive strings');
    size+=row.value.length;if(size>32*1024*1024)fail('complete source corpus budget exceeded');result[path]=row.value;
  }
  return result;
}
function context(module,graph){
  const ancestors=[];
  for(let depth=0;depth<module.path.length;depth++){
    const found=graph.modules.filter(candidate=>samePath(candidate.path,module.path.slice(0,depth)));
    if(found.length!==1||found[0].configurationCondition!=='active')fail('ancestor origin or configuration is ambiguous');
    ancestors.push(found[0]);
  }
  const sources=[],seen=new Set(),macroUseSources=Object.create(null),macroUseOrigins=[];
  for(const ancestor of ancestors){
    if(!seen.has(ancestor.file)){sources.push({path:ancestor.file,source:ancestor.source,sha256:hash(ancestor.source)});seen.add(ancestor.file);}
    for(const item of originalSourceModuleItems(ancestor))if(item.term==='mod'&&item.tokens.some(token=>token.text==='macro_use')){
      const children=graph.modules.filter(candidate=>samePath(candidate.path,[...ancestor.path,item.name]));
      if(children.length!==1||children[0].configurationCondition!=='active')fail('parent macro_use has no unique active complete source');
      const child=children[0];
      if(Object.hasOwn(macroUseSources,item.name)&&macroUseSources[item.name]!==child.source)fail('same-name parent macro imports have different source origins');
      macroUseSources[item.name]=child.source;macroUseOrigins.push({name:item.name,path:child.file,module:[...child.path],source:child.source,sha256:hash(child.source)});
    }
  }
  return {ancestors:sources,macroUseOrigins,rootSource:sources.map(row=>row.source).join('\n'),macroUseSources};
}
import {createEnclosingCoreAdoptionProducerContext,coreAdoptionProducerClosedAttributeSpans,finishCoreAdoptionProducerContext} from './core-adoption-producer-context.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
const formattingPacketSame=(a,b)=>a.length===b.length&&a.every((value,at)=>value===b[at]);
function formattingPacketRecord(input,allowed,bound,label){
 if(!input||typeof input!=='object'||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail(label+' own data required');
 const parent=Object.getPrototypeOf(input),names=Reflect.ownKeys(input);if(names.length>bound||names.some(name=>typeof name!=='string'||name==='stack'||allowed&&!allowed.includes(name)))fail(label+' fields differ');
 const rows=names.map(name=>[name,Object.getOwnPropertyDescriptor(input,name)]),value=Object.create(null);for(const [name,d]of rows){if(!d||!Object.hasOwn(d,'value'))fail(label+' own data required');value[name]=d.value;}
 return {value,verify(){if(Object.getPrototypeOf(input)!==parent||!formattingPacketSame(Reflect.ownKeys(input),names))fail(label+' changed');for(const [name,a]of rows){const b=Object.getOwnPropertyDescriptor(input,name);if(!b||!Object.hasOwn(b,'value')||b.value!==a.value||b.enumerable!==a.enumerable||b.writable!==a.writable||b.configurable!==a.configurable)fail(label+' changed');}}};
}
const formattingPacketInspectionFail=message=>{throw new TypeError('Source-backed formatting inspection: '+message);};
function createFormattingPacketInspection(graph,dependencyInputs){
 const modules=graph.modules,originals=modules.map(module=>({module,source:module.source,file:module.file,path:JSON.stringify(module.path),view:module.sourceView,condition:module.configurationCondition}));
 const context=createEnclosingCoreAdoptionProducerContext({modules,compilationProfile:graph.compilationProfile,dependencyInputs}),inspections=new Map(),pending=[];
 function verify(){if(modules.length!==originals.length||originals.some((row,at)=>modules[at]!==row.module||row.module.source!==row.source||row.module.file!==row.file||JSON.stringify(row.module.path)!==row.path||row.module.sourceView!==row.view||row.module.configurationCondition!==row.condition))formattingPacketInspectionFail('complete original module graph changed');}
 function inspect(path,source){
  verify();if(inspections.has(path)){const row=inspections.get(path);if(row.beforeSource!==source)formattingPacketInspectionFail('same physical source has different original bytes');return row;}
  const owners=modules.filter(module=>module.file===path);if(!owners.length||owners.some(module=>module.source!==source))formattingPacketInspectionFail('inspection source has no complete original module association');
  const inactiveCandidates=[];
  for(const module of owners){
   if(module.configurationCondition==='inactive')continue;
   for(const item of originalSourceModuleItems(module)){
    const condition=itemConfiguration(item.tokens,graph.compilationProfile);
    if(condition.status==='inactive'){inactiveCandidates.push({span:[item.start,item.end],expected:source.slice(item.start,item.end),module:[...module.path],sourceViewDigest:module.sourceView?.digest??null,condition});continue;}
    if(item.term==='opaque'&&item.tokens.some(token=>token.text==='!'||token.text.endsWith('!')))formattingPacketInspectionFail('unknown original module macro producer');
   }
  }
  const inactiveItems=[];for(const row of inactiveCandidates.sort((left,right)=>left.span[0]-right.span[0]||right.span[1]-left.span[1])){const previous=inactiveItems.at(-1);if(previous&&row.span[0]<previous.span[1]){if(row.span[1]>previous.span[1])formattingPacketInspectionFail('inactive original source spans overlap');continue;}inactiveItems.push(row);}
  const selected=owners.flatMap(module=>coreAdoptionProducerClosedAttributeSpans(context,module)),unique=new Map();
  for(const row of selected){const key=JSON.stringify(row.span),previous=unique.get(key);if(previous&&JSON.stringify(previous)!==JSON.stringify(row))formattingPacketInspectionFail('original attribute associations differ');unique.set(key,row);}
  const attributes=[...unique.values()].filter(row=>!inactiveItems.some(item=>row.span[0]>=item.span[0]&&row.span[1]<=item.span[1])).sort((left,right)=>left.span[0]-right.span[0]),edits=[...attributes,...inactiveItems].sort((left,right)=>left.span[0]-right.span[0]).map(row=>({span:row.span,expected:row.expected,replacement:row.expected.replace(/[^\r\n]/g,' ')}));
  for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])formattingPacketInspectionFail('original producer attributes overlap or differ');
  const before=transportConcreteSyntaxSource(source,{language:'Rust'}),run=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'rust:inspect-original-closed-producers-and-inactive-items',edits}],repositoryRules:[{id:'router:retain-original-attributes-and-items-in-formatting-proposals',edits:[]}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(run.value));
  let inverse=after.source;for(const edit of [...edits].reverse()){if(inverse.slice(...edit.span)!==edit.replacement)formattingPacketInspectionFail('inspection inverse association changed');inverse=inverse.slice(0,edit.span[0])+edit.expected+inverse.slice(edit.span[1]);}if(inverse!==source)formattingPacketInspectionFail('complete inspection inverse differs');
  const row={path,before:{source,meta:before.meta},after:{source:after.source,meta:after.meta},attributes,inactiveItems,edits,inverse,trace:run.trace,sourceInspectionOnly:true,executableAdmission:false};const encoded={beforeSource:source,afterSource:after.source,inactiveItemSpans:inactiveItems.map(row=>[...row.span])};pending.push(JSON.stringify(row)+'\n');inspections.set(path,encoded);return encoded;
 }
 return {forModule(path,scope){
  const owner=modules.find(module=>module.file===path);if(!owner)formattingPacketInspectionFail('original formatter source absent');
  const source=inspect(path,owner.source).afterSource,rootSource=scope.ancestors.map(row=>inspect(row.path,row.source).afterSource).join('\n'),macroUseSources=Object.create(null);
  for(const row of scope.macroUseOrigins){const normalized=inspect(row.path,row.source).afterSource;if(Object.hasOwn(macroUseSources,row.name)&&macroUseSources[row.name]!==normalized)formattingPacketInspectionFail('macro import inspection origins differ');macroUseSources[row.name]=normalized;}
  return {source,rootSource,macroUseSources,inactiveItemSpans:inspect(path,owner.source).inactiveItemSpans};
 },takePackets(){verify();return pending.splice(0);},finish(){verify();if(pending.length)formattingPacketInspectionFail('undrained complete inspection packets');return {producerEffects:finishCoreAdoptionProducerContext(context),bindingInspections:[]};}};
}
export function iterateSourceBackedCoreFormattingCorpusPackets(options={}){
 const supplied=formattingPacketRecord(options,['entry','files','compilationProfile','dependencyInputs'],4,'options'),{entry='src/lib.rs',files,compilationProfile=PRODUCTION_PROFILE,dependencyInputs}=supplied.value,captured=formattingPacketRecord(files,null,4096,'files'),dependencies=dependencyInputs===undefined?null:formattingPacketRecord(dependencyInputs,['manifest','lock'],2,'dependency inputs');
  const original=inputFiles(captured.value);if(typeof entry!=='string'||!Object.hasOwn(original,entry))fail('actual tracked entry source required');
  const paths=Object.keys(original).sort(),graph=resolveModuleGraph({entry,paths,readSource:path=>original[path],compilationProfile}),inspection=createFormattingPacketInspection(graph,dependencies?.value);
  const roots=graph.modules.filter(module=>module.path.length===0),cores=graph.modules.filter(module=>samePath(module.path,['translation_core'])),leaves=graph.modules.filter(module=>samePath(module.path,['translation_core','primitives']));
  if(roots.length!==1||cores.length!==1||leaves.length!==1||cores[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core.rs')||cores[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaves[0].file!==crateModuleSourcePath(graph.modules,'src/translation_core/primitives.rs')||leaves[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||cores[0].configurationCondition!=='active'||leaves[0].configurationCondition!=='active')fail('actual complete owned facade and primitive leaf must be present before corpus adoption');
  const declarations=originalSourceModuleItems(roots[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');
  if(declarations.length!==1||roots[0].source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_core;')fail('actual unadorned public core declaration required');
  if(originalSourceModuleItems(roots[0]).some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_core')))fail('competing root core alias is unsupported');
  
 const summary={files:paths.length,proposed:0,unchanged:0,skipped:0,selectedFunctions:0};let finished=false,inspectionCount=0;
 const packet=(section,ordinal,value)=>({section,ordinal,text:JSON.stringify(value)+'\n'});
 function verifyFormattingInputs(){dependencies?.verify();captured.verify();supplied.verify();}
 function encodeFormattingRow(row){return {text:JSON.stringify(row)+'\n',status:row.status,selectedFunctions:row.proposal?.functions.length??0};}
 function encodedFormattingFile(path){
    // Inline views are retained by the graph, but the existing per-file rule
    // selects only free functions in the physical module's top-level body.
    const origins=graph.modules.filter(module=>module.file===path&&module.sourceView?.modulePath.length===0),originFacts=origins.map(module=>({module:[...module.path],condition:module.configurationCondition,sourceViewDigest:module.sourceView.digest}));
    if(origins.length!==1){return encodeFormattingRow({path,status:'skipped',reason:origins.length?'multiple physical module origins':'not in the actual entry module graph',origins:originFacts});}
    const module=origins[0];
    if(module.configurationCondition!=='active'){return encodeFormattingRow({path,status:'skipped',reason:'module configuration is not active',origins:originFacts});}
    const candidates=originalSourceModuleItems(module).filter(item=>item.term==='fn').some(item=>{
      const tokens=item.tokens.filter(token=>token.type!=='comment');
      return tokens.some((token,index)=>(token.text==='format!'||token.text==='format'&&tokens[index+1]?.text==='!')&&!['::','#'].includes(tokens[index-1]?.text));
    });
    if(!candidates){return encodeFormattingRow({path,status:'unchanged',reason:'no bare format macro in the supported top-level function domain',origins:originFacts});}
    let scope,proposal;
    try{scope=context(module,graph);proposal=migrateOriginalProducerFormatting(original[path],{rootSource:scope.rootSource,macroUseSources:scope.macroUseSources,inspection:inspection.forModule(path,scope)});}
    catch(error){if(!(error instanceof TypeError))throw error;return encodeFormattingRow({path,status:'skipped',reason:error.message,origins:originFacts,...(scope?{scope}:{} )});}
    if(proposal.before.source!==original[path])fail('complete original source association changed');
    return encodeFormattingRow({path,status:proposal.edits.length?'proposed':'unchanged',origins:originFacts,scope,proposal,
      untouchedInlineModules:graph.modules.filter(candidate=>candidate.file===path&&candidate.sourceView?.modulePath.length).map(candidate=>({module:[...candidate.path],bodySpan:candidate.sourceView.bodySpan,reason:'inline module function traversal is outside this initial per-file rule'}))});
  }
 function* packets(){
 for(let at=0;at<paths.length;at++){
  const encoded=encodedFormattingFile(paths[at]),inspections=inspection.takePackets();summary[encoded.status]++;summary.selectedFunctions+=encoded.selectedFunctions;
  for(const text of inspections)yield {section:'binding-inspections',ordinal:inspectionCount++,text};
  yield {section:'rows',ordinal:at,text:encoded.text};
 }
 
  const inputs=paths.map(path=>({path,source:original[path],sha256:hash(original[path])}));
  const finishedInspection=inspection.finish(),result={schema:'router-owned-source-backed-formatting-corpus-proposal-v1',...finishedInspection,entry,compilationProfile:graph.compilationProfile,inputs,rows:[],summary,moduleEdges:graph.edges,moduleDiagnostics:graph.diagnostics,
    semanticAdmission:false,migrationSemantics:'maintainer-authorized source adoption; all checked source/meta/target obligations remain',libraryImplementation:'untranslated-rust-std-format'};
 verifyFormattingInputs();
 for(let at=0;at<inputs.length;at++)yield packet('inputs',at,inputs[at]);
 yield packet('module-edges',0,result.moduleEdges);yield packet('module-diagnostics',0,result.moduleDiagnostics);
 const keys=Object.keys(result),excluded=new Set(['inputs','rows','bindingInspections','moduleEdges','moduleDiagnostics']),values={};for(const key of keys)if(!excluded.has(key))values[key]=result[key];
 yield packet('metadata',0,{keys,values});verifyFormattingInputs();finished=true;
 return {summary:{...summary},counts:{rows:paths.length,bindingInspections:inspectionCount}};

 }
 const iterator=packets();return {next:()=>iterator.next(),return:()=>iterator.return(),verify(){if(!finished)fail('unfinished formatting packet stream');verifyFormattingInputs();}};
}
