// Complete-source adoption of transparent owned aliases, not semantic admission.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {resolveModuleGraph} from './project.mjs';
import {resolveModuleBindings} from './module-bindings.mjs';
import {registeredStandardHostBindings} from './standard-host-bindings.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {inspectCoreTypePositions,inspectCoreTypePositionsWithProducerContext,coreTypeProducerProblemsForModule} from './migrate-core-primitives.mjs';
import {createCoreAdoptionProducerContext,coreAdoptionProducerBindings,finishCoreAdoptionProducerContext} from './core-adoption-producer-context.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-source-data.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {compilationProfile as normalizeProfile} from './cfg-profile.mjs';

const hash=source=>createHash('sha256').update(source).digest('hex');
const targets={Json:['serde_json','Value'],Maybe:['std','option','Option'],Outcome:['std','result','Result']};
const identifier=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const fail=reason=>{throw new TypeError('Core algebraic adoption: '+reason);};
const same=(a,b)=>a?.length===b.length&&a.every((part,index)=>part===b[index]);
function sourceMap(input){
  if(!input||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('requires a complete own-data file map');
  const keys=Reflect.ownKeys(input);if(keys.length>1024)fail('file count exceeds bound');const result=Object.create(null);let total=0;
  for(const key of keys){
    if(typeof key!=='string'||key.length>4096||!key.endsWith('.rs')||key.includes('\\')||/[\x00-\x1f:]/u.test(key)||key.split('/').some(part=>!part||part==='.'||part==='..'))fail('requires repository-relative Rust paths');
    const d=Object.getOwnPropertyDescriptor(input,key);if(!d||!Object.hasOwn(d,'value')||typeof d.value!=='string'||d.value.length>2_000_000)fail('requires bounded primitive source strings');
    total+=d.value.length;if(total>32_000_000)fail('total source exceeds bound');result[key]=d.value;
  }return result;
}
function aliases(scope){
  const result=new Map();
  for(const binding of scope.bindings)if(binding.namespace==='type'&&binding.status==='resolved')for(const[name,target]of Object.entries(targets))if(same(binding.target,target))result.set(binding.name,name);
  // Ordinary prelude spellings are adopted only in an otherwise closed type
  // scope without a competing explicit declaration/import. No compiler owner
  // proof is issued by this source proposal.
  for(const[name,core]of [['Option','Maybe'],['Result','Outcome']])if(!scope.bindings.some(binding=>binding.namespace==='type'&&binding.name===name))result.set(name,core);
  return result;
}
function selectedPath(parts,scope,known){
  if(parts[0]==='crate'&&parts[1]==='translation_core')return null;
  if(parts.length===1)return known.get(parts[0])??null;
  const root=scope.bindings.find(binding=>binding.namespace==='type'&&binding.name===parts[0]);
  if(root&&root.status!=='resolved')return null;
  const resolved=root?[...root.target,...parts.slice(1)]:parts;
  for(const[name,target]of Object.entries(targets))if(same(resolved,target))return name;
  return null;
}
function typedEdits(tokens,scope,known){
  const edits=[];
  for(let at=0;at<tokens.length;at++){
    if(!identifier(tokens[at])||['::','#','.'].includes(tokens[at-1]?.text))continue;
    const begin=at,parts=[tokens[at].text];while(tokens[at+1]?.text==='::'&&identifier(tokens[at+2])){parts.push(tokens[at+2].text);at+=2;}
    const core=selectedPath(parts,scope,known);if(!core)continue;
    const generic=tokens[at+1]?.text==='<';if(core==='Json'&&generic||core!=='Json'&&!generic)continue;
    edits.push({span:[tokens[begin].start,tokens[at].end],expected:null,replacement:'crate::translation_core::'+core,alias:core});
  }return edits;
}
function bodyEdits(item,scope,known){
  const tokens=item.tokens.filter(token=>token.type!=='comment'),open=tokens.findIndex(token=>token.text==='{');if(open<0)return {edits:[],skipped:[]};
  const body=tokens.slice(open+1,-1),reserved=new Set(['fn','const','static','type','struct','enum','trait','mod','use','extern']);
  // A local item or expansion may introduce competing type/constructor names.
  // Preserve the entire body rather than treating its tokens as declarations.
  const keywords=new Set(['if','else','return','break','continue','while','for','loop','match','let','true','false']);
  const macroName=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*!?$/u.test(token.text)&&!keywords.has(token.text.replace(/!$/u,''));
  if(body.some(token=>reserved.has(token.text)||macroName(token)&&token.text.endsWith('!'))||body.some((token,index)=>token.text==='!'&&macroName(body[index-1])))return {edits:[],skipped:[{span:[item.start,item.end],reason:'body-local item or macro producer; constructors and associated paths preserved'}]};
  const edits=[],constructors={Some:'Maybe',None:'Maybe',Ok:'Outcome',Err:'Outcome'};
  // The type-position grammar does not bind expression-local names. Limit
  // bare call adoption to bodies without any such binders; fields, methods,
  // raw identifiers and unit/shorthand spellings are never constructors here.
  const localBindings=body.some(token=>['let','for','match','if','while','|','||'].includes(token.text));
  const expressionBefore=new Set(['return','==','!=','=','(',',','=>','&&','||','!']);
  for(let at=0;at<body.length;at++){
    if(!identifier(body[at])||['::','#','.'].includes(body[at-1]?.text))continue;
    const token=body[at],bound=scope.bindings.find(binding=>binding.namespace==='value'&&binding.name===token.text);
    if(Object.hasOwn(constructors,token.text)){
      if(localBindings||token.text==='None'||body[at+1]?.text!=='('||at>0&&!expressionBefore.has(body[at-1].text))continue;
      const core=constructors[token.text],owner=targets[core];
      if(bound&&(bound.status!=='resolved'||!same(bound.target,[...owner,token.text])))continue;
      if(tokens.slice(0,open).some(row=>row.text===token.text))continue;
      if(!known.has(core==='Maybe'?'Option':'Result')&&!bound)continue;
      edits.push({span:[token.start,token.end],expected:token.text,replacement:`crate::translation_core::${core}::${token.text}`,alias:core});continue;
    }
    const parts=[token.text];let end=at;while(body[end+1]?.text==='::'&&identifier(body[end+2])){parts.push(body[end+2].text);end+=2;}
    if(parts.length<2)continue;const owner=parts.slice(0,-1),core=selectedPath(owner,scope,known);if(!core)continue;
    edits.push({span:[token.start,body[end-2].end],expected:null,replacement:'crate::translation_core::'+core,alias:core});at=end;
  }
  return {edits,skipped:[]};
}
function migrate(source,moduleRows,scopes,profile,ancestorProblems,producerContext=null){
  const before=transportConcreteSyntaxSource(source,{language:'Rust'}),inspection=producerContext?inspectCoreTypePositionsWithProducerContext(producerContext,source,{file:moduleRows[0].file,compilationProfile:profile}):inspectCoreTypePositions(source,{compilationProfile:profile}),edits=[],skipped=[...inspection.skipped],selections=[];
  const origin=moduleRows.find(module=>module.sourceView.modulePath.length===0);
  if(!origin)fail('requires one complete physical module origin');
  const selectedItems=new Map();
  for(const position of inspection.positions){
    const module=moduleRows.find(row=>same(row.path,[...origin.path,...position.module])),scope=module&&scopes.find(row=>row.file===module.file&&same(row.path,module.path));
    if(!scope||ancestorProblems.length){skipped.push({...position,tokens:undefined,reason:'ancestor binding or producer uncertainty',blockers:ancestorProblems});continue;}
    const known=aliases(scope),local=typedEdits(position.tokens,scope,known);edits.push(...local);
    const key=position.span.join(':');if(!selectedItems.has(key))selectedItems.set(key,{position,module,scope,known});
    if(local.length)selections.push({name:position.name,module:module.path,span:position.span,role:'type',edits:local});
  }
  for(const{position,module,scope,known}of selectedItems.values()){
    const item=originalSourceModuleItems(module).find(row=>row.start===position.span[0]&&row.end===position.span[1]);if(!item||item.term!=='fn')continue;
    const result=bodyEdits(item,scope,known);edits.push(...result.edits);skipped.push(...result.skipped);if(result.edits.length)selections.push({name:position.name,module:module.path,span:position.span,role:'constructor-or-associated-path',edits:result.edits});
  }
  const unique=new Map();for(const edit of edits){edit.expected=source.slice(...edit.span);unique.set(edit.span.join(':'),edit);}
  const ordered=[...unique.values()].sort((a,b)=>a.span[0]-b.span[0]);for(let at=1;at<ordered.length;at++)if(ordered[at-1].span[1]>ordered[at].span[0])fail('overlapping typed substitutions');
  const changed=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'owned-algebraic-adoption:retain-complete-type-positions',edits:[]}],repositoryRules:[{id:'router-core:qualify-transparent-algebraic-aliases',edits:ordered.map(({span,expected,replacement})=>({span,expected,replacement}))}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(changed.value));
  const mapping=[];let old=0,next=0;
  for(const edit of ordered){if(edit.span[0]>old){const length=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[next,next+length]});next+=length;}mapping.push({kind:'substitution',before:edit.span,after:[next,next+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});next+=edit.replacement.length;old=edit.span[1];}
  if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[next,next+source.length-old]});
  let inverse=after.source;for(const row of [...mapping].reverse())if(row.kind==='substitution')inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);if(inverse!==source)fail('complete inverse changed');
  return {schema:'router-core-algebraic-migration-v1',before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},edits:ordered,mapping,selections,skipped,trace:changed.trace,migrationSemantics:'source-qualified transparent owned API adoption; native library internals untranslated',executableAdmission:false};
}
export function proposeCoreAlgebraicCorpus({entry='src/lib.rs',files:input,compilationProfile:inputProfile=null,dependencyInputs}={}){
  const files=sourceMap(input),profile=normalizeProfile(inputProfile);if(!Object.hasOwn(files,entry))fail('entry source is missing');
  const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile});
  const root=graph.modules.filter(module=>!module.path.length),core=graph.modules.filter(module=>same(module.path,['translation_core'])),leaf=graph.modules.filter(module=>same(module.path,['translation_core','primitives']));
  if(root.length!==1||core.length!==1||leaf.length!==1||core[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaf[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||core[0].file!=='src/translation_core.rs'||leaf[0].file!=='src/translation_core/primitives.rs'||core[0].configurationCondition!=='active'||leaf[0].configurationCondition!=='active')fail('requires complete current owned core sources');
  const declarations=originalSourceModuleItems(root[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(declarations.length!==1||root[0].source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_core;')fail('requires the actual unqualified public core edge');
  if(originalSourceModuleItems(root[0]).some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_core')))fail('core root reexport competes with the owned edge');
  const producerContext=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:profile,dependencyInputs});
  const evidence=coreAdoptionProducerBindings(producerContext)??resolveModuleBindings({modules:graph.modules,externalModules:registeredStandardHostBindings(),compilationProfile:profile}),proposals=[],skipped=[],after={...files};
  for(const file of Object.keys(files)){
    if(file==='src/translation_core.rs'||file.startsWith('src/translation_core/'))continue;
    const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>module.sourceView.modulePath.length===0);
    if(origins.length!==1){skipped.push({file,reason:'missing or multiple physical module origins'});continue;}
    const origin=origins[0],parents=graph.modules.filter(module=>module.file!==file&&module.path.length<origin.path.length&&module.path.every((name,at)=>origin.path[at]===name));
    const blockers=parents.flatMap(module=>coreTypeProducerProblemsForModule(producerContext,module));
    const result=migrate(files[file],modules,evidence.scopes,profile,blockers,producerContext);proposals.push({file,module:origin.path,...result});after[file]=result.after.source;
  }
  const inputs=Object.entries(files).map(([path,source])=>({path,source,sha256:hash(source)})),producerEffects=finishCoreAdoptionProducerContext(producerContext);
  return {schema:'router-core-algebraic-corpus-proposal-v1',entry,compilationProfile:profile,...(producerEffects?{producerEffects}:{}),before:{...files},after,inputs,moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},proposals,skipped,executableAdmission:false};
}
