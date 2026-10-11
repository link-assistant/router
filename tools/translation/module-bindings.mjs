// Rust 2018+ binding evidence, not body translation or macro expansion.
// https://doc.rust-lang.org/reference/items/use-declarations.html
// https://doc.rust-lang.org/reference/visibility-and-privacy.html
// https://doc.rust-lang.org/reference/names/namespaces.html
import {sourceItems} from './rust-structure.mjs';
const namespaces=['type','value','macro'];
const identifier=token=>token?.type==='ident' && /^[\p{L}_][\p{L}\p{N}_]*$/u.test(token.text);
const key=path=>path.join('::');
const canonical=path=>['crate',...path];
const descendant=(path,ancestor)=>ancestor.every((name,index)=>path[index]===name);
const visible=(visibility,path)=>visibility.kind==='public' || descendant(path,visibility.path);
const narrower=(requested,original)=>original.kind==='public' || requested.kind==='restricted' && descendant(requested.path,original.path);
const frozen=value=>{if(value && typeof value==='object'){for(const child of Object.values(value))frozen(child);Object.freeze(value);}return value;};
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
    attributes.push({name:body[0]?.text,tokens:body.map(token=>token.text),span:{start:tokens[begin].start,end:tokens[end].end}});at=end+1;
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
const harmless=new Set(['allow','warn','deny','forbid','doc','must_use','inline','cold','deprecated','non_exhaustive','track_caller','repr']);
const standardDerives=new Set(['Clone','Copy','Debug','Default','PartialEq','Eq','Hash','PartialOrd','Ord']);
function uncertainty(attributes) {
  const unknown=attributes.some(attribute=>!harmless.has(attribute.name) && !['cfg','derive','macro_export','macro_use'].includes(attribute.name) || attribute.name==='derive' && attribute.tokens.filter(token=>/^[\p{L}_][\p{L}\p{N}_]*$/u.test(token)).slice(1).some(name=>!standardDerives.has(name)));
  return {type:unknown,macro:unknown || attributes.some(attribute=>attribute.name==='macro_use'),conditional:attributes.some(attribute=>['cfg','cfg_attr'].includes(attribute.name))};
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
    const identities=new Set(top.map(value=>JSON.stringify([value.status,value.target,value.kind]))),ambiguous=identities.size>1 || priority===2 && top.length>1;
    const first=top.reduce((winner,value)=>value.visibility.kind==='public' || winner.visibility.kind==='restricted' && value.visibility.kind==='restricted' && value.visibility.path.length<winner.visibility.path.length?value:winner),{origin,priority:unused,...binding}=first;
    return {...binding,...(ambiguous?{status:'ambiguous',target:null}:{}),evidence:top.map(value=>({source:value.source,span:value.span,via:value.via}))};
  }).sort((a,b)=>a.namespace===b.namespace?(a.name<b.name?-1:a.name>b.name?1:0):(a.namespace<b.namespace?-1:1));
}

