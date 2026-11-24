import {crateModuleSourcePath} from './repository-layout.mjs';
// Explicit paired scalar API source adoption, not implicit standard-library inference.
// Every proposal retains complete inputs and inverses; executable permission
// comes only from independently checking the newly reconstructed source.
import {createHash} from 'node:crypto';
import {types} from 'node:util';
import {resolveModuleGraph} from './project.mjs';
import {FIXED_TYPE_CORE_NATIVE_SOURCE,FIXED_TYPE_CORE_ALIASES} from './fixed-type-core-source.mjs';
import {sourceItems} from './rust-structure.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves} from './module-bindings.mjs';
import {compilationProfile as normalizeProfile,itemConfiguration,isInertConditionalAttribute} from './cfg-profile.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions,serializeConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
import {createCoreAdoptionProducerContext,coreAdoptionDeriveAttributeClosed,finishCoreAdoptionProducerContext} from './source-bound-owned-core-context.mjs';

const hash=source=>createHash('sha256').update(source).digest('hex');
const fail=message=>{throw new TypeError('Core fixed-type migration: '+message);};
const MAX_SOURCE=2_000_000,MAX_TOTAL=32_000_000,MAX_FILES=1024,MAX_DEPTH=64;
const replacements=new Map(FIXED_TYPE_CORE_ALIASES.map(row=>[row.primitive,'crate::translation_fixed_types_core::'+row.name]));
const competes=name=>replacements.has(name);
const harmless=new Set(['doc','must_use','allow','warn','deny','forbid','expect','inline','cold','deprecated','non_exhaustive','track_caller','repr','test']);
const identifier=token=>token?.type==='ident'&&/^[\p{ID_Start}_][\p{ID_Continue}_]*$/u.test(token.text);
const significant=item=>item.tokens.filter(token=>token.type!=='comment');
const span=item=>[item.start,item.end];
const problem=(item,reason)=>({span:span(item),reason});
function bounded(source){if(typeof source!=='string'||source.length>MAX_SOURCE)fail('complete bounded primitive source required');return source;}
function sourceMap(input){
  if(!input||typeof input!=='object'||types.isProxy(input)||![null,Object.prototype].includes(Object.getPrototypeOf(input)))fail('files require an ordinary own-data source map');
  const keys=Reflect.ownKeys(input);if(keys.length>MAX_FILES)fail('source file count exceeds bound');
  const files=Object.create(null);let total=0;
  for(const key of keys){
    if(typeof key!=='string'||key.length>4096||!key.endsWith('.rs')||key.includes('\\')||/[\x00-\x1f:]/u.test(key)||key.split('/').some(part=>!part||part==='.'||part==='..'))fail('source path must be a repository-relative Rust file');
    const descriptor=Object.getOwnPropertyDescriptor(input,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value'))fail('files require own primitive source fields');
    const source=bounded(descriptor.value);total+=source.length;if(total>MAX_TOTAL)fail('complete source total exceeds bound');files[key]=source;
  }
  return files;
}
function conditions(item,profile){return itemConfiguration(item.tokens,profile);}
function attributeProblems(item,condition,producer=null){
  if(condition.status==='inactive')return [];
  const problems=[];
  for(const attribute of condition.attributes){
    if(attribute.name==='cfg'||isInertConditionalAttribute(attribute)||harmless.has(attribute.name))continue;
    if(producer&&coreAdoptionDeriveAttributeClosed(producer.context,producer.source,producer.file,producer.localPath,item,attribute))continue;
    // Importing textual macro names does not itself import type names. Actual
    // module-level invocations and unknown attribute/derive producers below
    // remain explicit uncertainty, without inspecting macro template bodies.
    if(attribute.name==='macro_use'&&item.term==='mod'&&attribute.tokens.join('')==='#[macro_use]')continue;
    problems.push(problem(item,'unresolved attribute producer '+attribute.name));
  }
  return problems;
}
function otherDeclarationProblem(item,condition){
  if(item.comment)return null;
  const rows=significant(item),after=condition.attributes.at(-1)?.span.end??item.start;
  let at=rows.findIndex(token=>token.start>=after);if(at<0)return null;
  if(rows[at]?.text==='pub'){
    at++;if(rows[at]?.text==='(')at=matchesClose(rows,at)+1;
  }
  if(rows[at]?.text==='extern'&&rows[at+1]?.text==='crate'){
    const name=rows[at+2];let end=at+3,bound=name?.text;
    if(!identifier(name))return 'unresolved extern crate declaration';
    if(rows[end]?.text==='as'){
      const alias=rows[end+1];if(!identifier(alias))return 'unresolved extern crate alias';
      bound=alias.text;end+=2;
    }
    if(rows[end]?.text!==';'||end!==rows.length-1)return 'unresolved extern crate declaration';
    return competes(bound)?'extern crate type binding competes with a selected primitive':null;
  }
  // A complete ordinary macro_rules definition declares a macro name only;
  // its template is never traversed as if it had already emitted type items.
  let nameAt=-1;
  if(rows[at]?.text==='macro_rules!')nameAt=at+1;
  else if(rows[at]?.text==='macro_rules'&&rows[at+1]?.text==='!')nameAt=at+2;
  if(nameAt>=0&&identifier(rows[nameAt])&&['(','[','{'].includes(rows[nameAt+1]?.text)){
    const close=matchesClose(rows,nameAt+1);
    if(close===rows.length-1||close===rows.length-2&&rows.at(-1).text===';')return null;
  }
  return 'unresolved declaration producer';
}
function scopeProblems(items,profile,owner=[],producer=null){
  const problems=[];
  for(const item of items){
    const condition=conditions(item,profile);if(condition.status==='inactive')continue;
    problems.push(...attributeProblems(item,condition,producer));
    let header;try{header=originalDeclarationHeader(item,owner);}catch(error){problems.push(problem(item,'unresolved declaration header: '+error.message));continue;}
    if(!header){
      let reason;try{reason=otherDeclarationProblem(item,condition);}catch(error){reason='unresolved declaration producer: '+error.message;}
      if(reason)problems.push(problem(item,reason));
    }
    if(header&&['type','struct','enum','union','trait','mod'].includes(header.kind)&&competes(header.name))problems.push(problem(item,'source type declaration competes with a selected primitive'));
    if(item.term==='use'){
      try{for(const leaf of originalUseDeclarationLeaves(item,owner))if(leaf.glob||competes(leaf.name))problems.push(problem(item,leaf.glob?'unresolved glob type imports':'source import competes with a selected primitive'));}
      catch(error){problems.push(problem(item,'unresolved use declaration: '+error.message));}
    }
    if(item.term==='opaque'&&significant(item).some(token=>token.text==='!'||token.text.endsWith('!')))problems.push(problem(item,'unresolved declaration-position bang producer'));
  }
  return problems;
}
function matchesClose(tokens,start){
  const pairs={'(':')','[':']','{':'}'},stack=[];
  for(let at=start;at<tokens.length;at++){
    const text=tokens[at].text;
    if(pairs[text])stack.push(pairs[text]);
    else if([')',']','}'].includes(text)){
      if(stack.pop()!==text)throw new Error('unbalanced declaration delimiter');
      if(!stack.length)return at;
    }
  }
  throw new Error('unclosed declaration delimiter');
}
function split(tokens,separator){
  const result=[];let begin=0,angle=0;
  for(let at=0;at<tokens.length;at++){
    const text=tokens[at].text;
    if(['(','[','{'].includes(text)){at=matchesClose(tokens,at);continue;}
    if(text==='<')angle++;else if(text==='>')angle--;else if(text==='>>')angle-=2;
    if(angle<0)throw new Error('unbalanced type arguments');
    if(text===separator&&!angle){result.push(tokens.slice(begin,at));begin=at+1;}
  }
  if(angle)throw new Error('unclosed type arguments');
  if(begin<tokens.length)result.push(tokens.slice(begin));return result;
}
function typeEdits(original,{lifetimes=[]}={}){
  // Splitting >> is only a structural type-delimiter view. Original source
  // spans remain whole; only complete bare scalar type leaves are substituted.
  const tokens=original.flatMap(token=>token.text==='>>'?[{...token,text:'>',end:token.start+1},{...token,text:'>',start:token.start+1}]:[token]);
  const edits=[];let at=0;
  const is=text=>tokens[at]?.text===text;
  const eat=text=>is(text)?tokens[at++]:null;
  const expect=text=>{if(!eat(text))throw new Error('unsupported type grammar; expected '+text);};
  function type(depth){
    if(depth>MAX_DEPTH)throw new Error('type nesting exceeds bound');
    if(eat('&')){
      const lifetime=tokens[at];
      if(lifetime?.text.startsWith("'")){
        if(lifetime.text!=="'static"&&!lifetimes.includes(lifetime.text))throw new Error('named lifetime lacks an original supported binder');at++;
      }
      eat('mut');type(depth+1);
      return;
    }
    if(eat('(')){
      if(!is(')')){type(depth+1);while(eat(',')){if(is(')'))break;type(depth+1);}}
      expect(')');return;
    }
    if(eat('[')){
      type(depth+1);
      if(eat(';')){if(tokens[at]?.type!=='number'||!/^[0-9][0-9_]*$/u.test(tokens[at].text))throw new Error('array length requires separate expression grammar');at++;}
      expect(']');return;
    }
    if(eat('!'))return;
    const absolute=!!eat('::'),begin=at;let generic=false;
    const names=[];
    do{
      const token=tokens[at++];
      if(!identifier(token)||['dyn','impl','fn','for','unsafe','extern','mut','where'].includes(token.text))throw new Error('unsupported source type form');
      names.push(token.text);
      if(eat('<')){
        generic=true;if(competes(token.text)||is('>'))throw new Error('unsupported primitive or empty type arguments');
        type(depth+1);while(eat(',')){if(is('>'))break;type(depth+1);}expect('>');
      }
    }while(eat('::'));
    if(!names.length)throw new Error('missing type');
    if(!absolute&&!generic&&names.length===1&&competes(names[0])){const token=tokens[begin];edits.push({span:[token.start,token.end],expected:token.text,replacement:replacements.get(token.text)});}
  }
  type(0);if(at!==tokens.length)throw new Error('unconsumed source type syntax');return edits;
}
function functionEdits(item,header,parseType=typeEdits,outerLifetimes=[]){
  const rows=significant(item),name=rows.findIndex(token=>token.start===header.nameSpan.start),binders=readLifetimeOnlySourceBinders(rows,name+1,outerLifetimes),open=binders.after,selectType=tokens=>parseType(tokens,{lifetimes:binders.lifetimes});
  if(rows[open]?.text!=='(')throw new Error('only lifetime function binders are supported');
  const close=matchesClose(rows,open),selected=[];
  for(const parameter of split(rows.slice(open+1,close),',')){
    if(!parameter.length)continue;
    let colon=-1;
    for(let at=0;at<parameter.length;at++){
      if(['(','[','{'].includes(parameter[at].text)){at=matchesClose(parameter,at);continue;}
      if(parameter[at].text===':'){colon=at;break;}
    }
    if(colon<0){
      if(parameter.map(token=>token.text).join('')==='self'||['&self',"&'staticself",'&mutself'].includes(parameter.map(token=>token.text).join('')))continue;
      throw new Error('parameter requires an actual type annotation');
    }
    if(!colon)throw new Error('missing parameter pattern');
    selected.push(...selectType(parameter.slice(colon+1)));
  }
  let at=close+1;
  if(rows[at]?.text==='->'){
    const begin=++at;while(at<rows.length&&rows[at].text!=='{'&&rows[at].text!==';')at++;
    selected.push(...selectType(rows.slice(begin,at)));
  }
  if(rows[at]?.text!=='{'||matchesClose(rows,at)!==rows.length-1)throw new Error('function body or where grammar requires separate integration');
  return selected;
}
function constantEdits(item,header,parseType=typeEdits){
  const rows=significant(item),name=rows.findIndex(token=>token.start===header.nameSpan.start);
  if(rows[name+1]?.text!==':')throw new Error('constant type annotation unavailable');
  let at=name+2;
  for(;at<rows.length;at++){
    if(['(','[','{'].includes(rows[at].text)){at=matchesClose(rows,at);continue;}
    if(rows[at].text==='=')break;
  }
  if(rows[at]?.text!=='='||rows.at(-1)?.text!==';')throw new Error('complete constant initializer unavailable');
  return parseType(rows.slice(name+2,at));
}
function itemBody(item){
  const rows=significant(item),open=rows.findIndex(token=>token.text==='{');
  if(open<0||matchesClose(rows,open)!==rows.length-1)throw new Error('complete owner body unavailable');
  return {rows,open,start:rows[open].end,end:rows.at(-1).start};
}
function visitItems(source,items,profile,inherited,path,edits,selections,skipped,depth=0,modulePath=path,producer=null,lifetimes=[]){
  if(depth>MAX_DEPTH)fail('declaration owner nesting exceeds bound');
  const blockers=[...inherited,...scopeProblems(items,profile,modulePath,producer)];
  for(const item of items){
    const condition=conditions(item,profile);let header;
    try{header=originalDeclarationHeader(item,modulePath);}catch(error){skipped.push({path:[...path],span:span(item),reason:error.message});continue;}
    if(!header||!['fn','const','static','impl','struct','union','enum','type'].includes(header.kind))continue;
    const record={name:header.name,kind:header.kind,path:[...path],span:span(item)};
    if(condition.status!=='active'){skipped.push({...record,reason:'declaration configuration '+condition.status});continue;}
    if(blockers.length){skipped.push({...record,reason:'source binding or producer uncertainty',blockers});continue;}
    try{
      if(header.kind==='impl'){
        const body=itemBody(item),keyword=body.rows.findIndex(token=>token.start===header.keywordSpan.start),binders=readLifetimeOnlySourceBinders(body.rows,keyword+1,lifetimes),owner=body.rows.slice(binders.after,body.open);
        readLifetimeOnlyTypeOwnerSource(owner,binders.lifetimes);
        const offset=body.start,nested=sourceItems(source.slice(body.start,body.end)).map(child=>({...child,start:child.start+offset,end:child.end+offset,tokens:child.tokens.map(token=>({...token,start:token.start+offset,end:token.end+offset}))}));
        visitItems(source,nested,profile,blockers,[...path,'impl '+owner.map(token=>token.text).join('')],edits,selections,skipped,depth+1,modulePath,producer,binders.lifetimes);continue;
      }
      if(header.rawIdentifier)throw new Error('raw declaration identity requires separate integration');
      const selectType=(tokens,options={})=>typeEdits(tokens,{lifetimes:[...new Set([...lifetimes,...(options.lifetimes??[])])]});const selected=header.kind==='fn'?functionEdits(item,header,typeEdits,lifetimes):['const','static'].includes(header.kind)?constantEdits(item,header,selectType):fixedTypeDeclarationEdits(item,header,selectType,{lifetimes});
      edits.push(...selected);selections.push({...record,edits:selected});
    }catch(error){skipped.push({...record,reason:error.message});}
  }
}
const producerSelection=(context,module)=>context?{context,source:module.source,file:module.file,localPath:module.sourceView?.modulePath??module.path}:null;
function proposal(source,modules,profile,ancestorProblems=[],producerContext=null){
  const before=transportConcreteSyntaxSource(source,{language:'Rust'}),edits=[],selections=[],skipped=[];
  for(const module of modules){
    if(module.path[0]?.startsWith('translation_')){skipped.push({path:module.path,reason:'protected native compatibility subtree; source unchanged'});continue;}
    if(module.configurationCondition!=='active'){skipped.push({path:module.path,reason:'module configuration '+module.configurationCondition});continue;}
    const ancestors=modules.filter(parent=>parent!==module&&parent.path.length<module.path.length&&parent.path.every((name,index)=>module.path[index]===name));
    const inherited=[...ancestorProblems,...ancestors.flatMap(parent=>scopeProblems(originalSourceModuleItems(parent),profile,parent.path,producerSelection(producerContext,parent)))];
    visitItems(source,originalSourceModuleItems(module),profile,inherited,module.path,edits,selections,skipped,0,module.path,producerSelection(producerContext,module));
  }
  edits.sort((left,right)=>left.span[0]-right.span[0]);
  for(let at=0;at<edits.length;at++)if(source.slice(...edits[at].span)!==edits[at].expected||at&&edits[at-1].span[1]>edits[at].span[0])fail('selected source edits overlap or changed');
  const applied=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'fixed-type-adoption:retain-complete-typed-source',edits:[]}],repositoryRules:[{id:'router-core:qualify-paired-scalar-type',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value));
  const mapping=[];let old=0,current=0;
  for(const edit of edits){
    if(edit.span[0]>old){const length=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+length]});current+=length;}
    mapping.push({kind:'substitution',before:[...edit.span],after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});current+=edit.replacement.length;old=edit.span[1];
  }
  if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});
  let inverse=after.source;
  for(let at=mapping.length-1;at>=0;at--){const row=mapping[at];if(row.kind==='substitution'){if(inverse.slice(...row.after)!==row.replacement)fail('inverse substitution differs');inverse=inverse.slice(0,row.after[0])+row.expected+inverse.slice(row.after[1]);}}
  if(inverse!==source)fail('complete inverse differs');
  return {schema:'router-core-fixed-types-migration-v1',before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},compilationProfile:profile,selections,skipped,edits,mapping,trace:applied.trace,migrationSemantics:'explicit-owned-API-adoption; implicit standard-library implementation is not translated or proved',executableAdmission:false};
}
export function proposeCoreFixedTypesCorpus({entry='src/lib.rs',files:input,compilationProfile:inputProfile=null,dependencyInputs}={}){
  const files=sourceMap(input),profile=normalizeProfile(inputProfile);
  if(!Object.hasOwn(files,entry))fail('entry must select an original tracked source');
  const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile}),proposals=[],skipped=[],after={...files};
  const samePath=(module,path)=>module.path.length===path.length&&module.path.every((name,index)=>name===path[index]);
  const roots=graph.modules.filter(module=>samePath(module,[])),cores=graph.modules.filter(module=>samePath(module,['translation_fixed_types_core']));
  if(roots.length!==1)fail('one actual original crate root required');
  const declarations=originalSourceModuleItems(roots[0]).filter(item=>item.term==='mod'&&item.name==='translation_fixed_types_core');
  const expected=crateModuleSourcePath(graph.modules,'src/translation_fixed_types_core.rs');
  // An absent explicit interface is an unchanged source proposal, not implicit
  // scalar admission. A partially present or altered interface always refuses.
  if(!declarations.length&&!cores.length&&!Object.hasOwn(files,expected))return {schema:'router-core-fixed-types-corpus-proposal-v1',entry,compilationProfile:profile,before:{...files},after:{...files},inputs:Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),proposals:[],skipped:[{reason:'explicit paired scalar interface absent; source unchanged'}],moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},migrationSemantics:'no source adoption',executableAdmission:false};
  if(cores.length!==1||cores[0].file!==expected||cores[0].source!==FIXED_TYPE_CORE_NATIVE_SOURCE||cores[0].configurationCondition!=='active')fail('actual complete active paired scalar library required');
  if(declarations.length!==1||roots[0].source.slice(declarations[0].start,declarations[0].end).trim()!=='pub mod translation_fixed_types_core;')fail('actual unadorned public scalar declaration required');
  if(originalSourceModuleItems(roots[0]).some(item=>item.term==='use'&&item.tokens.some(token=>token.text==='translation_fixed_types_core')))fail('competing root scalar alias is unsupported');
  const producerContext=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:profile,dependencyInputs});
  for(const file of Object.keys(files)){
    const modules=graph.modules.filter(module=>module.file===file),origins=modules.filter(module=>module.sourceView?.modulePath.length===0);
    if(!modules.length||origins.length!==1){skipped.push({file,reason:modules.length?'physical source has multiple or unknown module origins':'source is outside the selected original module graph'});continue;}
    const origin=origins[0];if(origin.path[0]?.startsWith('translation_')){skipped.push({file,reason:'protected native compatibility subtree; source unchanged'});continue;}
    const ancestors=graph.modules.filter(module=>module.file!==file&&module.path.length<origin.path.length&&module.path.every((name,index)=>origin.path[index]===name));
    const blockers=ancestors.flatMap(module=>scopeProblems(originalSourceModuleItems(module),profile,module.path,producerSelection(producerContext,module)));
    const result=proposal(files[file],modules,profile,blockers,producerContext);proposals.push({file,module:origin.path,...result});after[file]=result.after.source;
  }
  const inputs=Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),producerEffects=finishCoreAdoptionProducerContext(producerContext);
  return {schema:'router-core-fixed-types-corpus-proposal-v1',entry,compilationProfile:profile,...(producerEffects?{producerEffects}:{}),before:{...files},after,inputs,moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},proposals,skipped,migrationSemantics:'explicit-owned-API-adoption; every rewritten source requires fresh semantic checking',executableAdmission:false};
}


import {fixedTypeDeclarationEdits} from './fixed-type-declaration-source.mjs';

import {readLifetimeOnlySourceBinders,readLifetimeOnlyTypeOwnerSource} from './lifetime-only-declaration-source.mjs';
