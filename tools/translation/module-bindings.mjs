import {compilationProfile,itemConfiguration,isInertConditionalAttribute} from './cfg-profile.mjs';
// Rust 2018+ binding evidence, not body translation or macro expansion.
// https://doc.rust-lang.org/reference/items/use-declarations.html
// https://doc.rust-lang.org/reference/visibility-and-privacy.html
// https://doc.rust-lang.org/reference/names/namespaces.html
import {sourceItems} from './rust-structure.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {macroBindingAffects} from './macro-subnamespaces.mjs';
import {deriveFootprintAt,deriveFootprintHelperAttributeAt,isDeriveFootprintContext} from './derive-footprints.mjs';
import {deriveBangModules,deriveBangOutputAt,deriveBangHelperAttributeAt,isDeriveBangContext} from './derive-bang-context.mjs';
import {proveDeriveEmptyEnclosingEffect,deriveEmptyEnclosingEffectFacts} from './derive-output-effects.mjs';
import {toolAttributeAt,isToolAttributeContext,inertInnerLintItem} from './tool-attributes.mjs';
import {builtinInnerSourceItem} from './inner-source-attributes.mjs';
const namespaces=['type','value','macro'];
const identifier=token=>token?.type==='ident' && /^[\p{L}_][\p{L}\p{N}_]*$/u.test(token.text);
const key=path=>path.join('::');
const canonical=path=>['crate',...path];
const descendant=(path,ancestor)=>ancestor.every((name,index)=>path[index]===name);
const visible=(visibility,path)=>visibility.kind==='public' || descendant(path,visibility.path);
const narrower=(requested,original)=>original.kind==='public' || requested.kind==='restricted' && descendant(requested.path,original.path);
const frozen=value=>{if(value && typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;};
// Identity permits reuse of immutable namespace setup, never body admission.
// Copies and caller-created arrays retain the ordinary uncached path.
const resolvedSourceScopeSets=new WeakSet();
const resolvedSourceScopeOrigins=new WeakMap();
export const isResolvedSourceScopeSet=scopes=>!!scopes&&resolvedSourceScopeSets.has(scopes);
// A genuine array identity alone does not associate a different same-path
// source with its bindings. This private origin join adds no public metadata.
export function assertResolvedSourceScopeOrigin(scopes,{modules,compilationProfile:profileInput=null}={}){
  const origin=resolvedSourceScopeOrigins.get(scopes);
  if(!origin||!Array.isArray(modules)||modules.length!==origin.modules.length||JSON.stringify(compilationProfile(profileInput))!==JSON.stringify(origin.compilationProfile))throw new TypeError('Resolved source scopes require their exact original module/profile origin');
  for(let index=0;index<modules.length;index++){
    const module=modules[index],original=origin.modules[index];
    if(module.file!==original.file||JSON.stringify(module.path)!==JSON.stringify(original.path)||module.source!==original.source||Object.hasOwn(module,'sourceView')!==original.hasSourceView||module.sourceView!==original.sourceView||Object.hasOwn(module,'compilationProfile')!==original.hasCompilationProfile||JSON.stringify(compilationProfile(module.compilationProfile))!==JSON.stringify(original.moduleCompilationProfile)||Object.hasOwn(module,'configurationCondition')!==original.hasConfigurationCondition||module.configurationCondition!==original.configurationCondition)throw new TypeError('Resolved source scopes belong to a different original source/view/path/profile/condition');
  }
  return scopes;
}
function tokensOf(item) {
  const input=item.tokens.filter(token=>token.type!=='comment'),result=[];
  for(let index=0;index<input.length;index++) {
    const first=input[index],hash=input[index+1],last=input[index+2];
    if(first.text==='r' && hash?.text==='#' && identifier(last) && first.end===hash.start && hash.end===last.start) {result.push({...last,start:first.start,rawIdentifier:true});index+=2;}
    else result.push(first);
  }
  return result;
}
function close(tokens,start) {
  const pairs={'(':')','[':']','{':'}'},stack=[];
  for(let index=start;index<tokens.length;index++) {
    const token=tokens[index];if(token.type!=='punct')continue;
    if(pairs[token.text])stack.push(pairs[token.text]);
    else if([')',']','}'].includes(token.text)) {
      if(stack.pop()!==token.text)throw new Error('unbalanced binding declaration');
      if(!stack.length)return index;
    }
  }
  throw new Error('unterminated binding declaration');
}
function qualified(segments,owner) {
  let path=[...owner],at=0;
  if(segments[0]==='crate'){path=[];at++;}
  else if(segments[0]==='self')at++;
  else if(segments[0]!=='super')return null;
  while(segments[at]==='super') {if(!path.length)return null;path.pop();at++;}
  return [...path,...segments.slice(at)];
}
function header(tokens,owner) {
  let at=0;const attributes=[];
  while(tokens[at]?.text==='#') {
    const begin=at++;if(tokens[at]?.text==='!')at++;
    if(tokens[at]?.text!=='[')throw new Error('unresolved binding attribute');
    const end=close(tokens,at),body=tokens.slice(at+1,end);
    attributes.push({name:body[0]?.text,tokens:body.map(token=>token.text),...(body[0]?.text==='path'?{pathLiteral:body.length===3 && body[1]?.text==='=' && body[2]?.type==='string'}:{}),span:{start:tokens[begin].start,end:tokens[end].end}});at=end+1;
  }
  let visibility={kind:'restricted',path:[...owner]};
  if(tokens[at]?.text==='pub') {
    at++;visibility={kind:'public'};
    if(tokens[at]?.text==='(') {
      const end=close(tokens,at),body=tokens.slice(at+1,end).map(token=>token.text),segments=body.filter(token=>token!=='::' && token!=='in');
      const path=qualified(segments,owner);
      if(!path || !descendant(owner,path) || body.some(token=>!['in','::'].includes(token) && !/^[\p{L}_][\p{L}\p{N}_]*$/u.test(token)))throw new Error('visibility does not resolve to an ancestor module');
      visibility={kind:'restricted',path};at=end+1;
    }
  }
  return {at,attributes,visibility};
}
// Syntax only: the keyword must begin the actual declaration after its
// attributes/visibility. A keyword inside a bang producer is not its header.
export function originalDeclarationHeader(item,owner=[]) {
  const tokens=tokensOf(item),parsed=header(tokens,owner);let at=parsed.at;
  const begin=at;
  if(tokens[at]?.text==='default')at++;
  if(tokens[at]?.text==='const')at++;
  if(tokens[at]?.text==='async')at++;
  if(tokens[at]?.text==='unsafe')at++;
  if(tokens[at]?.text==='extern'){at++;if(tokens[at]?.type==='string')at++;}
  if(tokens[at]?.text!=='fn'){
    at=begin;
    if(tokens[at]?.text==='unsafe')at++;
    if(tokens[at]?.text==='auto')at++;
    if(tokens[at]?.text!=='trait')at=begin;
  }
  const keyword=tokens[at],kind=keyword?.text;
  if(!['fn','const','static','struct','union','enum','type','mod','trait','impl','use'].includes(kind))return null;
  let nameAt=at+1;if(kind==='static'&&tokens[nameAt]?.text==='mut')nameAt++;
  const named=!['impl','use'].includes(kind),name=tokens[nameAt];
  if(named&&!identifier(name))return null;
  if(kind==='fn'&&!['(','<'].includes(tokens[nameAt+1]?.text))return null;
  if(['const','static'].includes(kind)&&tokens[nameAt+1]?.text!==':')return null;
  return frozen({kind,name:named?name.text:null,keywordSpan:{start:keyword.start,end:keyword.end},
    ...(named?{nameSpan:{start:name.start,end:name.end},rawIdentifier:name.rawIdentifier===true}:{}),namespaceAuthority:false});
}
function leaves(tokens,start) {
  let at=start;const output=[];
  const eat=text=>tokens[at]?.text===text?tokens[at++]:null;
  const name=()=>{if(!identifier(tokens[at]))throw new Error('unresolved use path segment');return tokens[at++].text;};
  const tree=(prefix,externalOnly=false)=>{
    if(eat('::')){if(prefix.length)throw new Error('absolute use prefix appears within a path');externalOnly=true;}
    if(eat('{')) {
      if(tokens[at]?.text==='}')output.push({segments:prefix,externalOnly,validateOnly:true});
      while(tokens[at]?.text!=='}') {tree(prefix,externalOnly);if(!eat(','))break;}
      if(!eat('}'))throw new Error('unterminated use group');return;
    }
    if(eat('*')){if(!prefix.length)throw new Error('glob import requires a parent path');output.push({segments:prefix,externalOnly,glob:true});return;}
    const segment=name(),path=[...prefix,segment];
    if(eat('::')){tree(path,externalOnly);return;}
    const alias=eat('as')?name():null,self=segment==='self' && prefix.length>0;
    output.push({segments:self?prefix:path,externalOnly,self,alias,name:alias??(self?prefix.at(-1):segment)});
  };
  tree([]);
  if(!eat(';') || at!==tokens.length)throw new Error('use tree has an unresolved terminator');
  return output;
}
// Syntax candidates only. Consumers still need their private original module
// association, visibility, configuration and namespace proofs.
export function originalUseDeclarationLeaves(item,owner=[]) {
  const tokens=tokensOf(item),parsed=header(tokens,owner);
  if(item.term!=='use'||tokens[parsed.at]?.text!=='use')throw new TypeError('Original use candidates require a complete use declaration');
  return frozen(leaves(tokens,parsed.at+1).map(leaf=>({...leaf,namespaceAuthority:false})));
}
const harmless=new Set(['allow','warn','deny','forbid','doc','must_use','inline','cold','deprecated','non_exhaustive','track_caller','repr']);
const standardDerives=new Set(['Clone','Copy','Debug','Default','PartialEq','Eq','Hash','PartialOrd','Ord']);
function uncertainty(attributes,{moduleAttribute=false}={}) {
  // Built-in #[path = "..."] selects a module file, never arbitrary item
  // expansion. The tracked graph still owns that file and cfg resolution.
  const unknown=attributes.some(attribute=>!harmless.has(attribute.name) && !['cfg','derive','macro_export','macro_use'].includes(attribute.name) && !(attribute.name==='path' && moduleAttribute && attribute.pathLiteral) || attribute.name==='derive' && attribute.tokens.filter(token=>/^[\p{L}_][\p{L}\p{N}_]*$/u.test(token)).slice(1).some(name=>!standardDerives.has(name)));
  return {type:unknown,bang:unknown || attributes.some(attribute=>attribute.name==='macro_use'),attribute:unknown,macro:unknown || attributes.some(attribute=>attribute.name==='macro_use'),conditional:attributes.some(attribute=>['cfg','cfg_attr'].includes(attribute.name))};
}
function nestedExportUncertainty(tokens,start,profile,helperAttributeClosed=()=>false) {
  // A nested macro_export or procedural attribute can introduce a crate-root
  // macro. Inspect original attribute tokens, without resolving body scopes or
  // expanding a macro. Header attributes are handled by the ordinary binder.
  for(let at=start;at<tokens.length;at++) {
    const bracket=at+(tokens[at+1]?.text==='!'?2:1);
    if(tokens[at].type!=='punct'||tokens[at].text!=='#'||tokens[bracket]?.text!=='[')continue;
    const end=close(tokens,bracket),body=tokens.slice(bracket+1,end);
    const original=itemConfiguration(tokens.slice(at,end+1),profile).attributes[0];
    if(isInertConditionalAttribute(original)){at=end;continue;}
    if(helperAttributeClosed({start:tokens[at].start,end:tokens[end].end})){at=end;continue;}
    if(body.some(token=>identifier(token)&&token.text==='macro_export')||uncertainty([{name:body[0]?.text,tokens:body.map(token=>token.text)}]).macro)return {start:tokens[at].start,end:tokens[end].end};
    at=end;
  }
  return null;
}
function parts(tokens) {
  const output=[];let begin=0,angle=0;
  for(let at=0;at<tokens.length;at++) {
    if(['(','[','{'].includes(tokens[at].text)){at=close(tokens,at);continue;}
    if(tokens[at].text==='<')angle++;
    if(tokens[at].text==='>')angle--;
    if(tokens[at].text==='>>')angle-=2;
    if(tokens[at].text===',' && angle===0){output.push(tokens.slice(begin,at));begin=at+1;}
  }
  if(begin<tokens.length)output.push(tokens.slice(begin));return output.filter(part=>part.length);
}
function collapse(candidates) {
  const grouped=new Map();
  for(const candidate of candidates) {
    const slot=`${candidate.namespace}:${candidate.name}`;
    if(!grouped.has(slot))grouped.set(slot,new Map());grouped.get(slot).set(candidate.origin,candidate);
  }
  return [...grouped.values()].map(origins=>{
    const values=[...origins.values()],priority=Math.max(...values.map(value=>value.priority)),top=values.filter(value=>value.priority===priority);
    const identities=new Set(top.map(value=>JSON.stringify([value.status,value.target,value.kind,value.macroKind??null]))),ambiguous=identities.size>1 || priority===2 && top.length>1;
    const first=top.reduce((winner,value)=>value.visibility.kind==='public' || winner.visibility.kind==='restricted' && value.visibility.kind==='restricted' && value.visibility.path.length<winner.visibility.path.length?value:winner),{origin,priority:unused,...binding}=first;
    const macroKinds=new Set(top.map(value=>value.macroKind??'unknown'));
    return {...binding,...(binding.namespace==='macro'?{macroKind:macroKinds.size===1?[...macroKinds][0]:'unknown'}:{}),...(ambiguous?{status:'ambiguous',target:null}:{}),evidence:top.map(value=>({source:value.source,span:value.span,via:value.via}))};
  }).sort((a,b)=>a.namespace===b.namespace?(a.name<b.name?-1:a.name>b.name?1:0):(a.namespace<b.namespace?-1:1));
}

export function resolveModuleBindings({modules,externalModules=new Map(),compilationProfile:profileInput=null,deriveContext=null,deriveBangContext=null,toolContext=null}={}) {
  if(!Array.isArray(modules) || !(externalModules instanceof Map))throw new TypeError('Binding resolution requires tracked modules and explicit external tables');
  if(deriveContext&&!isDeriveFootprintContext(deriveContext))throw new TypeError('Unsealed derive footprint context');
  if(deriveBangContext){if(!isDeriveBangContext(deriveBangContext))throw new TypeError('Unsealed derive bang output context');modules=deriveBangModules(deriveBangContext,{deriveContext,modules,externalModules,compilationProfile:profileInput});}
  if(toolContext&&!isToolAttributeContext(toolContext))throw new TypeError('Unsealed tool attribute context');
  const profile=compilationProfile(profileInput);
  const scopes=new Map(),containers=new Map(),tasks=[],macroUses=[],diagnostics=[];
  const diagnostic=(scope,message,span,extra={})=>{const value={kind:'module-binding',message,source:scope.file,module:[...scope.path],span,...extra};diagnostics.push(value);return value;};
  for(const module of modules) {
    if(!Array.isArray(module.path) || typeof module.source!=='string' || typeof module.file!=='string')throw new TypeError('Module binding evidence is incomplete');
    if(module.compilationProfile!==undefined&&JSON.stringify(compilationProfile(module.compilationProfile))!==JSON.stringify(profile))throw new TypeError('Module graph and binding compilation profiles must agree');
    const name=key(canonical(module.path));if(scopes.has(name))throw new TypeError('Duplicate tracked module scope');
    const scope={file:module.file,path:[...module.path],seeds:[],bindings:[],deriveNames:[],innerBuiltinNames:[],unknownType:false,unknownMacro:false,unknownBang:false,unknownAttribute:false,baseType:false,baseMacro:false,baseBang:false,baseAttribute:false};
    scopes.set(name,scope);containers.set(name,scope);
  }
  const add=(scope,item,name,namespace,visibility,extra={})=>scope.seeds.push({name,namespace,target:[...canonical(scope.path),name],kind:item.term,status:'resolved',visibility,source:scope.file,span:{start:item.start,end:item.end},declaration:{source:extra.source??scope.file,span:{start:item.start,end:item.end}},via:'declaration',origin:`${extra.source??scope.file}:${item.start}:${namespace}:${name}`,priority:2,...extra});
  for(const module of modules) {
    const scope=scopes.get(key(canonical(module.path)));
    let items;
    try {items=Object.hasOwn(module,'sourceView')?originalSourceModuleItems(module):module.items??sourceItems(module.source);} catch(error){scope.baseType=scope.baseMacro=scope.baseBang=scope.baseAttribute=true;diagnostic(scope,error.message,{start:0,end:module.source.length});continue;}
    const innerConditions=(Object.hasOwn(module,'sourceView')?items:module.allItems??items).filter(item=>tokensOf(item)[0]?.text==='#'&&tokensOf(item)[1]?.text==='!').map(item=>itemConfiguration(tokensOf(item),profile));
    const configured=module.configurationCondition??(innerConditions.some(item=>item.status==='inactive')?'inactive':innerConditions.some(item=>item.status==='unknown')?'unknown':'active');
    scope.configurationCondition=module.sourceView?.configurationCondition==='inactive'?'inactive':module.sourceView?.configurationCondition==='unknown'&&configured!=='inactive'?'unknown':configured;
    if(scope.configurationCondition!=='active'){
      if(scope.configurationCondition==='inactive')continue;
      scope.baseType=scope.baseMacro=scope.baseBang=scope.baseAttribute=true;
      const root=scopes.get('crate');if(root)root.baseMacro=root.baseBang=true;
      diagnostic(scope,'inner module compilation condition remains unknown; possible exported macros retain crate uncertainty',{start:0,end:module.source.length});
    }
    for(const item of items.filter(item=>!item.comment)) {
      const condition=itemConfiguration(tokensOf(item),profile);if(condition.status==='inactive')continue;
      const span={start:item.start,end:item.end};
      if(tokensOf(item)[1]?.text==='!'&&condition.status==='active'&&condition.attributes.every(attribute=>attribute.name==='cfg'||isInertConditionalAttribute(attribute)))continue;
      const innerLint=inertInnerLintItem(item,module.source,module.sourceView,profile);
      if(innerLint){scope.innerBuiltinNames.push(...innerLint.attributes.map(attribute=>({name:attribute.name,span:attribute.span})));continue;}
      const innerBuiltin=builtinInnerSourceItem(item,module.source,module.sourceView,profile);
      if(innerBuiltin){scope.innerBuiltinNames.push({name:innerBuiltin.name,span:innerBuiltin.span});continue;}
      try {
        const tokens=tokensOf(item),head=header(tokens,scope.path),moduleAttribute=tokens[head.at]?.text==='mod';
        const nestedExport=nestedExportUncertainty(tokens,head.at,profile,span=>deriveContext&&deriveFootprintHelperAttributeAt(deriveContext,module,item,span)||deriveBangContext&&deriveBangHelperAttributeAt(deriveBangContext,deriveContext,module,item,span));
        if(nestedExport){scope.baseMacro=scope.baseBang=true;diagnostic(scope,'nested source attribute can introduce crate-root exported macros; expansion remains unresolved',nestedExport);}
        const macroUse=moduleAttribute&&head.attributes.some(attribute=>attribute.name==='macro_use'&&attribute.tokens.length===1)&&condition.status==='active'&&scope.configurationCondition==='active';
        const effectiveAttributes=head.attributes.filter(attribute=>!isInertConditionalAttribute(condition.attributes.find(original=>original.span.start===attribute.span.start))&&!(attribute.name==='cfg'&&condition.attributes.find(original=>original.span.start===attribute.span.start)?.evaluation?.value===true)&&!(macroUse&&attribute.name==='macro_use'&&attribute.tokens.length===1)&&!(toolContext&&toolAttributeAt(toolContext,module,item,attribute))),uncertain=uncertainty(effectiveAttributes,{moduleAttribute});
        const deriveCertificate=deriveContext&&['struct','enum'].includes(item.term)?deriveFootprintAt(deriveContext,module,item):null;
        if(deriveCertificate) {
          // Only the original invocation is narrowed. The sealed expansion
          // profile does not prove its bang closure or generated trait bodies.
          uncertain.type &&= !deriveCertificate.dimensions.typeNamespaceComplete;
          uncertain.attribute &&= !deriveCertificate.dimensions.attributeMacroComplete;
          uncertain.bang &&= !deriveCertificate.dimensions.bangMacroComplete;
          // Bang closure is per exact original invocation and joins every
          // actual owner; sibling/ancestor uncertainty still accumulates below.
          const bangOutput=deriveBangContext&&deriveBangOutputAt(deriveBangContext,deriveContext,module,item);
          if(bangOutput){
            uncertain.bang &&= !bangOutput.dimensions.bangMacroComplete;
            if(uncertain.type)try{
              const effect=proveDeriveEmptyEnclosingEffect(deriveBangContext,deriveContext,module,item),facts=deriveEmptyEnclosingEffectFacts(effect,deriveBangContext,deriveContext,module,item);
              // Only this exact invocation contributes an empty enclosing name
              // effect. Other items/imports/cfg alternatives still accumulate.
              if(facts.enclosingTypeBindings.length===0&&facts.enclosingUsableValueBindings.length===0)uncertain.type=false;
            }catch(error){if(!(error instanceof TypeError))throw error;}
          }
          uncertain.macro=uncertain.bang||uncertain.attribute;
        }
        uncertain.conditional ||= scope.configurationCondition==='unknown';
        for(const attribute of head.attributes.filter(attribute=>attribute.name==='derive'))for(const name of attribute.tokens.filter(token=>standardDerives.has(token)))scope.deriveNames.push({name,span:attribute.span});
        scope.baseType ||= uncertain.type;scope.baseMacro ||= uncertain.macro;scope.baseBang ||= uncertain.bang;scope.baseAttribute ||= uncertain.attribute;
        if(uncertain.type || uncertain.macro || uncertain.conditional)diagnostic(scope,'attribute scope requires compilation-condition or procedural expansion evidence',span);
        // An exact self alias binds the actual crate in the type namespace.
        // Real external dependency identities are never inferred here.
        // https://doc.rust-lang.org/reference/items/extern-crates.html
        if(tokens[head.at]?.text==='extern'&&tokens[head.at+1]?.text==='crate'){
          const reference=tokens[head.at+2],hasAlias=tokens[head.at+3]?.text==='as',alias=hasAlias?tokens[head.at+4]:reference,end=head.at+(hasAlias?5:3);
          if(!identifier(reference)||!identifier(alias)||tokens[end]?.text!==';'||end+1!==tokens.length||['crate','self','super','Self'].includes(alias.text)||reference.text==='self'&&(!hasAlias||reference.rawIdentifier))throw new Error('extern crate declaration requires an exact source crate reference and alias');
          const own=reference.text==='self'&&!reference.rawIdentifier;
          if(own&&!scopes.has('crate'))throw new Error('self crate alias requires an actual tracked crate root');
          if(alias.text!=='_')add(scope,{...item,term:'mod'},alias.text,'type',head.visibility,{target:own&&!uncertain.type&&!uncertain.conditional?['crate']:null,status:own&&!uncertain.type&&!uncertain.conditional?'resolved':'unresolved',externCrateBinding:true,externCrateSelf:own,externPrelude:scope.path.length===0});
          if(!own)diagnostic(scope,'external crate dependency identity remains unresolved',span,{name:alias.text,dependency:reference.text});
          continue;
        }
        if(item.term==='use') {for(const [index,leaf] of leaves(tokens,head.at+1).entries())tasks.push({...leaf,scope,visibility:head.visibility,span,id:`${module.file}:${item.start}:${index}`,conditional:uncertain.type || uncertain.conditional});continue;}
        let keyword=head.at;
        while(!tokens[keyword]?.rawIdentifier) {
          if(['async','unsafe','default'].includes(tokens[keyword]?.text)){keyword++;continue;}
          if(tokens[keyword]?.text==='const' && !tokens[keyword+1]?.rawIdentifier && ['fn','unsafe','extern','async'].includes(tokens[keyword+1]?.text)){keyword++;continue;}
          if(tokens[keyword]?.text==='extern' && tokens[keyword+1]?.type==='string'){keyword+=2;continue;}
          break;
        }
        if(!['fn','struct','union','enum','trait','type','mod','const','static','macro_rules!','macro'].includes(tokens[keyword]?.text) || item.term==='impl') {
          if(item.term!=='impl'){scope.baseType=scope.baseMacro=scope.baseBang=scope.baseAttribute=true;diagnostic(scope,'item can introduce bindings only after source expansion or foreign declaration resolution',span);}continue;
        }
        const term=tokens[keyword].text,nameToken=tokens[keyword+(term==='static' && tokens[keyword+1]?.text==='mut'?2:1)],name=identifier(nameToken)?nameToken.text:null;
        if(!name){scope.baseType=scope.baseMacro=scope.baseBang=scope.baseAttribute=true;diagnostic(scope,'declaration name requires further lexical resolution',span);continue;}
        const declaration={...item,term},extra=uncertain.type || uncertain.conditional?{status:'unresolved',target:null}:{};
        if(term==='fn' && item.term==='const') {
          // The pinned item partitioner treats const unsafe/extern functions as
          // semicolon declarations. Never certify a swallowed following item.
          let body=-1,angle=0;
          for(let at=keyword+2;at<tokens.length;at++) {
            if(tokens[at].text==='<')angle++;
            if(tokens[at].text==='>')angle--;
            if(tokens[at].text==='>>')angle-=2;
            if(tokens[at].text==='{' && angle===0){body=close(tokens,at);break;}
            if(['(','[','{'].includes(tokens[at].text))at=close(tokens,at);
          }
          if(body<0 || tokens.slice(body+1).some(token=>token.text!==';')) {scope.baseType=scope.baseMacro=scope.baseBang=scope.baseAttribute=true;diagnostic(scope,'source item partition may contain further declarations after a qualified function',span);}
        }
        if(['struct','union','enum','trait','type','mod'].includes(term))add(scope,declaration,name,'type',head.visibility,extra);
        if(['fn','const','static'].includes(term))add(scope,declaration,name,'value',head.visibility,extra);
        if(term==='mod') {
          const target=key([...canonical(scope.path),name]);
          if(!scopes.has(target)){scope.baseMacro=scope.baseBang=true;diagnostic(scope,'module target has no unconditional tracked body; exported macro names remain unresolved',span);} else if(macroUse)macroUses.push({scope,target,span,visibility:head.visibility});
        }
        if(term==='struct') {
          let at=keyword+2;
          if(tokens[at]?.text==='<') {
            let depth=0;
            do {if(tokens[at]?.text==='<')depth++;if(tokens[at]?.text==='>')depth--;if(tokens[at]?.text==='>>')depth-=2;at++;if(at>=tokens.length)throw new Error('generic struct namespace is unresolved');}while(depth>0);
          }
          if(tokens[at]?.text==='(') {
            let visibility=head.visibility;
            for(const field of parts(tokens.slice(at+1,close(tokens,at)))) {
              const fieldHead=header(field,scope.path);
              if(fieldHead.visibility.kind==='restricted' && (visibility.kind==='public' || fieldHead.visibility.path.length>visibility.path.length))visibility=fieldHead.visibility;
            }
            add(scope,declaration,name,'value',visibility,extra);
          } else if(tokens[at]?.text===';')add(scope,declaration,name,'value',head.visibility,extra);
        }
        if(term==='enum') {
          if(tokens[keyword+2]?.text==='<')throw new Error('generic enum variant namespace requires a checked declaration plan');
          const open=tokens.findIndex((token,index)=>index>keyword && token.text==='{');
          if(open<0)throw new Error('enum namespace has no body');
          const enumScope={file:scope.file,path:[...scope.path,name],seeds:[],bindings:[],unknownType:uncertain.type,unknownMacro:uncertain.macro,unknownBang:uncertain.bang,unknownAttribute:uncertain.attribute,baseType:uncertain.type,baseMacro:uncertain.macro,baseBang:uncertain.bang,baseAttribute:uncertain.attribute};
          containers.set(key(canonical(enumScope.path)),enumScope);
          for(const variant of parts(tokens.slice(open+1,close(tokens,open)))) {
            const variantHead=header(variant,scope.path),token=variant[variantHead.at];
            if(!identifier(token))throw new Error('enum variant namespace needs source expansion');
            const variantUncertain=uncertainty(variantHead.attributes),variantItem={...item,term:'variant',start:token.start,end:variant.at(-1).end},variantExtra=uncertain.type || uncertain.conditional || variantUncertain.type || variantUncertain.conditional?{status:'unresolved',target:null}:{};
            enumScope.baseType ||= variantUncertain.type;enumScope.baseMacro ||= variantUncertain.macro;enumScope.baseBang ||= variantUncertain.bang;enumScope.baseAttribute ||= variantUncertain.attribute;
            add(enumScope,variantItem,token.text,'type',head.visibility,variantExtra);
            if(variant[variantHead.at+1]?.text!=='{')add(enumScope,variantItem,token.text,'value',head.visibility,variantExtra);
          }
          enumScope.bindings=collapse(enumScope.seeds);enumScope.unknownType=enumScope.baseType;enumScope.unknownMacro=enumScope.baseMacro;enumScope.unknownBang=enumScope.baseBang;enumScope.unknownAttribute=enumScope.baseAttribute;
        }
        if(['macro_rules!','macro'].includes(term)) {
          const exported=head.attributes.some(attribute=>attribute.name==='macro_export');
          if(exported) {const root=scopes.get('crate');if(!root)throw new Error('macro export requires a tracked crate root');add(root,declaration,name,'macro',{kind:'public'},{target:['crate',name],...extra,macroKind:'bang',source:scope.file,origin:`${scope.file}:${item.start}:macro:${name}`});}
          if(!exported || scope.path.length)add(scope,declaration,name,'macro',head.visibility,term==='macro_rules!'?{status:'unresolved',target:null,kind:'textual-macro',macroKind:'bang'}:{...extra,macroKind:'bang'});
        }
      } catch(error) {scope.baseType=scope.baseMacro=scope.baseBang=scope.baseAttribute=true;diagnostic(scope,error.message,span);}
    }
    scope.bindings=collapse(scope.seeds);
  }
  // Rust 2018 root extern aliases enter every module's extern prelude.
  // Local declarations and imports retain higher namespace priority.
  const externPrelude=collapse((scopes.get('crate')?.seeds??[]).filter(binding=>binding.externCrateBinding));
  for(const scope of scopes.values())if(scope.path.length)for(const binding of externPrelude)scope.seeds.push({...binding,priority:0,via:'extern-prelude',origin:`extern-prelude:${binding.name}`});
  // #[macro_use] extends the child's textual macro scope after its module
  // declaration. Only original declared/imported textual names are exposed;
  // their expansions remain unresolved, and child uncertainty propagates.
  const inheritedTextual=new Map();
  const textual=(name,active=new Set())=>{
    if(inheritedTextual.has(name))return inheritedTextual.get(name);
    if(active.has(name))return [];active.add(name);
    const child=scopes.get(name),values=(child?.seeds??[]).filter(binding=>binding.namespace==='macro'&&binding.kind==='textual-macro');
    for(const use of macroUses.filter(use=>key(canonical(use.scope.path))===name))for(const binding of textual(use.target,active))values.push({...binding,source:use.scope.file,span:use.span,via:'macro-use-import',visibility:{kind:'restricted',path:use.scope.path},textualScope:{source:use.scope.file,visibleAfter:use.span.end},origin:`${use.scope.file}:${use.span.start}:macro-use:${binding.name}`,priority:2});
    values.sort((left,right)=>left.span.start-right.span.start);
    active.delete(name);inheritedTextual.set(name,values);return values;
  };
  for(const use of macroUses)for(const binding of textual(use.target))use.scope.seeds.push({...binding,source:use.scope.file,span:use.span,via:'macro-use-import',visibility:{kind:'restricted',path:use.scope.path},textualScope:{source:use.scope.file,visibleAfter:use.span.end},origin:`${use.scope.file}:${use.span.start}:macro-use:${binding.name}`,priority:2});
  for(const scope of scopes.values())scope.bindings=collapse(scope.seeds);
  for(const [path,table] of externalModules) {
    if(typeof path!=='string' || path.split('::')[0]==='crate' || !Array.isArray(table.bindings) || typeof table.complete!=='boolean' || table.kind!==undefined && !['mod','enum','trait'].includes(table.kind))throw new TypeError('External module tables require an explicit completeness assertion and source container kind');
    const bindings=table.bindings.map(binding=>{
      if(binding.namespace==='macro'&&binding.macroKind!==undefined&&!['bang','derive','attribute','unknown'].includes(binding.macroKind))throw new TypeError('External macro binding kind is unproved');
      if(!namespaces.includes(binding.namespace) || typeof binding.name!=='string' || !Array.isArray(binding.target) || !binding.target.length || binding.target.some(part=>typeof part!=='string'))throw new TypeError('External bindings require canonical targets and namespaces');
      return {...structuredClone(binding),status:'resolved',visibility:{kind:'public'},source:binding.source??'registered-external-table',span:binding.span??null};
    });
    if(new Set(bindings.map(binding=>`${binding.namespace}:${binding.name}`)).size!==bindings.length)throw new TypeError('External table namespaces contain duplicate bindings');
    containers.set(path,{file:null,path:path.split('::'),bindings,kind:table.kind??'mod',baseType:!table.complete,baseMacro:!table.complete,baseBang:!table.complete,baseAttribute:!table.complete,unknownType:!table.complete,unknownMacro:!table.complete,unknownBang:!table.complete,unknownAttribute:!table.complete,external:true});
  }
  const lookup=(task)=>{
    const requester=task.scope.path,segments=task.segments;
    if(!task.glob && !task.validateOnly && !task.alias && segments.every(segment=>['crate','self','super'].includes(segment)))return {error:'crate, self and super module imports require an explicit alias'};
    let owner,at=0;
    if(!task.externalOnly && ['crate','self','super'].includes(segments[0])) {
      const path=qualified(segments,requester);if(!path)return {error:'use path escapes the crate root'};
      owner=containers.get('crate');at=segments.length-path.length;
      // Resolve the normalized absolute path rather than preserving qualifiers.
      return selfChecked(task,walk(owner,path,0,requester));
    }
    owner=task.externalOnly?null:scopes.get(key(canonical(requester)));
    const local=owner?.bindings.filter(binding=>binding.name===segments[0] && binding.namespace==='type');
    if(task.externalOnly || !local?.length) {
      const alias=externPrelude.find(binding=>binding.name===segments[0]);
      if(alias){if(alias.status!=='resolved')return {error:'extern prelude crate alias identity remains unresolved'};return selfChecked(task,walk(containers.get(key(alias.target)),segments,1,requester));}
      let match;
      for(let length=segments.length;length>0;length--)if(externalModules.has(key(segments.slice(0,length)))){match=length;break;}
      if(match){owner=containers.get(key(segments.slice(0,match)));at=match;if(at===segments.length)return {bindings:[{name:segments.at(-1),namespace:'type',target:segments,kind:owner.kind,status:'resolved',visibility:{kind:'public'},source:'registered-external-table',span:null}],container:owner};}
      else if(task.externalOnly)return {error:'absolute extern path has no registered module evidence'};
    }
    return selfChecked(task,walk(owner,segments,at,requester));
  };
  function selfChecked(task,result) {
    if(task.self && !result.error && !result.bindings?.some(binding=>binding.namespace==='type' && ['mod','enum','trait'].includes(binding.kind)))return {error:'self use binding requires an actual module, enum or trait namespace'};
    return result;
  }
  function walk(owner,segments,at,requester) {
    if(!owner)return {error:'use target has no tracked or registered module evidence'};
    if(at===segments.length)return {bindings:[{name:owner.path.at(-1)??'crate',namespace:'type',target:owner.external?owner.path:canonical(owner.path),kind:owner.kind??'mod',status:'resolved',visibility:{kind:'public'},source:owner.file,span:null}],container:owner};
    for(;at<segments.length;at++) {
      const all=owner.bindings.filter(binding=>binding.name===segments[at] && visible(binding.visibility,requester));
      if(at===segments.length-1) {
        const type=all.find(binding=>binding.namespace==='type' && binding.status==='resolved');
        return all.length?{bindings:all,container:type?containers.get(key(type.target)):null}:{error:'use target is absent or inaccessible in its actual namespace'};
      }
      const type=all.find(binding=>binding.namespace==='type');
      if(!type || type.status!=='resolved' || !['mod','enum'].includes(type.kind))return {error:'use parent is unresolved, ambiguous or has no importable module/enum namespace'};
      owner=containers.get(key(type.target));if(!owner)return {error:'use parent has no unconditional tracked or registered body'};
    }
  }
  let previous='',converged=false;
  const roundLimit=Math.max(16,tasks.length+modules.length+4),globEdges=new Map();
  for(let round=0;round<roundLimit;round++) {
    const next=new Map([...scopes].map(([name,scope])=>{
      const shadowed=scope.deriveNames.some(derive=>scope.bindings.some(binding=>macroBindingAffects(binding,'attribute') && binding.name===derive.name && binding.standardDerive!==true));
      return [name,{candidates:[...scope.seeds],type:scope.baseType || shadowed,bang:scope.baseBang || shadowed,attribute:scope.baseAttribute || shadowed}];
    }));globEdges.clear();
    // An unknown child expansion can emit #[macro_export], which binds at
    // the crate root. Keep that uncertainty even for a non-macro_use child.
    if(next.has('crate'))next.get('crate').bang ||= [...scopes.values()].some(scope=>scope.path.length&&scope.unknownMacro);
    for(const use of macroUses){const state=next.get(key(canonical(use.scope.path))),child=scopes.get(use.target);state.bang ||= !child||child.unknownMacro||child.configurationCondition!=='active';}
    for(const task of tasks) {
      const state=next.get(key(canonical(task.scope.path))),result=lookup(task),prefix={source:task.scope.file,span:task.span,visibility:task.visibility,via:task.glob?'glob-import':'named-import',priority:task.glob?1:2};
      if(task.validateOnly)continue;
      if(task.glob) {
        const target=result.container;
        if(result.error || !target || task.conditional || target===task.scope) {state.type=state.bang=state.attribute=true;continue;}
        state.type ||= target.unknownType;state.bang ||= target.unknownBang;state.attribute ||= target.unknownAttribute;
        if(!target.external) {const name=key(canonical(task.scope.path));if(!globEdges.has(name))globEdges.set(name,new Set());globEdges.get(name).add(key(canonical(target.path)));}
        for(const binding of target.bindings.filter(binding=>visible(binding.visibility,task.scope.path))) {
          state.candidates.push({...binding,...prefix,status:narrower(task.visibility,binding.visibility)?binding.status:'unresolved',target:narrower(task.visibility,binding.visibility)?binding.target:null,origin:`${task.id}:${binding.namespace}:${binding.name}`});
        }
      } else if(task.name!=='_' && !task.validateOnly) {
        const bindings=!task.conditional && !result.error?result.bindings?.filter(binding=>!task.self || binding.namespace==='type'):null;
        for(const namespace of bindings?.length?new Set(bindings.map(binding=>binding.namespace)):namespaces) {
          const binding=bindings?.find(binding=>binding.namespace===namespace),resolved=binding && narrower(task.visibility,binding.visibility);
          state.candidates.push({...binding,...prefix,name:task.name,namespace,target:resolved?binding.target:null,status:resolved?binding.status:'unresolved',kind:binding?.kind??'unknown',origin:`${task.id}:${namespace}`});
        }
      }
    }
    for(const [name,state] of next) {const scope=scopes.get(name);scope.bindings=collapse(state.candidates);scope.unknownType=state.type;scope.unknownBang=state.bang;scope.unknownAttribute=state.attribute;scope.unknownMacro=state.bang||state.attribute;}
    const current=JSON.stringify([...scopes].map(([name,scope])=>[name,scope.bindings,scope.unknownType,scope.unknownMacro,scope.unknownBang,scope.unknownAttribute]));
    if(current===previous){converged=true;break;}previous=current;
  }
  const cyclic=new Set(),active=[],visited=new Set();
  function cycle(name) {
    const index=active.indexOf(name);if(index>=0){active.slice(index).forEach(name=>cyclic.add(name));return;}
    if(visited.has(name))return;active.push(name);for(const target of globEdges.get(name)??[])cycle(target);active.pop();visited.add(name);
  }
  for(const name of scopes.keys())cycle(name);
  let changed=true;
  while(changed){changed=false;for(const [name,targets] of globEdges)if(!cyclic.has(name) && [...targets].some(target=>cyclic.has(target))){cyclic.add(name);changed=true;}}
  for(const [name,scope] of scopes) {
    if(!converged || cyclic.has(name)){scope.unknownType=scope.unknownMacro=scope.unknownBang=scope.unknownAttribute=true;diagnostic(scope,!converged?'binding fixed point did not converge':'glob import cycle requires further resolution',{start:0,end:modules.find(module=>key(canonical(module.path))===name).source.length});}
    for(const binding of scope.bindings.filter(binding=>binding.status==='ambiguous'))diagnostic(scope,`ambiguous ${binding.namespace} binding ${binding.name}`,binding.span,{name:binding.name,namespace:binding.namespace});
    for(const derive of scope.deriveNames)if(scope.bindings.some(binding=>macroBindingAffects(binding,'attribute') && binding.name===derive.name && binding.standardDerive!==true))diagnostic(scope,'derive binding requires resolved standard attribute macro provenance',derive.span,{name:derive.name});
    for(const attribute of scope.innerBuiltinNames??[])if(scope.bindings.some(binding=>macroBindingAffects(binding,'attribute')&&binding.name===attribute.name)){
      scope.unknownType=scope.unknownMacro=scope.unknownBang=scope.unknownAttribute=true;
      diagnostic(scope,'inner builtin lint attribute has a conflicting source macro owner',attribute.span,{name:attribute.name});
    }
  }
  for(const task of tasks) {
    const result=lookup(task);
    if(result.error || task.conditional || !task.glob && result.bindings?.some(binding=>binding.status!=='resolved') || task.glob && (!result.container || result.container===task.scope || result.container.unknownType || result.container.unknownMacro))diagnostic(task.scope,result.error??'use scope completeness, target or compilation condition remains unresolved',task.span,{name:task.name??null,glob:!!task.glob});
    if(!task.glob && result.bindings?.some(binding=>!narrower(task.visibility,binding.visibility)))diagnostic(task.scope,'reexport visibility exceeds the checked target visibility',task.span,{name:task.name});
  }
  const result=frozen(structuredClone({version:1,compilationProfile:profile,editionProfile:'2018+',externPrelude,scopes:[...scopes.values()].map(scope=>({file:scope.file,path:scope.path,compilationProfile:profile,configurationCondition:scope.configurationCondition,bindings:scope.bindings,unresolvedImports:diagnostics.filter(diagnostic=>diagnostic.source===scope.file && key(diagnostic.module)===key(scope.path)),unresolvedTypeScope:scope.unknownType,unresolvedMacroScope:scope.unknownMacro,unresolvedBangMacroScope:scope.unknownBang,unresolvedAttributeMacroScope:scope.unknownAttribute})),diagnostics}));
  resolvedSourceScopeSets.add(result.scopes);
  resolvedSourceScopeOrigins.set(result.scopes,frozen({compilationProfile:profile,modules:modules.map(module=>({file:module.file,path:[...module.path],source:module.source,hasSourceView:Object.hasOwn(module,'sourceView'),sourceView:module.sourceView,hasCompilationProfile:Object.hasOwn(module,'compilationProfile'),moduleCompilationProfile:compilationProfile(module.compilationProfile),hasConfigurationCondition:Object.hasOwn(module,'configurationCondition'),configurationCondition:module.configurationCondition}))}));
  return result;
}