export function resolveModuleBindings({modules,externalModules=new Map()}={}) {
  if(!Array.isArray(modules) || !(externalModules instanceof Map))throw new TypeError('Binding resolution requires tracked modules and explicit external tables');
  const scopes=new Map(),containers=new Map(),tasks=[],diagnostics=[];
  const diagnostic=(scope,message,span,extra={})=>{const value={kind:'module-binding',message,source:scope.file,module:[...scope.path],span,...extra};diagnostics.push(value);return value;};
  for(const module of modules) {
    if(!Array.isArray(module.path) || typeof module.source!=='string' || typeof module.file!=='string')throw new TypeError('Module binding evidence is incomplete');
    const name=key(canonical(module.path));if(scopes.has(name))throw new TypeError('Duplicate tracked module scope');
    const scope={file:module.file,path:[...module.path],seeds:[],bindings:[],unknownType:false,unknownMacro:false,baseType:false,baseMacro:false};
    scopes.set(name,scope);containers.set(name,scope);
  }
  const add=(scope,item,name,namespace,visibility,extra={})=>scope.seeds.push({name,namespace,target:[...canonical(scope.path),name],kind:item.term,status:'resolved',visibility,source:scope.file,span:{start:item.start,end:item.end},declaration:{source:extra.source??scope.file,span:{start:item.start,end:item.end}},via:'declaration',origin:`${extra.source??scope.file}:${item.start}:${namespace}:${name}`,priority:2,...extra});
  for(const module of modules) {
    const scope=scopes.get(key(canonical(module.path)));
    let items;
    try {items=module.items??sourceItems(module.source);} catch(error){scope.baseType=scope.baseMacro=true;diagnostic(scope,error.message,{start:0,end:module.source.length});continue;}
    for(const item of items.filter(item=>!item.comment)) {
      const span={start:item.start,end:item.end};
      try {
        const tokens=tokensOf(item),head=header(tokens,scope.path),uncertain=uncertainty(head.attributes);
        scope.baseType ||= uncertain.type;scope.baseMacro ||= uncertain.macro;
        if(uncertain.type || uncertain.macro || uncertain.conditional)diagnostic(scope,'attribute scope requires compilation-condition or procedural expansion evidence',span);
        if(item.term==='use') {for(const [index,leaf] of leaves(tokens,head.at+1).entries())tasks.push({...leaf,scope,visibility:head.visibility,span,id:`${module.file}:${item.start}:${index}`,conditional:uncertain.type || uncertain.conditional});continue;}
        let keyword=head.at;
        while(!tokens[keyword]?.rawIdentifier) {
          if(['async','unsafe','default'].includes(tokens[keyword]?.text)){keyword++;continue;}
          if(tokens[keyword]?.text==='const' && !tokens[keyword+1]?.rawIdentifier && ['fn','unsafe','extern','async'].includes(tokens[keyword+1]?.text)){keyword++;continue;}
          if(tokens[keyword]?.text==='extern' && tokens[keyword+1]?.type==='string'){keyword+=2;continue;}
          break;
        }
        if(!['fn','struct','union','enum','trait','type','mod','const','static','macro_rules!','macro'].includes(tokens[keyword]?.text) || item.term==='impl') {
          if(item.term!=='impl'){scope.baseType=scope.baseMacro=true;diagnostic(scope,'item can introduce bindings only after source expansion or foreign declaration resolution',span);}continue;
        }
        const term=tokens[keyword].text,nameToken=tokens[keyword+(term==='static' && tokens[keyword+1]?.text==='mut'?2:1)],name=identifier(nameToken)?nameToken.text:null;
        if(!name){scope.baseType=scope.baseMacro=true;diagnostic(scope,'declaration name requires further lexical resolution',span);continue;}
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
          if(body<0 || tokens.slice(body+1).some(token=>token.text!==';')) {scope.baseType=scope.baseMacro=true;diagnostic(scope,'source item partition may contain further declarations after a qualified function',span);}
        }
        if(['struct','union','enum','trait','type','mod'].includes(term))add(scope,declaration,name,'type',head.visibility,extra);
        if(['fn','const','static'].includes(term))add(scope,declaration,name,'value',head.visibility,extra);
        if(term==='mod') {
          const target=key([...canonical(scope.path),name]);
          if(!scopes.has(target)){scope.baseMacro=true;diagnostic(scope,'module target has no unconditional tracked body; exported macro names remain unresolved',span);}
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
          const enumScope={file:scope.file,path:[...scope.path,name],seeds:[],bindings:[],unknownType:uncertain.type,unknownMacro:uncertain.macro,baseType:uncertain.type,baseMacro:uncertain.macro};
          containers.set(key(canonical(enumScope.path)),enumScope);
          for(const variant of parts(tokens.slice(open+1,close(tokens,open)))) {
            const variantHead=header(variant,scope.path),token=variant[variantHead.at];
            if(!identifier(token))throw new Error('enum variant namespace needs source expansion');
            const variantUncertain=uncertainty(variantHead.attributes),variantItem={...item,term:'variant',start:token.start,end:variant.at(-1).end},variantExtra=uncertain.type || uncertain.conditional || variantUncertain.type || variantUncertain.conditional?{status:'unresolved',target:null}:{};
            enumScope.baseType ||= variantUncertain.type;enumScope.baseMacro ||= variantUncertain.macro;
            add(enumScope,variantItem,token.text,'type',head.visibility,variantExtra);
            if(variant[variantHead.at+1]?.text!=='{')add(enumScope,variantItem,token.text,'value',head.visibility,variantExtra);
          }
          enumScope.bindings=collapse(enumScope.seeds);enumScope.unknownType=enumScope.baseType;enumScope.unknownMacro=enumScope.baseMacro;
        }
        if(['macro_rules!','macro'].includes(term)) {
          const exported=head.attributes.some(attribute=>attribute.name==='macro_export');
          if(exported) {const root=scopes.get('crate');if(!root)throw new Error('macro export requires a tracked crate root');add(root,declaration,name,'macro',{kind:'public'},{target:['crate',name],...extra,source:scope.file,origin:`${scope.file}:${item.start}:macro:${name}`});}
          if(!exported || scope.path.length)add(scope,declaration,name,'macro',head.visibility,term==='macro_rules!'?{status:'unresolved',target:null,kind:'textual-macro'}:extra);
        }
      } catch(error) {scope.baseType=scope.baseMacro=true;diagnostic(scope,error.message,span);}
    }
    scope.bindings=collapse(scope.seeds);
  }
  for(const [path,table] of externalModules) {
    if(typeof path!=='string' || path.split('::')[0]==='crate' || !Array.isArray(table.bindings) || typeof table.complete!=='boolean')throw new TypeError('External module tables require an explicit completeness assertion');
    const bindings=table.bindings.map(binding=>{
      if(!namespaces.includes(binding.namespace) || typeof binding.name!=='string' || !Array.isArray(binding.target) || !binding.target.length || binding.target.some(part=>typeof part!=='string'))throw new TypeError('External bindings require canonical targets and namespaces');
      return {...structuredClone(binding),status:'resolved',visibility:{kind:'public'},source:binding.source??'registered-external-table',span:binding.span??null};
    });
    if(new Set(bindings.map(binding=>`${binding.namespace}:${binding.name}`)).size!==bindings.length)throw new TypeError('External table namespaces contain duplicate bindings');
    containers.set(path,{file:null,path:path.split('::'),bindings,baseType:!table.complete,baseMacro:!table.complete,unknownType:!table.complete,unknownMacro:!table.complete,external:true});
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
      let match;
      for(let length=segments.length;length>0;length--)if(externalModules.has(key(segments.slice(0,length)))){match=length;break;}
      if(match){owner=containers.get(key(segments.slice(0,match)));at=match;if(at===segments.length)return {bindings:[{name:segments.at(-1),namespace:'type',target:segments,kind:'mod',status:'resolved',visibility:{kind:'public'},source:'registered-external-table',span:null}],container:owner};}
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
    if(at===segments.length)return {bindings:[{name:owner.path.at(-1)??'crate',namespace:'type',target:owner.external?owner.path:canonical(owner.path),kind:'mod',status:'resolved',visibility:{kind:'public'},source:owner.file,span:null}],container:owner};
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
    const next=new Map([...scopes].map(([name,scope])=>[name,{candidates:[...scope.seeds],type:scope.baseType,macro:scope.baseMacro}]));globEdges.clear();
    for(const task of tasks) {
      const state=next.get(key(canonical(task.scope.path))),result=lookup(task),prefix={source:task.scope.file,span:task.span,visibility:task.visibility,via:task.glob?'glob-import':'named-import',priority:task.glob?1:2};
      if(task.validateOnly)continue;
      if(task.glob) {
        const target=result.container;
        if(result.error || !target || task.conditional || target===task.scope) {state.type=state.macro=true;continue;}
        state.type ||= target.unknownType;state.macro ||= target.unknownMacro;
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
    for(const [name,state] of next) {const scope=scopes.get(name);scope.bindings=collapse(state.candidates);scope.unknownType=state.type;scope.unknownMacro=state.macro;}
    const current=JSON.stringify([...scopes].map(([name,scope])=>[name,scope.bindings,scope.unknownType,scope.unknownMacro]));
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
    if(!converged || cyclic.has(name)){scope.unknownType=scope.unknownMacro=true;diagnostic(scope,!converged?'binding fixed point did not converge':'glob import cycle requires further resolution',{start:0,end:modules.find(module=>key(canonical(module.path))===name).source.length});}
    for(const binding of scope.bindings.filter(binding=>binding.status==='ambiguous'))diagnostic(scope,`ambiguous ${binding.namespace} binding ${binding.name}`,binding.span,{name:binding.name,namespace:binding.namespace});
  }
  for(const task of tasks) {
    const result=lookup(task);
    if(result.error || task.conditional || !task.glob && result.bindings?.some(binding=>binding.status!=='resolved') || task.glob && (!result.container || result.container===task.scope || result.container.unknownType || result.container.unknownMacro))diagnostic(task.scope,result.error??'use scope completeness, target or compilation condition remains unresolved',task.span,{name:task.name??null,glob:!!task.glob});
    if(!task.glob && result.bindings?.some(binding=>!narrower(task.visibility,binding.visibility)))diagnostic(task.scope,'reexport visibility exceeds the checked target visibility',task.span,{name:task.name});
  }
  return frozen(structuredClone({version:1,editionProfile:'2018+',scopes:[...scopes.values()].map(scope=>({file:scope.file,path:scope.path,bindings:scope.bindings,unresolvedImports:diagnostics.filter(diagnostic=>diagnostic.source===scope.file && key(diagnostic.module)===key(scope.path)),unresolvedTypeScope:scope.unknownType,unresolvedMacroScope:scope.unknownMacro})),diagnostics}));
}
