// Additive complete proof copy: fresh Git before/after checking during recovery.
import {resolve,posix} from 'node:path';
import {resolveModuleGraph,translateProject} from './project.mjs';
import {isTrackedModulePathPlan,isPlainSourceIdentifier} from './module-paths.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {captureSourceUnitGitBaseline,resolveSourceUnitGitBaseline} from './source-unit-git-baseline.mjs';
import {repositoryRustLayout} from './repository-layout.mjs';
import {PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {loadJsonMacroSourceProof} from './json-macro-sources.mjs';
import {loadDeriveDependencyProof} from './derive-dependencies.mjs';
import {parseDurableLeafCargoData} from './native-leaf-move-recovery-20261101-cargo.mjs';
import {createForwardProjectRuntimeMapping} from './forward-project-runtime-mapping.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
import {transportConcreteSourceEquations} from './concrete-source-equations.mjs';
import {createReconcileSourceCapture,relativeReconcilePath as path,requireReconcile as need,reconcileHead,ordinal,boundedReconcileWireBytes,RECONCILE_LIMITS} from './paired-sync-reconcile-20261101-support.mjs';
const SCHEMA='router-native-leaf-module-move-20261101-v1';
function descriptor(text,manifestPath){
 const value=JSON.parse(text),keys=['schema','id','entry','from','to','module','javascript','typescript','meta','baselineRevision'];need(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(key=>Object.hasOwn(value,key))&&value.schema===SCHEMA,'closed explicit leaf move descriptor required');
 need(typeof value.id==='string'&&/^[_a-zA-Z0-9-]{1,96}$/u.test(value.id)&&typeof value.module==='string'&&value.module.length<=96&&isPlainSourceIdentifier(value.module)&&/^[A-Za-z_][A-Za-z0-9_]*$/u.test(value.module),'bounded original plain module name required');
 for(const key of ['entry','from','to','javascript','typescript','meta'])path(value[key]);need(new Set([manifestPath,...['entry','from','to','javascript','typescript','meta'].map(key=>value[key])]).size===7,'distinct complete input/output paths required');
 need(value.from!==value.to&&posix.dirname(value.from)===posix.dirname(value.entry)&&posix.dirname(value.to)===posix.dirname(value.entry)&&[value.from,value.to].every(name=>/^[A-Za-z_][A-Za-z0-9_]*\.rs$/u.test(posix.basename(name))),'same-directory ordinary Rust leaf paths required');
 need(value.javascript.startsWith('js/src/')&&/\.m?js$/u.test(value.javascript)&&value.typescript.startsWith('ts/src/')&&/\.(?:mts|ts)$/u.test(value.typescript)&&value.meta.endsWith('.json'),'physical paired targets and review path required');return value;
}
function qualifiedGraph(options,unit,target){
 const graph=resolveModuleGraph(options);need(graph.diagnostics.length===0&&graph.modules.length===2&&graph.edges.length===1,'one completely resolved root-owned external leaf required');
 const root=graph.modules.find(row=>row.file===unit.entry&&row.path.length===0),leaf=graph.modules.find(row=>row.file===target&&row.path.length===1&&row.path[0]===unit.module),edge=graph.edges[0];
 need(root&&leaf&&edge.from===unit.entry&&edge.to===target&&edge.module.length===1&&edge.module[0]===unit.module&&!edge.kind&&!edge.macroUse&&isTrackedModulePathPlan(edge.pathSelection),'actual original external module selection required');
 need(root.configurationCondition==='active'&&leaf.configurationCondition==='active'&&!root.inactiveItems.length&&!leaf.inactiveItems.length,'unconditional complete source scope required');
 const rootItems=originalSourceModuleItems(root),leafItems=originalSourceModuleItems(leaf);need(rootItems.filter(row=>row.term==='mod').length===1&&rootItems.every(row=>['fn','mod'].includes(row.term))&&leafItems.length>0&&leafItems.every(row=>row.term==='fn'),'ordinary function-only root/leaf subset required');
 for(const item of [...rootItems,...leafItems]){
  if(item.term==='fn')need(!item.tokens.some(token=>['#','!','async','unsafe','extern','include','include_str','include_bytes','macro_rules'].includes(token.text)),'attributes/macros/async/includes/unknown producers are unsupported');
 }
 const item=rootItems.find(row=>row.term==='mod'&&row.start===edge.pathSelection.span.start&&row.end===edge.pathSelection.span.end);need(item&&edge.pathSelection.attributes.every(row=>row.name==='path'),'one original plain mod header with optional path attribute required');
 const attributes=edge.pathSelection.attributes,header=attributes.length?root.source.slice(attributes[0].span.end,item.end).trim():root.source.slice(item.start,item.end);
 need(new RegExp('^(?:pub\\s+)?mod\\s+'+unit.module+'\\s*;$','u').test(header),'plain exact logical mod declaration required');
 return {graph,root,leaf,item,edge,functionCount:rootItems.filter(row=>row.term==='fn').length+leafItems.length};
}
function admitted(compiled,qualified,mapPath){
 const meta=compiled.meta;need(meta.refused.length===0&&meta.unloweredItems.length===0&&(meta.moduleDiagnostics??[]).length===0&&(meta.bindingEvidence?.diagnostics??[]).length===0&&(meta.checkedMethods??[]).length===0&&(meta.checkedGeneratedMethods??[]).length===0,'complete ordinary function semantic scope required');
 need(meta.executable.length===qualified.functionCount&&compiled.executableDeclarations.length===qualified.functionCount&&meta.executable.every(row=>row.term==='fn'),'every original ordinary function/export must be admitted');
 const scalar=type=>type&&['bool','fixed','string'].includes(type.kind)&&!type.rustGenericIdentityUnresolved&&!type.rustBorrowingUnresolved;
 const functions=new Set(compiled.executableDeclarations.map(row=>row.qualifiedName));let cells=0;const pure=(node,depth=0)=>{need(node&&++cells<=100000&&depth<=128&&scalar(node.type),'bounded checked scalar-only expression required');
  if(node.k==='lit'||node.k==='var')return;if(node.k==='call'){need(functions.has(node.fn)&&Array.isArray(node.args),'only genuine checked same-project pure callers are supported');for(const argument of node.args)pure(argument,depth+1);return;}
  if(node.k==='let'){pure(node.value,depth+1);pure(node.body,depth+1);return;}if(node.k==='if'){pure(node.cond,depth+1);pure(node.then,depth+1);pure(node.else,depth+1);return;}if(node.k==='binary'){pure(node.left,depth+1);pure(node.right,depth+1);return;}if(node.k==='unary'){pure(node.value,depth+1);return;}need(false,'host/resource/filesystem effects require separate relocation proofs');
 };
 const rows=compiled.executableDeclarations.map(declaration=>{
  const proof=declaration.checkedSource(),binding=declaration.targetBinding(true);need(proof.source===declaration.source&&proof.qualifiedName===declaration.qualifiedName&&binding.source===proof.source&&binding.qualifiedName===proof.qualifiedName&&binding.signature,'actual private checked body and target binding required');
  pure(proof.declaration.body);
  need(proof.sourceSignature.params.every(row=>scalar(row.type))&&scalar(proof.sourceSignature.ret),'checked resolved scalar function signatures only');
  need(qualified.graph.modules.some(row=>row.file===proof.source&&JSON.stringify(row.path)===JSON.stringify(proof.module)),'checked namespace owner differs from original module graph');
  const module=qualified.graph.modules.find(row=>row.file===proof.source),functionSource=module.source.slice(proof.span.start,proof.span.end);
  // Only coordinate spans are erased for comparison. Every actual function's
  // complete original text, checked scalar signature and logical owner remain.
  const signature=JSON.parse(JSON.stringify(proof.sourceSignature,(key,value)=>key==='span'?undefined:value));
  return {source:mapPath(proof.source),name:proof.qualifiedName,module:proof.module,functionSource,signature,target:binding.javascriptName};
 }).sort((a,b)=>ordinal(a.name,b.name));need(new Set(rows.map(row=>row.name)).size===rows.length,'ambiguous checked function owner');return rows;
}
export function deriveNativeLeafRecoveryProof({root,manifestPath,baseRevision}={}){
 path(manifestPath);const physicalCapture=createReconcileSourceCapture(resolve(root));root=physicalCapture.root;let captured,revision,tree,runtime,result,primary,failed=false;const closers=[];
 try{
  revision=reconcileHead(root);need(baseRevision===undefined||baseRevision===revision,'recovery requires the exact original current HEAD');const manifestSource=physicalCapture.capture(manifestPath).source;need(manifestSource!==null,'leaf move descriptor is missing');const unit=descriptor(manifestSource,manifestPath),layout=repositoryRustLayout(root);need(unit.entry===layout.entries[0],'fixed original library root entry required');
  const prefix=layout.productionPrefix.replace(/\/$/u,''),baselineRevision=resolveSourceUnitGitBaseline(root,revision,unit.baselineRevision??undefined),producerPaths=[...new Set(['build.rs',layout.root==='.'?'build.rs':layout.root+'/build.rs'])];need(baselineRevision===revision,'durable leaf recovery requires a current-HEAD baseline');
  const baseline=captureSourceUnitGitBaseline(root,revision,{prefix,paths:[manifestPath,unit.entry,unit.from,unit.to,...layout.cargoInputs,unit.javascript,unit.typescript,unit.meta,...producerPaths]});for(const row of baseline.values())physicalCapture.charge(row.source);need(baseline.get(manifestPath)?.source===manifestSource,'request must match its complete committed baseline');for(const name of producerPaths)need(!baseline.has(name)&&physicalCapture.capture(name).source===null,'unmodeled native build producer requires separate qualification');
  const records=new Map();captured={root,capture:name=>{path(name);if(records.has(name))return records.get(name);need(records.size<RECONCILE_LIMITS.count,'bounded complete committed recovery source count required');const original=baseline.get(name),row={path:name,source:original?.source??null,mode:original?.mode??null};if(row.source!==null)physicalCapture.charge(row.source);records.set(name,row);return row;},charge:text=>physicalCapture.charge(text),inputs:()=>[...records.values()].map(({path,source})=>({path,source})).sort((a,b)=>ordinal(a.path,b.path)),modes:()=>[...records.values()].map(({path,mode})=>({path,mode})).sort((a,b)=>ordinal(a.path,b.path)),get retained(){return physicalCapture.retained;}};captured.capture(manifestPath);
  for(const name of producerPaths)captured.capture(name);const nativeNames=[...baseline.keys()].filter(name=>name.startsWith(prefix+'/')&&name.endsWith('.rs')).sort(ordinal);tree={names:nativeNames,listing:[{path:prefix,names:nativeNames.map(name=>posix.basename(name))}]};const current=new Map(nativeNames.map(name=>[name,captured.capture(name).source]));
  const from=captured.capture(unit.from),to=captured.capture(unit.to),noOp=false,selected=unit.from;need(from.source!==null&&to.source===null,'committed original source and absent committed destination required');need(nativeNames.length===2&&current.has(unit.entry)&&current.has(selected)&&nativeNames.every(name=>posix.dirname(name)===prefix),'entire committed universe must be exactly flat root plus selected leaf');
  const cargoRows=layout.cargoInputs.map(name=>captured.capture(name));need(cargoRows.every(row=>row.source!==null),'complete current Cargo/workspace input required');const cargo={manifest:captured.capture(layout.manifest).source,lock:captured.capture(layout.lock).source};
  const javascript=captured.capture(unit.javascript),typescript=captured.capture(unit.typescript),meta=captured.capture(unit.meta);need(javascript.source!==null&&typescript.source!==null&&meta.source!==null,'existing complete paired targets and review required');
  for(const name of [...layout.cargoInputs,manifestPath,unit.javascript,unit.typescript]){const actual=physicalCapture.capture(name),previous=baseline.get(name);need(previous&&previous.source===actual.source&&previous.mode===actual.mode,'current Cargo/request/paired source differs from exact baseline: '+name);}
  const cargoBuildConfiguration=cargoRows.filter(row=>row.path.endsWith('Cargo.toml')).map(row=>{const parsed=parseDurableLeafCargoData(row.source),packageData=parsed.package;need(packageData===undefined||packageData&&typeof packageData==='object'&&!Array.isArray(packageData),'ordinary Cargo package configuration required');const present=packageData!==undefined&&Object.hasOwn(packageData,'build');need(!present||packageData.build===false,'custom or unsupported Cargo package build directive requires separate relocation qualification');return {path:row.path,source:row.source,mode:row.mode,packagePresent:packageData!==undefined,buildPresent:present,build:present?false:null};});
  closers.push(()=>{for(const row of cargoBuildConfiguration){const parsed=parseDurableLeafCargoData(row.source);need((parsed.package!==undefined)===row.packagePresent&&(parsed.package!==undefined&&Object.hasOwn(parsed.package,'build'))===row.buildPresent&&(!row.buildPresent||parsed.package.build===false),'original Cargo build configuration changed');}});
  for(const row of cargoBuildConfiguration)captured.charge(row.source);
  const optionsFor=values=>({entry:unit.entry,paths:[...values.keys()],readSource:name=>{need(values.has(name),'uncaptured project source requested');return values.get(name);},compilationProfile:PRODUCTION_PROFILE,cargoManifest:cargo.manifest,jsonMacroDependencies:loadJsonMacroSourceProof(cargo),deriveDependencies:loadDeriveDependencyProof(cargo)});
  closers.push(()=>loadJsonMacroSourceProof(cargo),()=>loadDeriveDependencyProof(cargo));runtime=createForwardProjectRuntimeMapping();closers.push(()=>runtime.verify());
  const physical=(source,language)=>runtime.rewrite({source,language,sourcePath:unit.entry.replace(/\.rs$/u,language==='JavaScript'?'.mjs':'.mts'),targetPath:language==='JavaScript'?unit.javascript:unit.typescript,fromRoot:'runtime',toRoot:language==='JavaScript'?'js/runtime':'ts/runtime'});
  const outputs=[],moves=[],equations=[];let beforeQualified,afterQualified,beforeCompiled,afterCompiled,afterSources,ownerAfter,ownerHistory,admissions;
  const output=(name,after,kind)=>{const actual=captured.capture(name);need(actual.source!==null,'all projection output parents/files must already exist');captured.charge(after);outputs.push({path:name,before:actual.source,after,inverse:actual.source,mode:actual.mode,kind});
   const language=/\.(?:mts|ts)$/u.test(name)?'TypeScript':/\.(?:mjs|js)$/u.test(name)?'JavaScript':null;if(language)equations.push({path:name,history:transportConcreteSourceEquations([{before:actual.source,after,language}])[0]});
  };
  const run=createRulePipeline([
   {phase:'language',rules:[{id:'native-leaf-move:qualify-complete-original-module-owner-and-project',apply:()=>{
    beforeQualified=qualifiedGraph(optionsFor(current),unit,selected);beforeCompiled=translateProject(optionsFor(current));admissions=admitted(beforeCompiled,beforeQualified,name=>name);for(const row of admissions)captured.charge(row.functionSource);captured.charge(beforeCompiled.javascript);captured.charge(beforeCompiled.typescript);
    need(physical(beforeCompiled.javascript,'JavaScript').source===javascript.source&&physical(beforeCompiled.typescript,'TypeScript').source===typescript.source,'current paired baseline differs from complete fresh project');return beforeQualified;
   }}]},
   {phase:'repository',rules:[{id:'router:relocate-exact-root-mod-path-and-recompile-complete-after-universe',apply:()=>{
    const owner=current.get(unit.entry),item=beforeQualified.item,attribute=beforeQualified.edge.pathSelection.attributes[0],replacement='#[path = '+JSON.stringify(posix.basename(unit.to))+']';
    if(noOp){need(beforeQualified.edge.pathSelection.explicitPath===posix.basename(unit.to),'no-op must retain an actual original explicit destination selection');ownerAfter=owner;afterSources=new Map(current);}
    else{
     const span=attribute?[attribute.span.start,attribute.span.end]:[item.start,item.end],expected=owner.slice(...span),after=attribute?replacement:replacement+'\n'+expected,concrete=transportConcreteSyntaxSource(owner,{language:'Rust'});
     need(transportConcreteSyntaxMeta(concrete.meta).source===owner,'complete original root CST inverse differs');const changed=applyConcreteSyntaxSubstitutions(concrete.meta,{languageRules:[{id:'rust:retain-complete-original-mod-owner',edits:[]}],repositoryRules:[{id:'router:update-only-actual-leaf-module-selection',edits:[{span,expected,replacement:after}]}]});ownerAfter=changed.value.source;captured.charge(ownerAfter);ownerHistory=transportConcreteSourceEquations([{before:owner,after:ownerAfter,language:'Rust'}])[0];need(ownerHistory.inverse===owner,'complete root source inverse differs');
     afterSources=new Map(current);afterSources.delete(unit.from);afterSources.set(unit.to,from.source);afterSources.set(unit.entry,ownerAfter);
    }
    afterQualified=qualifiedGraph(optionsFor(afterSources),unit,unit.to);afterCompiled=translateProject(optionsFor(afterSources));captured.charge(afterCompiled.javascript);captured.charge(afterCompiled.typescript);
    const moved=name=>!noOp&&name===unit.to?unit.from:name,afterAdmissions=admitted(afterCompiled,afterQualified,moved);for(const row of afterAdmissions)captured.charge(row.functionSource);boundedReconcileWireBytes(admissions);boundedReconcileWireBytes(afterAdmissions);need(JSON.stringify(afterAdmissions)===JSON.stringify(admissions),'checked namespace/function/export census changed under exact source mapping');need(afterCompiled.javascript===beforeCompiled.javascript&&afterCompiled.typescript===beforeCompiled.typescript,'complete target projection differs after logical-name-preserving relocation');
    const js=physical(afterCompiled.javascript,'JavaScript'),ts=physical(afterCompiled.typescript,'TypeScript');
    const runtimeRows=runtime.sources('js/runtime',js.keys).concat(runtime.sources('ts/runtime',ts.keys));if(runtimeRows.length){const runtimeBaseline=captureSourceUnitGitBaseline(root,revision,{prefix,paths:runtimeRows.map(row=>row.path)});for(const row of runtimeRows){const original=runtimeBaseline.get(row.path);need(original,'registered runtime must be committed');if(!baseline.has(row.path)){physicalCapture.charge(original.source);baseline.set(row.path,original);}}}
    for(const row of runtimeRows){need(captured.capture(row.path).source===row.source&&physicalCapture.capture(row.path).source===row.source,'actual complete committed runtime closure differs');if(!noOp)output(row.path,row.source,'registered-runtime');}
    if(!noOp){output(unit.entry,ownerAfter,'checked-root-mod-selection');output(unit.javascript,js.source,'checked-javascript-projection');output(unit.typescript,ts.source,'checked-typescript-projection');moves.push({from:unit.from,to:unit.to,source:from.source,mode:from.mode,inverse:{from:unit.to,to:unit.from,source:from.source}});equations.push({path:unit.entry,history:ownerHistory},{from:unit.from,to:unit.to,history:transportConcreteSourceEquations([{before:from.source,after:from.source,language:'Rust'}])[0]});}
    return {noOp};
   }}]},
  ]).run(null);
  if(!noOp){const review={schema:SCHEMA,id:unit.id,baseRevision:revision,sourceBaselineRevision:baselineRevision,manifestSource,sourceMapping:{from:unit.from,to:unit.to,module:unit.module},admissions,equations,trace:run.trace,sourceAuthority:false,semanticAuthority:false,runtimeParity:false};need(boundedReconcileWireBytes(review)+1<=RECONCILE_LIMITS.file,'bounded complete move review required');output(unit.meta,JSON.stringify(review)+'\n','complete-leaf-move-review');}
  result={schema:SCHEMA,root,manifestPath,manifestSource,baseRevision:revision,sourceBaselineRevision:baselineRevision,cargoBuildConfiguration,inputs:captured.inputs(),inputModes:captured.modes(),outputs,moves,equations,trace:run.trace,noOp,retainedSourceBytes:captured.retained,sourceAuthority:false,semanticAuthority:false,runtimeParity:false,wholeRouterSynchronization:false,rustExecuted:false};boundedReconcileWireBytes(result);
 }catch(error){failed=true;primary=error;}
 const closing=[];for(const close of closers)try{close();}catch(error){closing.push(error);}try{physicalCapture.close();}catch(error){closing.push(error);}if(revision)try{need(reconcileHead(root)===revision,'Git revision changed during relocation planning');}catch(error){closing.push(error);}
 if(failed)throw primary;if(closing.length)throw new AggregateError(closing,'Native leaf move closing failures');return result;
}
