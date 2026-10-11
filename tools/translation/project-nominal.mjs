// Nominal identity does not require executable fields. Evidence comes from
// actual resolved type namespace bindings; aliases and unknown owners refuse.
const key=path=>JSON.stringify(path);
const nominalKinds=new Set(['struct','enum','union']);
const descendants=(path,ancestor)=>ancestor.every((name,index)=>path[index]===name);
const visible=(binding,path)=>binding.visibility?.kind==='public'||binding.visibility?.kind==='restricted'&&descendants(path,binding.visibility.path);
export function nominalTypeIdentities(scopes){
  const result=new Map(),ambiguous=new Set();
  for(const scope of scopes)for(const binding of scope.bindings){
    if(binding.namespace!=='type'||binding.status!=='resolved'||!nominalKinds.has(binding.kind)||binding.via!=='declaration'||!binding.target)continue;
    const identity={family:[...binding.target],kind:binding.kind,source:binding.source,span:binding.span};
    if(ambiguous.has(key(identity.family)))continue;
    const previous=result.get(key(identity.family));
    if(previous&&JSON.stringify(previous)!==JSON.stringify(identity)){result.delete(key(identity.family));ambiguous.add(key(identity.family));continue;}
    result.set(key(identity.family),identity);
  }
  return result;
}
export function implementationTargetPath(implementation,module){
  const item=module.items.find(item=>item.term==='impl'&&item.start===implementation.span.start);
  if(!item)return null;
  const tokens=item.tokens.filter(token=>token.type!=='comment'),begin=tokens.findIndex(token=>token.text==='impl');
  if(begin<0)return null;
  let at=begin+1,depth=0;const typeBinders=new Set();
  if(tokens[at]?.text==='<'){
    let parameterStart=true;
    for(;at<tokens.length;at++){
      if(depth===1&&parameterStart){if(tokens[at].type==='ident'&&tokens[at].text!=='const')typeBinders.add(tokens[at].text);parameterStart=false;}
      if(depth===1&&tokens[at].text===',')parameterStart=true;if(tokens[at].text==='<')depth++;if(tokens[at].text==='>')depth--;if(tokens[at].text==='>>')depth-=2;if(depth===0){at++;break;}if(depth<0)return null;}
    if(depth!==0)return null;
  }
  let from=at,end=at;
  for(;end<tokens.length;end++){
    const text=tokens[end].text;
    if(!depth&&['where','{'].includes(text))break;
    if(!depth&&text==='for')from=end+1;
    if(text==='<')depth++;if(text==='>')depth--;if(text==='>>')depth-=2;
    if(depth<0)return null;
  }
  const target=tokens.slice(from,end),segments=[];at=0;
  if(target[at]?.text==='::')return null; // External targets need an explicit registry identity.
  while(target[at]?.type==='ident'){
    segments.push(target[at++].text);
    if(target[at]?.text==='::'){at++;continue;}
    break;
  }
  if(!segments.length||typeBinders.has(segments[0]))return null;
  if(at<target.length){
    if(target[at]?.text!=='<')return null;
    depth=0;for(;at<target.length;at++){const token=target[at];if(token.text==='<')depth++;if(token.text==='>')depth--;if(token.text==='>>')depth-=2;if(depth===0){at++;break;}if(depth<0)return null;}
    if(depth!==0||at!==target.length)return null;
  }
  return segments;
}
export function resolveNominalImplTarget(implementation,module,scopes,identities=nominalTypeIdentities(scopes)){
  const segments=implementationTargetPath(implementation,module);if(!segments)return null;
  const lookup=new Map(scopes.map(scope=>[key(['crate',...scope.path]),scope]));
  let owner=lookup.get(key(['crate',...module.path])),at=0;
  if(segments[0]==='crate'){owner=lookup.get(key(['crate']));at++;}
  else if(segments[0]==='self')at++;
  else if(segments[0]==='super'){
    let path=[...module.path];while(segments[at]==='super'){if(!path.length)return null;path.pop();at++;}owner=lookup.get(key(['crate',...path]));
  }
  let binding;
  for(;at<segments.length;at++){
    if(!owner)return null;
    const candidates=owner.bindings.filter(binding=>binding.namespace==='type'&&binding.name===segments[at]);
    if(candidates.length!==1)return null;
    binding=candidates[0];if(binding.status!=='resolved'||!binding.target||!visible(binding,module.path))return null;
    if(at<segments.length-1){if(binding.kind!=='mod')return null;owner=lookup.get(key(binding.target));}
  }
  const identity=binding&&identities.get(key(binding.target));
  return identity?{version:1,family:[...identity.family],kind:identity.kind,source:identity.source,span:identity.span}:null;
}
