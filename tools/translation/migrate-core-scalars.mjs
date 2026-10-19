// Explicit owned scalar-count adoption. No chars/count method or iterator
// authority is inferred from the proposal; reconstructed callers check afresh.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {resolveModuleGraph} from './project.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves} from './module-bindings.mjs';
import {createLiteralTextImportRoles,verifyLiteralTextImportRoles} from './literal-text-import-roles.mjs';
import {inspectCoreTypePositions,coreTypeProducerProblems} from './migrate-core-primitives.mjs';
import {itemConfiguration,compilationProfile as normalizeProfile,PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_PRIMITIVES_SOURCE} from './router-core-source-data.mjs';
const target='crate::translation_core::unicode_scalar_count',str='&crate::translation_core::Str',maybe='crate::translation_core::Maybe<'+str+'>';
const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw new TypeError('Owned scalar-count adoption: '+message);};
const ident=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const inert=new Set(['cfg','doc','must_use','allow','warn','deny','forbid','expect','inline','cold','deprecated','track_caller']);
const same=(a,b)=>a.length===b.length&&a.every((word,at)=>word===b[at]);
const keywords=new Set('as async await break const continue crate dyn else enum extern false fn for gen if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while abstract become box do final macro override priv try typeof unsized virtual yield _'.split(' '));
function macroOpen(rows,at){const token=rows[at];if(token?.type!=='ident')return -1;const merged=token.text.endsWith('!'),name=merged?token.text.slice(0,-1):token.text;const raw=rows[at-2]?.text==='r'&&rows[at-1]?.text==='#'&&rows[at-2].end===rows[at-1].start&&rows[at-1].end===token.start;if(!/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(name)||keywords.has(name)&&!raw||!merged&&rows[at+1]?.text!=='!')return -1;const open=at+(merged?1:2);return ['(','[','{'].includes(rows[open]?.text)?open:-1;}
function close(rows,start){const pairs={'(':')','[':']','{':'}'},stack=[];for(let at=start;at<rows.length;at++){const word=rows[at].text;if(pairs[word])stack.push(pairs[word]);else if([')',']','}'].includes(word)){if(stack.pop()!==word)return -1;if(!stack.length)return at;}}return -1;}
function parameters(rows,start,end){const result=new Map();let begin=start,depth=0;for(let at=start;at<=end;at++){const text=rows[at]?.text;if(at===end||text===','&&!depth){const part=rows.slice(begin,at);if(!ident(part[0])||part[1]?.text!==':')return null;const type=part.slice(2).map(row=>row.text).join('');if(type===str||type===maybe)result.set(part[0].text,type);begin=at+1;}else{if(['<','(','['].includes(text))depth++;if(['>',')',']'].includes(text))depth--;if(text==='>>')depth-=2;}}return result;}
function methodProblems(modules,profile,roleFor,importRoles){
  const problems=[];
  for(const module of modules)for(const item of originalSourceModuleItems(module)){
    const condition=itemConfiguration(item.tokens,profile);if(condition.status==='inactive')continue;
    let header;try{header=originalDeclarationHeader(item,module.path);}catch(error){problems.push({file:module.file,span:[item.start,item.end],reason:error.message});continue;}
    if(item.term==='impl'||header?.kind==='trait')problems.push({file:module.file,span:[item.start,item.end],reason:'visible trait or impl may compete with chars/count'});
    if(item.term==='use'){
      try{for(const leaf of originalUseDeclarationLeaves(item,module.path)){
        const role=roleFor(module,item,leaf);
        if(!role||role.role.namespace==='macro'||role.role.kind==='macro')problems.push({file:module.file,span:[item.start,item.end],reason:'import has no source-backed nontrait candidate role'});else importRoles.push(role);
      }}catch(error){problems.push({file:module.file,span:[item.start,item.end],reason:'import role is unresolved: '+error.message});}
    }
  }return problems;
}
function fileProposal(source,modules,profile,ancestorProblems,importRoles){
  const before=transportConcreteSyntaxSource(source,{language:'Rust'}),inspection=inspectCoreTypePositions(source,{compilationProfile:profile}),eligible=new Set(inspection.positions.filter(row=>row.kind==='fn'&&!row.path.length).map(row=>row.module.join('.')+':'+row.span.join(':'))),edits=[],selections=[],skipped=[...inspection.skipped];
  for(const module of modules){
    const scopeProblems=[...ancestorProblems,...coreTypeProducerProblems(module.source,{compilationProfile:profile})];
    for(const item of originalSourceModuleItems(module)){
      if(item.term!=='fn')continue;const header=originalDeclarationHeader(item,module.path),record={function:item.name,module:module.path,span:[item.start,item.end]},condition=itemConfiguration(item.tokens,profile),stop=reason=>skipped.push({...record,reason});
      // Inline module positions use paths relative to the physical origin.
      const origin=modules.find(row=>row.sourceView.modulePath.length===0),relative=module.path.slice(origin.path.length),key=relative.join('.')+':'+item.start+':'+item.end;
      if(module.configurationCondition!=='active'||condition.status!=='active'||condition.attributes.some(row=>!inert.has(row.name))||scopeProblems.length||!eligible.has(key)){stop('source owner, typed-position, attribute or binding uncertainty');continue;}
      if(!header){stop('complete declaration header required');continue;}
      const rows=item.tokens.filter(row=>row.type!=='comment'),fn=rows.findIndex(row=>row.start===header.keywordSpan.start),name=rows.findIndex(row=>row.start===header.nameSpan.start),open=name+1,end=close(rows,open);
      if(!header||header.rawIdentifier||rows[open]?.text!=='('||end<0||rows.slice(0,fn).some(row=>['async','const','unsafe','extern'].includes(row.text))){stop('complete ordinary function required');continue;}
      let body=end+1;while(body<rows.length&&rows[body].text!=='{')body++;if(body>=rows.length||close(rows,body)!==rows.length-1){stop('complete ordinary function body required');continue;}
      const bindings=parameters(rows,open+1,end);if(!bindings){stop('ordinary named parameter bindings required');continue;}
      const inner=rows.slice(body+1,-1);
      if(inner.some(row=>row.text==='#'||['let','for','match','fn','const','static','type','struct','enum','union','trait','impl','mod','use','extern','macro_rules!','macro'].includes(row.text))){stop('local binder or declaration uncertainty');continue;}
      const closures=[];
      for(let at=body+1;at<rows.length;at++)if(ident(rows[at])&&bindings.get(rows[at].text)===maybe&&!['.','::','#'].includes(rows[at-1]?.text)&&rows[at+1]?.text==='.'&&rows[at+2]?.text==='is_some_and'&&rows[at+3]?.text==='('&&rows[at+4]?.text==='|'&&ident(rows[at+5])&&rows[at+6]?.text==='|'){
        const last=close(rows,at+3);if(last<0||rows.slice(at+7,last).some(row=>row.text==='|'||row.text==='||'))continue;closures.push({name:rows[at+5].text,start:at+7,end:last,receiver:rows[at].text});
      }
      // Other closures may shadow parameters. Refuse every candidate in that
      // function rather than inferring an unobserved lexical binding.
      const pipes=rows.reduce((sum,row)=>sum+(row.text==='|'?1:row.text==='||'?2:0),0);if(pipes!==closures.length*2){stop('unknown or nested callback binder');continue;}
      const macroSpans=[];let unknownMacro=false;
      for(let at=body+1;at<rows.length;at++){const opening=macroOpen(rows,at);if(opening>=0){
        const owned=rows[at].text.replace(/!$/u,'')==='format'&&same(rows.slice(at-4,at).map(row=>row.text),['crate','::','translation_core','::'])&&!['::','#','.'].includes(rows[at-5]?.text),last=close(rows,opening);
        if(!owned||last<0)unknownMacro=true;if(last>=0){macroSpans.push([at,last]);at=last;}
      }}
      // Unknown statement macros can introduce a later shadowing binding even
      // when their written token tree is empty. Do not adopt around them.
      if(unknownMacro){stop('unexpanded macro may introduce callback or receiver bindings');continue;}
      for(let at=body+1;at+8<rows.length;at++){
        const token=rows[at];if(!ident(token)||['.','::','#'].includes(rows[at-1]?.text)||!['.','chars','(',')','.','count','(',')'].every((word,index)=>rows[at+index+1]?.text===word))continue;
        const closure=closures.find(row=>at>=row.start&&at<row.end),borrowed=closure?closure.name===token.text||bindings.get(token.text)===str&&!closures.some(row=>row.name===token.text):bindings.get(token.text)===str;
        if(!borrowed||macroSpans.some(([first,last])=>at>=first&&at<=last)){skipped.push({...record,callSpan:[token.start,rows[at+8].end],reason:'receiver binding is not a selected owned borrowed-text source occurrence'});continue;}
        if(item.tokens.some(row=>row.type==='comment'&&row.start>=token.start&&row.end<=rows[at+8].end)){stop('count call trivia contains comments');continue;}
        const edit={span:[token.start,rows[at+8].end],expected:source.slice(token.start,rows[at+8].end),replacement:target+'('+token.text+')'};edits.push(edit);selections.push({...record,callSpan:edit.span,receiver:token.text,binding:closure?.name===token.text?{kind:'owned-Maybe-borrowed-text-callback',receiver:closure.receiver}:{kind:'owned-borrowed-text-parameter'},originalIteratorImplementationTranslated:false});at+=8;
      }
    }
  }
  edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=1;at<edits.length;at++)if(edits[at-1].span[1]>edits[at].span[0])fail('overlapping substitutions');
  const applied=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'unicode-scalar-count:retain-borrowed-source-occurrences',edits:[]}],repositoryRules:[{id:'router-core:adopt-owned-unicode-scalar-count',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value)),mapping=[];let old=0,current=0;
  for(const edit of edits){if(edit.span[0]>old){const size=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+size]});current+=size;}mapping.push({kind:'substitution',before:edit.span,after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});current+=edit.replacement.length;old=edit.span[1];}if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});let restored=after.source;for(const row of [...mapping].reverse())if(row.kind==='substitution')restored=restored.slice(0,row.after[0])+row.expected+restored.slice(row.after[1]);if(restored!==source)fail('complete inverse changed');
  return {schema:'router-owned-scalar-count-proposal-v1',before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},edits,mapping,selections,skipped,importRoles,trace:applied.trace,executableAdmission:false,migrationSemantics:'maintainer-authorized explicit owned API adoption; source-backed nontrait import candidates do not prove generic iterator dispatch'};
}
export function proposeCoreScalarsCorpus(options={}){
  if(!options||typeof options!=='object'||types.isProxy(options)||![Object.prototype,null].includes(Object.getPrototypeOf(options)))fail('own-data options required');
  const fields=['entry','files','compilationProfile','dependencyInputs'].map(key=>[key,Object.getOwnPropertyDescriptor(options,key)]);for(const [key,d]of fields)if(d&&!Object.hasOwn(d,'value'))fail(key+' must be own data');
  const field=key=>fields.find(row=>row[0]===key)[1]?.value,entry=field('entry')??'src/lib.rs',input=field('files'),inputProfile=field('compilationProfile')??PRODUCTION_PROFILE,dependencyField=fields[3][1];
  if(dependencyField&&!Object.hasOwn(dependencyField,'value'))fail('dependencyInputs must be own data');const dependencyInputs=dependencyField?.value;
  if(!input||types.isProxy(input)||![Object.prototype,null].includes(Object.getPrototypeOf(input)))fail('own source map required');const files=Object.create(null);let total=0;const keys=Reflect.ownKeys(input);if(keys.length>1024)fail('file count bound');
  for(const path of keys){const d=Object.getOwnPropertyDescriptor(input,path);if(typeof path!=='string'||path.length>4096||!path.endsWith('.rs')||path.includes('\\')||/[\x00-\x1f:]/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..')||!d||!Object.hasOwn(d,'value')||typeof d.value!=='string'||d.value.length>2_000_000)fail('bounded canonical own source data required');total+=d.value.length;if(total>32_000_000)fail('source total bound');files[path]=d.value;}
  if(typeof entry!=='string'||!Object.hasOwn(files,entry))fail('entry source missing');const profile=normalizeProfile(inputProfile),graph=resolveModuleGraph({entry,paths:keys,readSource:path=>files[path],compilationProfile:profile}),root=graph.modules.filter(row=>!row.path.length),core=graph.modules.filter(row=>same(row.path,['translation_core'])),leaf=graph.modules.filter(row=>same(row.path,['translation_core','primitives']));
  if(root.length!==1||core.length!==1||leaf.length!==1||core[0].file!=='src/translation_core.rs'||leaf[0].file!=='src/translation_core/primitives.rs'||core[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaf[0].source!==ROUTER_CORE_PRIMITIVES_SOURCE||core[0].configurationCondition!=='active'||leaf[0].configurationCondition!=='active')fail('complete actual owned sources required');const edge=originalSourceModuleItems(root[0]).filter(item=>item.term==='mod'&&item.name==='translation_core');if(edge.length!==1||root[0].source.slice(edge[0].start,edge[0].end).trim()!=='pub mod translation_core;')fail('actual public core edge required');
  const after={...files},proposals=[],skipped=[],roleFor=createLiteralTextImportRoles(graph.modules,profile,dependencyInputs),dependencySources=dependencyInputs===undefined?null:Object.fromEntries(['manifest','lock'].map(key=>[key,Object.getOwnPropertyDescriptor(dependencyInputs,key).value]));
  for(const file of keys){if(file==='src/translation_core.rs'||file.startsWith('src/translation_core/'))continue;const modules=graph.modules.filter(row=>row.file===file),origins=modules.filter(row=>!row.sourceView.modulePath.length);if(origins.length!==1){skipped.push({file,reason:'missing or multiple physical source origins'});continue;}const origin=origins[0],parents=graph.modules.filter(row=>row.file!==file&&row.path.length<origin.path.length&&row.path.every((part,at)=>origin.path[at]===part)),importRoles=[],problems=[...parents.flatMap(row=>coreTypeProducerProblems(row.source,{compilationProfile:profile})),...methodProblems([...parents,...modules],profile,roleFor,importRoles)],proposal=fileProposal(files[file],modules,profile,problems,importRoles);proposals.push({file,module:origin.path,...proposal});after[file]=proposal.after.source;}
  const result={schema:'router-owned-scalar-count-corpus-v1',entry,compilationProfile:profile,dependencyInputs:dependencySources,before:{...files},after,inputs:Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},proposals,skipped,executableAdmission:false};
  verifyLiteralTextImportRoles(roleFor);const current=Object.getOwnPropertyDescriptor(options,'dependencyInputs');
  if(!!current!==!!dependencyField||dependencyField&&(!current||!Object.hasOwn(current,'value')||current.value!==dependencyInputs||current.writable!==dependencyField.writable||current.enumerable!==dependencyField.enumerable||current.configurable!==dependencyField.configurable))fail('dependencyInputs option changed');
  return result;
}
