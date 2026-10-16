// Explicit owned JSON macro adoption, not general macro or Serialize authority.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {resolveModuleGraph} from './project.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves} from './module-bindings.mjs';
import {createLiteralTextImportRoles,verifyLiteralTextImportRoles} from './literal-text-import-roles.mjs';
import {jsonMacroDependencyProfile,jsonMacroOriginalSource} from './json-macro-inputs.mjs';
import {jsonMacroSourceDefinition,jsonMacroDefinitionSource} from './json-macro-sources.mjs';
import {coreTypeProducerProblems} from './migrate-core-primitives.mjs';
import {itemConfiguration,compilationProfile as normalizeProfile,PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from './router-core-source-data.mjs';
const target='crate::translation_core::json',hash=value=>createHash('sha256').update(value).digest('hex');
const inert=new Set(['cfg','doc','must_use','allow','warn','deny','forbid','expect','inline','cold','deprecated','track_caller']);
const fail=reason=>{throw new TypeError('Owned JSON adoption: '+reason);};
const same=(a,b)=>a.length===b.length&&a.every((value,at)=>value===b[at]);
const identifier=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
function snapshotOptions(options){
  if(!options||typeof options!=='object'||types.isProxy(options)||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('own-data options required');
  const keys=Reflect.ownKeys(options);if(keys.some(key=>!['entry','files','compilationProfile','dependencyInputs'].includes(key)))fail('unknown option');
  const fields=keys.map(key=>[key,Object.getOwnPropertyDescriptor(options,key)]),copy={};
  for(const [key,d]of fields){if(!d||!Object.hasOwn(d,'value'))fail('own-data options required');copy[key]=d.value;}
  return {copy,current(){if(!same(Reflect.ownKeys(options),keys))fail('options changed');for(const [key,before]of fields){const now=Object.getOwnPropertyDescriptor(options,key);if(!now||!Object.hasOwn(now,'value')||now.value!==before.value||now.writable!==before.writable||now.enumerable!==before.enumerable||now.configurable!==before.configurable)fail('options changed');}}};
}
function sourceMap(input){
  if(!input||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('complete own-data source map required');
  const keys=Reflect.ownKeys(input),files=Object.create(null);let total=0;
  if(keys.length>1024)fail('file bound');
  for(const key of keys){const d=Object.getOwnPropertyDescriptor(input,key);if(typeof key!=='string'||key.length>4096||!key.endsWith('.rs')||key.includes('\\')||/[\x00-\x1f:]/u.test(key)||key.split('/').some(value=>!value||value==='.'||value==='..')||!d||!Object.hasOwn(d,'value')||typeof d.value!=='string'||d.value.length>2_000_000)fail('bounded canonical own source required');total+=d.value.length;if(total>32_000_000)fail('total source bound');files[key]=d.value;}
  return files;
}
function close(tokens,start){const pairs={'(':')','[':']','{':'}'},stack=[];for(let at=start;at<tokens.length;at++){const word=tokens[at].text;if(tokens[at].type==='string')continue;if(pairs[word])stack.push(pairs[word]);else if([')',']','}'].includes(word)){if(stack.pop()!==word)return -1;if(!stack.length)return at;}}return -1;}
function macroAt(tokens,at){
  const name=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*!?$/u.test(token.text);
  if(!name(tokens[at])||['::','.','#'].includes(tokens[at-1]?.text))return null;
  const parts=[tokens[at].text.replace(/!$/u,'')];let end=at;
  while(!tokens[end].text.endsWith('!')&&tokens[end+1]?.text==='::'&&name(tokens[end+2])){end+=2;parts.push(tokens[end].text.replace(/!$/u,''));}
  const attached=tokens[end].text.endsWith('!'),open=end+(attached?1:2);
  if(!attached&&tokens[end+1]?.text!=='!'||!['(','[','{'].includes(tokens[open]?.text))return null;
  const last=close(tokens,open);return last<0?null:{parts,first:at,nameEnd:end,open,last,attached};
}
function apply(source,edits){
  edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=1;at<edits.length;at++)if(edits[at-1].span[1]>edits[at].span[0])fail('overlapping edits');
  const before=transportConcreteSyntaxSource(source,{language:'Rust'}),applied=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'json-macro:preserve-current-concrete-source',edits:[]}],repositoryRules:[{id:'router-core:adopt-qualified-owned-json',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value)),mapping=[];let old=0,current=0;
  for(const edit of edits){if(old<edit.span[0]){const n=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+n]});current+=n;}mapping.push({kind:'substitution',before:edit.span,after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});old=edit.span[1];current+=edit.replacement.length;}
  if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});let restored=after.source;
  for(const row of [...mapping].reverse())if(row.kind==='substitution'){if(restored.slice(...row.after)!==row.replacement)fail('inverse source differs');restored=restored.slice(0,row.after[0])+row.expected+restored.slice(row.after[1]);}if(restored!==source)fail('whole source inverse differs');
  return {before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},edits,mapping,trace:applied.trace,executableAdmission:false};
}
export function proposeCoreJsonCorpus(options={}){
  const snapshot=snapshotOptions(options),{entry='src/lib.rs',files:input,compilationProfile=PRODUCTION_PROFILE,dependencyInputs}=snapshot.copy,files=sourceMap(input),profile=normalizeProfile(compilationProfile);
  if(!Object.hasOwn(files,entry))fail('entry source missing');
  const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile}),root=graph.modules.filter(row=>!row.path.length),core=graph.modules.filter(row=>same(row.path,['translation_core']));
  if(root.length!==1||core.length!==1||core[0].file!=='src/translation_core.rs'||core[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||core[0].configurationCondition!=='active')fail('complete actual owned facade required');
  const edges=originalSourceModuleItems(root[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(edges.length!==1||root[0].source.slice(edges[0].start,edges[0].end).trim()!=='pub mod translation_core;')fail('actual public core edge required');
  const roleFor=createLiteralTextImportRoles(graph.modules,profile,dependencyInputs),dependency=dependencyInputs===undefined?null:jsonMacroDependencyProfile(dependencyInputs),proof=dependency?.proof??null;
  let macroSource=null,definition=null;
  if(proof){const original=jsonMacroOriginalSource(proof,'serde_json','src/macros.rs'),compiled=jsonMacroSourceDefinition(proof);definition=jsonMacroDefinitionSource(compiled);if(definition.sourceSha256!==original.sha256)fail('macro original differs');macroSource={path:'serde_json/src/macros.rs',sha256:original.sha256,definition};}
  const proposals=[],skipped=[],after={...files};
  for(const file of Object.keys(files)){
    if(file==='src/translation_core.rs'||file.startsWith('src/translation_core/'))continue;
    const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>!module.sourceView.modulePath.length),edits=[],selections=[],preserved=[],imports=[];
    if(origins.length!==1){skipped.push({file,reason:'missing or multiple physical source origins'});continue;}
    for(const module of modules){
      const ancestors=graph.modules.filter(parent=>parent.path.length<=module.path.length&&parent.path.every((part,at)=>part===module.path[at]));
      const producers=ancestors.flatMap(parent=>coreTypeProducerProblems(parent.source,{compilationProfile:profile}));
      const alias=new Map(),blocked=new Set();let rootShadow=false;
      for(const parent of ancestors)for(const item of originalSourceModuleItems(parent)){
        if(item.comment||itemConfiguration(item.tokens,profile).status==='inactive')continue;
        const header=originalDeclarationHeader(item,parent.path);if(header?.name==='serde_json')rootShadow=true;
        // Every visible same-name macro competes, even before its expansion.
        const words=item.tokens.filter(row=>row.type!=='comment');let macro=words.findIndex(row=>row.text==='macro_rules!');
        if(macro<0){const at=words.findIndex((row,at)=>row.text==='macro_rules'&&words[at+1]?.text==='!');if(at>=0)macro=at+1;}
        if(macro>=0&&identifier(words[macro+1]))blocked.add(words[macro+1].text);
        if(words[0]?.text==='extern'&&words[1]?.text==='crate'&&(words[3]?.text==='as'?words[4]?.text:words[2]?.text)==='serde_json')rootShadow=true;
        if(item.term==='use')for(const leaf of originalUseDeclarationLeaves(item,parent.path)){
          if(leaf.glob){rootShadow=true;blocked.add('*');continue;}
          const role=roleFor(parent,item,leaf),json=same(leaf.segments,['serde_json','json'])&&role?.role.kind==='macro'&&role.role.namespace==='macro';
          if(json&&!blocked.has(leaf.name)&&!alias.has(leaf.name)){alias.set(leaf.name,{module:parent,item,leaf,role});imports.push({item,leaf,role});}else if(leaf.name==='serde_json')rootShadow=true;else blocked.add(leaf.name);
        }
      }
      for(const item of originalSourceModuleItems(module)){
        if(item.term!=='fn')continue;const condition=itemConfiguration(item.tokens,profile),tokens=item.tokens.filter(row=>row.type!=='comment'),record={function:item.name,module:module.path,span:[item.start,item.end]};
        if(module.configurationCondition!=='active'||condition.status!=='active'||condition.attributes.some(row=>!inert.has(row.name))||producers.length||blocked.has('*')){preserved.push({...record,reason:'configuration, glob, attribute or declaration producer uncertainty'});continue;}
        const head=originalDeclarationHeader(item,module.path);if(!head)continue;const name=tokens.findIndex(token=>token.start===head.nameSpan.start),params=close(tokens,name+1);let body=params+1;while(body<tokens.length&&tokens[body].text!=='{')body++;
        if(tokens[name+1]?.text!=='('||params<0||body>=tokens.length||close(tokens,body)!==tokens.length-1){preserved.push({...record,reason:'complete ordinary function body required'});continue;}
        const found=[];let uncertain=false;
        for(let at=body+1;at<tokens.length-1;at++){
          if(tokens[at].text==='#'){uncertain=true;break;}
          if(['fn','mod','use','extern','macro_rules','macro','trait','impl','struct','enum','union','type'].includes(tokens[at].text)){uncertain=true;break;}
          const invocation=macroAt(tokens,at);if(!invocation){if(tokens[at].type==='ident'&&tokens[at].text.endsWith('!')||tokens[at].text==='!'&&tokens[at-1]?.type==='ident'){uncertain=true;break;}continue;}
          const direct=same(invocation.parts,['serde_json','json'])&&!rootShadow&&proof;
          const imported=invocation.parts.length===1&&!blocked.has(invocation.parts[0])&&alias.get(invocation.parts[0]);
          const owned=same(invocation.parts,['crate','translation_core','json'])||same(invocation.parts,['crate','translation_core','format']);
          if(!direct&&!imported&&!owned){uncertain=true;break;}
          if(direct||imported)found.push({...invocation,imported:imported||null,origin:direct?macroSource:imported.role});at=invocation.last;
        }
        if(uncertain){preserved.push({...record,reason:'local declaration or unknown macro can change lexical bindings'});continue;}
        for(const call of found){const span=[tokens[call.first].start,tokens[call.nameEnd].end],edit={span,expected:files[file].slice(...span),replacement:target+(call.attached?'!':'')};edits.push(edit);selections.push({...record,callSpan:[tokens[call.first].start,tokens[call.last].end],macroPath:call.parts,sourceOrigin:call.origin,oldDispatchProved:false,implementationBoundary:'maintainer-authorized owned serde_json delegation'});}
      }
    }
    const importRemovals=[];
    // Remove a private macro-only import only when every possible written use
    // in its complete leaf module is covered by a selected invocation. Child
    // modules, exports, trivia and opaque uses keep the original import.
    const seenImports=new Set();
    for(const imported of imports){
      const owner=imported.module,item=imported.item,key=item.start+':'+item.end;
      if(owner.file!==file||seenImports.has(key)||graph.modules.some(child=>child.path.length>owner.path.length&&owner.path.every((part,at)=>child.path[at]===part)))continue;
      seenImports.add(key);const words=item.tokens.filter(row=>row.type!=='comment'),condition=itemConfiguration(item.tokens,profile);
      if(words[0]?.text!=='use'||condition.attributes.length||item.tokens.some(row=>row.type==='comment'||row.text==='#'))continue;
      const leaves=originalUseDeclarationLeaves(item,owner.path),remove=leaves.filter(leaf=>same(leaf.segments,['serde_json','json'])&&imports.some(row=>row.module===owner&&row.item.start===item.start&&row.leaf.name===leaf.name));
      if(!remove.length||leaves.some(leaf=>leaf.glob||leaf.validateOnly))continue;
      const names=new Set(remove.map(leaf=>leaf.name));
      const unselected=originalSourceModuleItems(owner).some(other=>other!==item&&other.tokens.some(token=>token.type==='ident'&&names.has(token.text.replace(/!$/u,''))&&!edits.some(edit=>edit.span[0]<=token.start&&edit.span[1]>=token.end)));
      if(unselected)continue;
      const remaining=leaves.filter(leaf=>!remove.some(row=>row.name===leaf.name)),replacement=remaining.map(leaf=>'use '+(leaf.externalOnly?'::':'')+leaf.segments.join('::')+(leaf.alias?' as '+leaf.alias:'')+';').join('\n');
      const edit={span:[item.start,item.end],expected:files[file].slice(item.start,item.end),replacement};edits.push(edit);importRemovals.push({span:edit.span,names:[...names],remaining,sourceRoles:remove.map(leaf=>imports.find(row=>row.item.start===item.start&&row.leaf.name===leaf.name).role),allWrittenUsesCovered:true});
    }
    const proposal=apply(files[file],edits);proposals.push({file,...proposal,selections,preserved,imports,importRemovals});after[file]=proposal.after.source;
  }
  verifyLiteralTextImportRoles(roleFor);snapshot.current();
  return {schema:'router-owned-json-adoption-corpus-v1',entry,compilationProfile:profile,inputs:Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),before:{...files},after,proposals,skipped,macroSource,moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},executableAdmission:false};
}
