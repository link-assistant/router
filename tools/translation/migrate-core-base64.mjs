// Proposal only. The explicit native-library-unit ABI is a new compatibility
// boundary, not permission for the old imported Engine/default-context route.
import {types} from 'node:util';
import {createHash} from 'node:crypto';
import {resolveModuleGraph} from './project.mjs';
import {translationProgressReporter} from './translation-progress.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {originalDeclarationHeader,originalUseDeclarationLeaves} from './module-bindings.mjs';
import {createWholeScopedCoreAdoptionProducerContext as createCoreAdoptionProducerContext,finishCoreAdoptionProducerContext,createCoreAdoptionNonTraitImportSelector} from './core-adoption-producer-context.mjs';
import {coreTypeProducerProblemsForModule} from './migrate-core-primitives.mjs';
import {compilationProfile,itemConfiguration,PRODUCTION_PROFILE} from './cfg-profile.mjs';
import {deriveDependencyProfile} from './derive-dependencies.mjs';
import {captureOriginalExternalTraitPackage,originalExternalTraitPackageInputs} from './extensions/external-trait-sources.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE,ROUTER_CORE_BASE64_SOURCE} from './router-core-source-data.mjs';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta,serializeConcreteSyntaxMeta,applyConcreteSyntaxSubstitutions} from './concrete-syntax-meta.mjs';
const fail=message=>{throw new TypeError('Owned base64 adoption: '+message);},hash=value=>createHash('sha256').update(value).digest('hex');
const inert=new Set(['cfg','doc','must_use','allow','warn','deny','forbid','expect','inline','cold','deprecated','track_caller','test']);
const ident=token=>token?.type==='ident'&&/^[A-Za-z_][A-Za-z_0-9]*$/u.test(token.text),words=rows=>rows.map(row=>row.text).join('');
function record(value,allowed){
 if(!value||typeof value!=='object'||types.isProxy(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('own data required');const names=Reflect.ownKeys(value),out=Object.create(null);
 if(names.length>1024)fail('field bound');for(const key of names){const field=Object.getOwnPropertyDescriptor(value,key);if(typeof key!=='string'||allowed&&!allowed.includes(key)||!field||!Object.hasOwn(field,'value'))fail('closed own data fields required');out[key]=field.value;}return out;
}
function close(rows,start){const pairs={'(':')','[':']','{':'}'},stack=[];for(let at=start;at<rows.length;at++){const word=rows[at].text;if(pairs[word])stack.push(pairs[word]);else if([')',']','}'].includes(word)){if(stack.pop()!==word)return -1;if(!stack.length)return at;}}return -1;}
function split(rows){const out=[];let first=0,depth=0;for(let at=0;at<=rows.length;at++){const word=rows[at]?.text;if(at===rows.length||word===','&&!depth){if(at>first)out.push(rows.slice(first,at));first=at+1;}else if(['(','[','{','<'].includes(word))depth++;else if([')',']','}','>'].includes(word))depth--;else if(word==='>>')depth-=2;if(depth<0)return null;}return depth?null:out;}
const sourceTypes=new Map([['&str','text'],['&crate::translation_core::Str','text'],['String','owned-text'],['::std::string::String','owned-text'],['crate::translation_core::Text','owned-text'],['&[u8]','bytes'],['Vec<u8>','owned-bytes'],['::std::vec::Vec<u8>','owned-bytes'],['[u8;32]','array32']]);
function parameters(rows){const out=new Map();for(const part of split(rows)??[null]){if(!part||!ident(part[0])||part[1]?.text!==':'||out.has(part[0].text)||['base64','String','Vec','str'].includes(part[0].text))return null;const kind=sourceTypes.get(words(part.slice(2)));if(!kind)return null;out.set(part[0].text,kind);}return out;}
function argument(rows,bindings){
 if(rows.length===1&&ident(rows[0])&&bindings.has(rows[0].text))return {kind:bindings.get(rows[0].text),binding:rows[0].text};
 // Literal content is left verbatim. The independent native CST classified
 // one Rust string token; byte/raw/C strings are not inferred from spelling.
 if(rows.length===1&&rows[0].type==='string'&&/^"(?:[^"\\]|\\.)*"$/su.test(rows[0].text))return {kind:'text',binding:null};
 return null;
}
function operation(config,method,kind){
 const family=config==='STANDARD'?'standard':config==='STANDARD_NO_PAD'?'standard_no_pad':config==='URL_SAFE_NO_PAD'?'url_no_pad':null;if(!family)return null;
 if(method==='decode')return ['text','owned-text'].includes(kind)&&!(family==='standard_no_pad'&&kind==='owned-text')?'base64_'+family+'_decode_'+kind.replace('-','_'):null;
 if(method!=='encode')return null;const suffix={text:'text',bytes:'bytes','owned-bytes':'owned_bytes','owned-text':'owned_text',array32:'array32'}[kind];
 return suffix&&(family==='url_no_pad'||family==='standard'&&['text','bytes','owned_bytes'].includes(suffix)||family==='standard_no_pad'&&suffix==='text')?'base64_'+family+'_encode_'+suffix:null;
}
function enginePath(rows){const value=words(rows).replace(/^::/u,'');return /^base64::engine::general_purpose::(STANDARD|STANDARD_NO_PAD|URL_SAFE_NO_PAD)$/u.exec(value)?.[1]??null;}
function scope(module,modules,profile,context,nonTrait){
 const ancestors=modules.filter(row=>row.path.length<=module.path.length&&row.path.every((name,at)=>module.path[at]===name)),problems=[],methodProblems=[],imports=[];let engineImports=0;
 for(const parent of ancestors){problems.push(...coreTypeProducerProblemsForModule(context,parent));for(const item of originalSourceModuleItems(parent)){
  if(item.comment)continue;const condition=itemConfiguration(item.tokens,profile);if(condition.status==='inactive')continue;const header=originalDeclarationHeader(item,parent.path);
  if(['base64','str','String','Vec','u8','std','core'].includes(header?.name)||item.tokens.some((row,at)=>row.text==='extern'&&item.tokens[at+1]?.text==='crate'))problems.push('source can compete with dependency or concrete parameter identity');
  if(header?.kind==='trait')methodProblems.push('another visible source trait');
  if(item.term!=='use')continue;for(const leaf of originalUseDeclarationLeaves(item,parent.path)){
   if(leaf.glob||['base64','String','Vec','str','u8','std','core','translation_core'].includes(leaf.name))problems.push('competing or glob import');
   const actual=words(leaf.segments.map(text=>({text})))==='base64Engine';
   // segments are kept as an array; concatenation above is only a cheap
   // selector. Exact original route and active attributes are checked below.
   if(actual&&leaf.segments.length===2&&leaf.segments[0]==='base64'&&leaf.segments[1]==='Engine'&&!leaf.glob&&!leaf.self&&condition.status==='active'&&condition.attributes.every(row=>inert.has(row.name))){if(parent===module)engineImports++;imports.push({file:parent.file,module:parent.path,span:[item.start,item.end],leaf,kind:'native-unit-Engine-candidate-only',lexicallyVisibleInConsumer:parent===module});}
   else {const role=nonTrait.select(parent,item,leaf);if(!role||!role.roles.length||role.roles.some(row=>row.namespace==='macro'||row.kind==='macro'||row.kind==='trait'))methodProblems.push('unresolved competing trait import');else imports.push(role);}
  }
 }}return {problems,methodProblems,engineImports,imports};
}
function fileProposal(source,modules,all,profile,context,nonTrait,progress=null){
 const file=progress?modules[0].file:null;
 if(progress)progress({stage:'project-serialize',state:'start',source:file,phase:'base64-original-CST'});
 const before=transportConcreteSyntaxSource(source,{language:'Rust'}),edits=[],selections=[],skipped=[],importRoles=[];
 if(progress)progress({stage:'project-serialize',state:'end',source:file,phase:'base64-original-CST'});
 for(const module of modules){
  if(progress)progress({stage:'namespace',state:'start',source:file,declaration:module.path.join('::')||'crate',phase:'base64-module-bindings'});
  const owners=scope(module,all,profile,context,nonTrait);importRoles.push(...owners.imports);
  if(progress)progress({stage:'namespace',state:'end',source:file,declaration:module.path.join('::')||'crate',phase:'base64-module-bindings'});
  for(const item of originalSourceModuleItems(module)){if(item.term!=='fn')continue;
   if(progress)progress({stage:'standalone',state:'advance',source:file,declaration:item.name,phase:'base64-function-analysis'});
   const rows=item.tokens.filter(row=>row.type!=='comment'),condition=itemConfiguration(item.tokens,profile),header=originalDeclarationHeader(item,module.path),base={function:item.name,module:module.path,span:[item.start,item.end]},stop=reason=>skipped.push({...base,reason});
   if(module.configurationCondition!=='active'||condition.status!=='active'||condition.attributes.some(row=>!inert.has(row.name))||owners.problems.length){stop('enclosing source producer, dependency shadow or conditional uncertainty');continue;}
   const name=rows.findIndex(row=>row.start===header?.nameSpan?.start),open=name+1,last=close(rows,open);if(name<0||rows[open]?.text!=='('||last<0){stop('ordinary nongeneric function required');continue;}
   const bindings=parameters(rows.slice(open+1,last));let body=last+1;while(body<rows.length&&rows[body].text!=='{')body++;if(!bindings||body>=rows.length||close(rows,body)!==rows.length-1){stop('complete concrete parameter and function body required');continue;}
   // A local item, closure or unexpanded macro can affect a name throughout
   // its scope. This finite lane does not infer its output or binding absence.
   if(rows.slice(body+1,-1).some(row=>['let','fn','trait','impl','type','struct','enum','union','mod','use','extern','macro','macro_rules!','|','||','#'].includes(row.text)||row.text==='!'||row.text.endsWith('!'))){stop('local binding, pattern/closure or unexpanded macro frontier');continue;}
   for(let at=body+1;at<rows.length-1;at++){
    if(rows[at].text==='::'&&at>body+1&&['ident','number'].includes(rows[at-1]?.type))continue;
    if(rows[at].text==='base64'&&['::','.','#'].includes(rows[at-1]?.text))continue;
    let first=at;if(rows[at].text==='::')at++;if(rows[at]?.text!=='base64'){at=first;continue;}
    let end=at;while(end<rows.length&&(ident(rows[end])||rows[end].text==='::'))end++;const prefix=words(rows.slice(at,end));let config,method,argRows,finish,syntax;
    if(/^base64::Engine::(?:encode|decode)$/u.test(prefix)&&rows[end]?.text==='('){finish=close(rows,end);const args=finish<0?null:split(rows.slice(end+1,finish));if(args?.length!==2||args[0][0]?.text!=='&')continue;config=enginePath(args[0].slice(1));method=prefix.endsWith('encode')?'encode':'decode';argRows=args[1];syntax='explicit-UFCS-native-unit';}
    else if(rows[end]?.text==='.'&&['encode','decode'].includes(rows[end+1]?.text)&&rows[end+2]?.text==='('){config=enginePath(rows.slice(at,end));method=rows[end+1].text;finish=close(rows,end+2);const args=finish<0?null:split(rows.slice(end+3,finish));if(args?.length!==1)continue;argRows=args[0];syntax='closed-native-unit-method';if(owners.engineImports!==1||owners.methodProblems.length){skipped.push({...base,callSpan:[rows[first].start,rows[finish].end],reason:'actual method trait candidate set remains open'});continue;}}
    else continue;
    if(!config||finish<0)continue;const operand=argument(argRows,bindings),selected=operand&&operation(config,method,operand.kind);if(!selected){skipped.push({...base,callSpan:[rows[first].start,rows[finish].end],reason:'generic/temporary/local operand is outside concrete owned ABI'});continue;}
    const argumentStart=argRows[0].start,argumentEnd=argRows.at(-1).end,span=[rows[first].start,rows[finish].end],replacement='crate::translation_core::'+selected+'('+source.slice(argumentStart,argumentEnd)+')';
    // Trivia inside the argument is preserved. Other removed trivia must be
    // whitespace: comments are never silently discarded by a substitution.
    if(item.tokens.some(row=>row.type==='comment'&&row.start>=span[0]&&row.end<=span[1]&&!(row.start>=argumentStart&&row.end<=argumentEnd))){stop('receiver/UFCS trivia contains an original comment');continue;}
    edits.push({span,expected:source.slice(...span),replacement});selections.push({...base,callSpan:span,configuration:config,nativeOperation:method,ownedOperation:selected,operand,syntax,libraryUnit:'base64-0.23.1-normal-dependency-ABI',originalTraitPermission:false});
    if(progress)progress({stage:'standalone',state:'advance',source:file,declaration:item.name,phase:'base64-candidate-lowering',completed:edits.length});
    at=finish;
   }
  }
 }
 edits.sort((a,b)=>a.span[0]-b.span[0]);for(let at=1;at<edits.length;at++)if(edits[at-1].span[1]>edits[at].span[0])fail('overlap');
 if(progress)progress({stage:'project-serialize',state:'start',source:file,phase:'base64-edited-CST-roundtrip'});
 const applied=applyConcreteSyntaxSubstitutions(before.document,{languageRules:[{id:'base64:concrete-native-unit-binding-and-once-only-argument',edits:[]}],repositoryRules:[{id:'router-core:adopt-qualified-owned-base64',edits}]}),after=transportConcreteSyntaxMeta(serializeConcreteSyntaxMeta(applied.value)),mapping=[];let old=0,current=0;
 if(progress)progress({stage:'project-serialize',state:'end',source:file,phase:'base64-edited-CST-roundtrip'});
 if(progress)progress({stage:'project-serialize',state:'start',source:file,phase:'base64-whole-source-inverse'});
 for(const edit of edits){if(edit.span[0]>old){const length=edit.span[0]-old;mapping.push({kind:'unchanged',before:[old,edit.span[0]],after:[current,current+length]});current+=length;}mapping.push({kind:'substitution',before:edit.span,after:[current,current+edit.replacement.length],expected:edit.expected,replacement:edit.replacement});current+=edit.replacement.length;old=edit.span[1];}if(old<source.length)mapping.push({kind:'unchanged',before:[old,source.length],after:[current,current+source.length-old]});let restored=after.source;for(const row of [...mapping].reverse())if(row.kind==='substitution')restored=restored.slice(0,row.after[0])+row.expected+restored.slice(row.after[1]);if(restored!==source)fail('full inverse changed');
 if(progress)progress({stage:'project-serialize',state:'end',source:file,phase:'base64-whole-source-inverse',completed:edits.length});
 return {schema:'router-owned-base64-file-proposal-v1',before:{source,meta:before.meta,sha256:hash(source)},after:{source:after.source,meta:after.meta,sha256:hash(after.source)},edits,mapping,selections,skipped,importRoles,trace:applied.trace,executableAdmission:false};
}
// The optional callback receives only the existing bounded progress schema.
// It is diagnostic data, never a source/owner permit; callback errors propagate.
export function proposeCoreBase64Corpus(input={},progressInput){
 const progress=progressInput==null?null:translationProgressReporter(progressInput);
 const options=record(input,['entry','files','compilationProfile','dependencyInputs']),files=record(options.files),entry=options.entry??'src/lib.rs',profile=compilationProfile(options.compilationProfile??PRODUCTION_PROFILE);let total=0;
 for(const [path,source]of Object.entries(files)){if(!path.endsWith('.rs')||path.length>4096||path.includes('\\')||/[\x00-\x1f:]/u.test(path)||path.split('/').some(part=>!part||part==='.'||part==='..')||typeof source!=='string'||source.length>2000000)fail('bounded canonical full sources required');total+=source.length;if(total>32000000)fail('source total bound');}
 if(!Object.hasOwn(files,entry))fail('entry missing');const dependencies=record(options.dependencyInputs,['manifest','lock']);if(typeof dependencies.manifest!=='string'||typeof dependencies.lock!=='string'||dependencies.manifest.length>2000000||dependencies.lock.length>2000000)fail('complete bounded Cargo inputs required');
 if(progress)progress({stage:'project',state:'start',entry,phase:'base64-dependency-proof'});
 const proof=deriveDependencyProfile(dependencies).proof;if(!proof)fail('actual locked dependency proof required');const library=originalExternalTraitPackageInputs(captureOriginalExternalTraitPackage(proof,'base64'));
 if(progress)progress({stage:'project',state:'end',entry,phase:'base64-dependency-proof'});
 if(progress)progress({stage:'project-graph',state:'start',entry,phase:'base64-module-discovery'});
 const graph=resolveModuleGraph({entry,paths:Object.keys(files),readSource:path=>files[path],compilationProfile:profile},progress?progressInput:undefined),core=graph.modules.filter(row=>row.path.join('::')==='translation_core'),leaf=graph.modules.filter(row=>row.path.join('::')==='translation_core::base64'),root=graph.modules.filter(row=>!row.path.length);
 if(core.length!==1||leaf.length!==1||root.length!==1||core[0].file!=='src/translation_core.rs'||leaf[0].file!=='src/translation_core/base64.rs'||core[0].source!==ROUTER_FORMATTING_FACADE_SOURCE||leaf[0].source!==ROUTER_CORE_BASE64_SOURCE||core[0].configurationCondition!=='active'||leaf[0].configurationCondition!=='active')fail('complete active owned facade and leaf required');const edge=originalSourceModuleItems(root[0]).filter(row=>row.term==='mod'&&row.name==='translation_core');if(edge.length!==1||root[0].source.slice(edge[0].start,edge[0].end).trim()!=='pub mod translation_core;')fail('actual public root edge required');
 if(progress)progress({stage:'project-graph',state:'end',entry,phase:'base64-module-discovery',total:graph.modules.length});
 if(progress)progress({stage:'namespace',state:'start',entry,phase:'base64-producer-context'});
 const context=createCoreAdoptionProducerContext({modules:graph.modules,compilationProfile:profile,dependencyInputs:dependencies}),nonTrait=createCoreAdoptionNonTraitImportSelector({modules:graph.modules,compilationProfile:profile,context}),after={...files},proposals=[],skipped=[];
 if(progress)progress({stage:'namespace',state:'end',entry,phase:'base64-producer-context'});
 for(const file of Object.keys(files)){if(file==='src/translation_core.rs'||file.startsWith('src/translation_core/'))continue;const modules=graph.modules.filter(row=>row.file===file);if(!modules.length){skipped.push({file,reason:'source is not a selected module'});continue;}if(progress)progress({stage:'standalone',state:'start',entry,source:file,phase:'base64-file-analysis'});
  const proposal=fileProposal(files[file],modules,graph.modules,profile,context,nonTrait,progress);proposals.push({file,...proposal});after[file]=proposal.after.source;
  if(progress)progress({stage:'standalone',state:'end',entry,source:file,phase:'base64-file-analysis',completed:proposals.length});}
 if(progress)progress({stage:'namespace',state:'start',entry,phase:'base64-final-private-verification'});
 nonTrait.verify();const producerEffects=finishCoreAdoptionProducerContext(context);
 return {schema:'router-owned-base64-corpus-v1',entry,compilationProfile:profile,dependencyInputs:dependencies,libraryInputs:library,before:{...files},after,inputs:Object.entries(files).map(([file,source])=>({file,source,sha256:hash(source)})),moduleGraph:{modules:graph.modules,edges:graph.edges,diagnostics:graph.diagnostics,concreteSyntaxMeta:graph.concreteSyntaxMeta},proposals,skipped,...(producerEffects?{producerEffects}:{}),executableAdmission:false};
}
