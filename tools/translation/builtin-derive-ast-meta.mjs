// Original Rust compiler AST construction recipes, never generated trait bodies.
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {isDeriveDependencyProof} from './derive-dependencies.mjs';
import {originalMacroTrees} from './macro-token-trees.mjs';
import {requireOriginalStandardBangOutputSourcePlan} from './standard-bang-output-source.mjs';
import {originalStaticSourceIntrinsicsUnchanged,originalDataFreezeIntrinsicsUnchanged} from './original-json-intrinsics.mjs';
const collectionInputsInitiallyNative=originalStaticSourceIntrinsicsUnchanged()&&originalDataFreezeIntrinsicsUnchanged();
const root=new URL('./source-profiles/builtin-derive-bang/',import.meta.url);
const profileBytes=readFileSync(new URL('manifest.json',root));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const hash=value=>createHash('sha256').update(value).digest('hex');
export const BUILTIN_DERIVE_AST_PROFILE=freeze(JSON.parse(profileBytes));
const profiles=new WeakMap(),cached=new WeakMap(),fragments=new WeakMap();
const identifier=tree=>tree?.kind==='token'&&/^[_\p{L}][_\p{L}\p{N}]*$/u.test(tree.text);
export function builtinDeriveAstSourceProfile(dependencies){
  if(!isDeriveDependencyProof(dependencies)||dependencies.rustVersion!==BUILTIN_DERIVE_AST_PROFILE.rustVersion)throw new TypeError('Builtin AST source requires sealed matching Rust dependencies');
  if(cached.has(dependencies))return cached.get(dependencies);
  const sources=new Map();
  for(const entry of BUILTIN_DERIVE_AST_PROFILE.sources){
    const packed=readFileSync(new URL(entry.archive,root));
    if(packed.length!==entry.archiveBytes||hash(packed)!==entry.archiveSha256)throw new TypeError('Builtin AST archive checksum mismatch');
    const bytes=gunzipSync(packed,{maxOutputLength:300000});
    if(bytes.length!==entry.bytes||hash(bytes)!==entry.sha256)throw new TypeError('Builtin AST original source checksum mismatch');
    sources.set(entry.path,freeze({...entry,source:bytes.toString('utf8')}));
  }
  const evidence={schema:'sealed-builtin-derive-ast-source-v1',dependenciesDigest:dependencies.digest,rustVersion:dependencies.rustVersion,sourceProfileSha256:hash(profileBytes),sources:BUILTIN_DERIVE_AST_PROFILE.sources,generatedImplBehavior:false};
  const profile=freeze({...evidence,digest:hash(JSON.stringify(evidence))});profiles.set(profile,{dependencies,sources,functions:new Map(),syntaxRoots:new Map()});cached.set(dependencies,profile);return profile;
}
export const isBuiltinDeriveAstProfile=value=>!!value&&profiles.has(value);
export function builtinAstOriginal(profile,path){const state=profiles.get(profile),source=state?.sources.get(path);if(!source)throw new TypeError('Unsealed or missing builtin AST source');return source;}
// These roots are static, unbranded source syntax. The genuine profile owns
// frozen original strings; callers still issue/check their own fragments and
// semantic computations. Nothing is shared across private profile identities.
function originalSyntaxRoots(profile,path){
  const origin=builtinAstOriginal(profile,path),state=profiles.get(profile),cached=state.syntaxRoots.get(path);
  if(cached){
    if(cached.origin!==origin||cached.source!==origin.source||cached.sha256!==origin.sha256)throw new TypeError('Original builtin AST syntax source changed');
    return cached.roots;
  }
  const roots=freeze(originalMacroTrees(origin.source,{maxBytes:256000,maxTokens:32000,maxDepth:64}));
  state.syntaxRoots.set(path,{origin,source:origin.source,sha256:origin.sha256,roots});return roots;
}
export function originalAstFunction(profile,path,name,sourceContains=null){
  const state=profiles.get(profile);if(!state)throw new TypeError('Unsealed builtin AST function inventory');
  if(sourceContains!==null&&(typeof sourceContains!=='string'||!sourceContains.length||sourceContains.length>256))throw new TypeError('Original AST overload selector exceeds its bounded source profile');
  const key=path+'::'+name+'::'+(sourceContains??'');if(state.functions.has(key))return state.functions.get(key);
  const origin=builtinAstOriginal(profile,path),roots=originalSyntaxRoots(profile,path),matches=[];
  function visit(nodes){
    for(let at=0;at<nodes.length;at++){
      if(nodes[at].text==='fn'&&identifier(nodes[at+1])&&nodes[at+1].text===name){
        let end=at+2;while(end<nodes.length&&!(nodes[end].kind==='group'&&nodes[end].delimiter==='{')&&nodes[end].text!==';')end++;
        if(nodes[end]?.kind==='group'&&nodes[end].delimiter==='{'){
          const span={start:nodes[at].span.start,end:nodes[end].span.end};
          if(sourceContains===null||origin.source.slice(span.start,span.end).includes(sourceContains))matches.push({nodes:nodes.slice(at,end+1),span});
        }
      }
      if(nodes[at].kind==='group')visit(nodes[at].children);
    }
  }visit(roots);
  if(matches.length!==1)throw new TypeError('Original builtin AST function is not unique: '+key);
  const {nodes,span}=matches[0],encoded=JSON.stringify(nodes),syntax=JSON.parse(encoded);
  if(JSON.stringify(syntax)!==encoded)throw new TypeError('Builtin AST source semantic roundtrip changed syntax');
  const evidence={schema:'original-ast-function-meta-v1',source:path,sourceSha256:origin.sha256,span,sha256:hash(origin.source.slice(span.start,span.end)),syntax,syntaxSha256:hash(encoded),semanticSyntaxRoundTrip:true,generatedImplBehavior:false};
  const fragment=freeze({...evidence,digest:hash(JSON.stringify(evidence))});fragments.set(fragment,{profile,origin});state.functions.set(key,fragment);return fragment;
}
export function assertOriginalAstFunction(profile,fragment){if(fragments.get(fragment)?.profile!==profile)throw new TypeError('Unsealed original AST construction fragment');return fragment;}
export function astFragmentText(fragment){if(!fragments.has(fragment))throw new TypeError('Unsealed AST source fragment');const state=fragments.get(fragment);return state.origin.source.slice(fragment.span.start,fragment.span.end);}
export function originalAstDefinition(profile,path,kind,name){
  const origin=builtinAstOriginal(profile,path),roots=originalSyntaxRoots(profile,path),matches=[];
  function visit(nodes){for(let at=0;at<nodes.length;at++){
    if(nodes[at].text===kind&&nodes[at+1]?.text===name){let end=at+2;while(end<nodes.length&&!(nodes[end].kind==='group'&&nodes[end].delimiter==='{')&&nodes[end].text!==';')end++;if(nodes[end]?.kind==='group'&&nodes[end].delimiter==='{')matches.push(nodes.slice(at,end+1));}
    if(nodes[at].kind==='group')visit(nodes[at].children);
  }}visit(roots);
  if(matches.length!==1)throw new TypeError('Original AST schema definition is not unique: '+kind+' '+name);
  const syntax=JSON.parse(JSON.stringify(matches[0])),span={start:syntax[0].span.start,end:syntax.at(-1).span.end};
  const evidence={schema:'original-ast-schema-meta-v1',source:path,sourceSha256:origin.sha256,span,sha256:hash(origin.source.slice(span.start,span.end)),syntax,syntaxSha256:hash(JSON.stringify(syntax)),semanticSyntaxRoundTrip:true,generatedImplBehavior:false};
  const fragment=freeze({...evidence,digest:hash(JSON.stringify(evidence))});fragments.set(fragment,{profile,origin});return fragment;
}

// Extract an actual named Rust struct literal, retaining every source field.
// Field expression meta remains syntax until a route discharges its typed slots.
export function astStructLiterals(profile,fragment,name){
  assertOriginalAstFunction(profile,fragment);const candidates=[];
  function visit(nodes){for(let at=0;at<nodes.length;at++){
    if(nodes[at].text===name&&nodes[at+1]?.kind==='group'&&nodes[at+1].delimiter==='{')candidates.push(nodes[at+1]);
    if(nodes[at].kind==='group')visit(nodes[at].children);
  }}
  // A return type such as `-> ast::Stmt` is followed by the function body,
  // not a Stmt literal. Inspect executable recipe syntax inside that body.
  const body=fragment.syntax.at(-1);if(fragment.schema!=='original-ast-function-meta-v1'||body?.kind!=='group'||body.delimiter!=='{')throw new TypeError('AST literal recipe requires its original function body');
  visit(body.children);
  return freeze(candidates.map(group=>{
  const fields=[];let at=0;
  while(at<group.children.length){
    const member=group.children[at++];if(!identifier(member)||fields.some(field=>field.name===member.text))throw new TypeError('AST source recipe field is not unique');
    const explicit=group.children[at]?.text===':';if(explicit)at++;
    const start=at;let angle=0;
    if(explicit)for(;at<group.children.length;at++){const node=group.children[at];if(node.text==='<')angle++;if(node.text==='>')angle--;if(node.text===','&&angle===0)break;}
    const expression=explicit?group.children.slice(start,at):[member];
    if(!expression.length||angle)throw new TypeError('AST source recipe field expression remains unresolved');
    fields.push({name:member.text,span:member.span,expression});if(group.children[at]?.text===',')at++;
  }
  return {schema:'original-ast-struct-recipe-v1',source:fragment.source,sourceSha256:fragment.sourceSha256,span:group.span,fragmentDigest:fragment.digest,name,fields,generatedImplBehavior:false};
  }));
}
export function astStructLiteral(profile,fragment,name){
  const candidates=astStructLiterals(profile,fragment,name);
  if(candidates.length!==1)throw new TypeError('Original AST struct recipe is not unique: '+name);
  return candidates[0];
}
export const astSyntaxText=nodes=>nodes.map(node=>node.kind==='group'?node.delimiter+astSyntaxText(node.children)+({'(':')','[':']','{':'}'}[node.delimiter]):node.text).join(' ');

// Positive constructors in an actual original recipe. Preserve each argument
// slot and schema; an AST variant spelling alone is never an output proof.
export function originalAstPositiveConstructors(profile,fragment,owner){
  assertOriginalAstFunction(profile,fragment);
  const definition=originalAstDefinition(profile,'compiler/rustc_ast/src/ast.rs','enum',owner),constructors=[];
  function visit(nodes){for(let at=0;at<nodes.length;at++){
    if(nodes[at].text==='ast'&&nodes[at+1]?.text==='::'&&nodes[at+2]?.text===owner&&nodes[at+3]?.text==='::'){
      const variant=astEnumVariant(profile,definition,nodes[at+4]?.text),group=nodes[at+5],args=[];
      if(variant.arity){if(group?.delimiter!=='(')throw new TypeError('Original positive AST recipe requires constructor argument slots');let from=0,depth=0;for(let index=0;index<=group.children.length;index++){const node=group.children[index];if(node?.text==='<')depth++;if(node?.text==='>')depth--;if(index===group.children.length||node?.text===','&&!depth){if(index>from)args.push(group.children.slice(from,index));from=index+1;}}if(depth||args.length!==variant.arity)throw new TypeError('Original positive AST recipe arity changed');}
      constructors.push({source:fragment.source,sourceSha256:fragment.sourceSha256,span:{start:nodes[at].span.start,end:variant.arity?group.span.end:nodes[at+4].span.end},variant,args,recipeDigest:fragment.digest});
    }
    if(nodes[at].kind==='group')visit(nodes[at].children);
  }}visit(fragment.syntax.at(-1).children);
  if(!constructors.length)throw new TypeError('Original recipe has no positive '+owner+' constructor');return freeze(constructors);
}

// Positive enum variant schema lifted from the original AST definition. This
// records constructor arity/typed source slots, rather than an absence of MacCall.
export function astEnumVariant(profile,definition,name){
  assertOriginalAstFunction(profile,definition);
  const keyword=definition.syntax.findIndex(node=>node.text==='enum');
  if(keyword<0)throw new TypeError('AST variant requires an original enum schema');
  const body=definition.syntax.slice(keyword+2).find(node=>node.kind==='group'&&node.delimiter==='{');
  if(!body)throw new TypeError('Original AST enum schema body is missing');
  const rows=[];let at=0;
  while(at<body.children.length){
    while(body.children[at]?.text==='#'&&body.children[at+1]?.kind==='group'&&body.children[at+1].delimiter==='[')at+=2;
    const ident=body.children[at++];if(!identifier(ident))throw new TypeError('Original AST enum variant identity is unresolved');
    const begin=at;let angle=0;
    for(;at<body.children.length;at++){const node=body.children[at];if(node.text==='<')angle++;if(node.text==='>')angle--;if(node.text===','&&!angle)break;}
    const tail=body.children.slice(begin,at);if(angle||tail.length>1)throw new TypeError('Original AST variant fields require a direct tuple/named schema');
    const group=tail[0];if(group&&(!(group.kind==='group')||!['(','{'].includes(group.delimiter)))throw new TypeError('Original AST variant discriminant remains unproved');
    const fields=[];if(group){let from=0,depth=0;for(let index=0;index<=group.children.length;index++){
      const node=group.children[index];if(node?.text==='<')depth++;if(node?.text==='>')depth--;
      if(index===group.children.length||node?.text===','&&!depth){if(index>from)fields.push(group.children.slice(from,index));from=index+1;}
    }if(depth)throw new TypeError('Original AST schema generic field syntax is unbalanced');}
    rows.push({name:ident.text,span:{start:ident.span.start,end:group?.span.end??ident.span.end},style:group?.delimiter==='{'?'named':group?'tuple':'unit',fields});
    if(body.children[at]?.text===',')at++;
  }
  const matches=rows.filter(row=>row.name===name);if(matches.length!==1)throw new TypeError('Original positive AST variant is absent/ambiguous: '+name);
  const evidence={schema:'original-positive-ast-variant-v1',source:definition.source,sourceSha256:definition.sourceSha256,definitionDigest:definition.digest,...matches[0],arity:matches[0].fields.length,semanticSyntaxRoundTrip:true,generatedImplBehavior:false};
  return freeze({...evidence,digest:hash(JSON.stringify(evidence))});
}

// A separate capability extends only source observation. Its child profile never
// escapes and is not accepted by any existing public profile/fragment issuer.
const compilerOutputSources=new WeakMap();
export function compilerOutputAstSourceAccess(profile,sourcePlan){
  const parent=profiles.get(profile);if(!parent)throw new TypeError('Compiler output source requires its original private profile');
  requireOriginalStandardBangOutputSourcePlan(sourcePlan);
  if(sourcePlan.manifest.rust!=='1.89.0'||profile.rustVersion!=='1.89')throw new TypeError('Compiler output source versions differ');
  const sources=new Map(parent.sources);
  for(const input of sourcePlan.sources){
    const prior=sources.get(input.sourcePath);
    if(prior&&(prior.source!==input.source||prior.sha256!==input.sha256||prior.bytes!==input.bytes))throw new TypeError('Compiler output original source overlap differs');
    if(!prior)sources.set(input.sourcePath,freeze({...input,path:input.sourcePath}));
  }
  const child=Object.freeze({digest:hash(JSON.stringify({parent:profile.digest,plan:sourcePlan.manifestSha256})),rustVersion:profile.rustVersion});
  profiles.set(child,{dependencies:parent.dependencies,sources,functions:new Map(),syntaxRoots:new Map()});
  const access=Object.freeze({schema:'private-compiler-output-source-access-v1',digest:child.digest,
    original:path=>builtinAstOriginal(child,path),
    function:(path,name,selector=null)=>originalAstFunction(child,path,name,selector),
    assert:fragment=>assertOriginalAstFunction(child,fragment),
    definition:(path,kind,name)=>originalAstDefinition(child,path,kind,name),
    variant:(definition,name)=>astEnumVariant(child,definition,name)});
  compilerOutputSources.set(access,{profile,sourcePlan,child});return access;
}
export function requireCompilerOutputAstSourceAccess(access,profile=null){
  const state=compilerOutputSources.get(access);if(!state)throw new TypeError('Copied or foreign compiler output source access');
  if(!profiles.has(state.profile)||profile!==null&&state.profile!==profile)throw new TypeError('Original compiler output parent changed');
  requireOriginalStandardBangOutputSourcePlan(state.sourcePlan);return access;
}

// Source availability for the collection/return-contract lane only. No existing
// profile factory gains these inputs or an additional semantic domain.
function collectionInputsGuard(){if(!collectionInputsInitiallyNative||!originalStaticSourceIntrinsicsUnchanged()||!originalDataFreezeIntrinsicsUnchanged())throw new TypeError('Original collection source operations changed');}
export function compilerOutputCollectionSourceAccess(access){
  collectionInputsGuard();
  requireCompilerOutputAstSourceAccess(access);const prior=compilerOutputSources.get(access),parent=profiles.get(prior.child);
  const root=new URL('./source-profiles/compiler-output-collections/',import.meta.url),bytes=readFileSync(new URL('manifest.json',root));
  if(hash(bytes)!=='95838d907d2550fdbac20c8b1a805336cb0cb7db8fd242e497fa840673a11f85')throw new TypeError('Original collection source inventory changed');
  const manifest=JSON.parse(bytes),sources=new Map(parent.sources);
  if(manifest.revision!=='29483883eed69d5fb4db01964cdf2af4d86e9cb2'||manifest.sources.length!==16)throw new TypeError('Original collection source version/count differs');
  for(const license of manifest.licenses){const original=readFileSync(new URL(license.file,root));if(original.length!==license.bytes||hash(original)!==license.sha256)throw new TypeError('Original collection license changed');}
  const seen=new Set();let total=0;
  for(const entry of manifest.sources){
    if(seen.has(entry.path))throw new TypeError('Original collection source repeated');seen.add(entry.path);
    const packed=readFileSync(new URL(entry.archive,root));if(packed.length!==entry.archiveBytes||hash(packed)!==entry.archiveSha256)throw new TypeError('Original collection archive changed');
    const raw=gunzipSync(packed,{maxOutputLength:2*1024*1024});if(raw.length!==entry.bytes||hash(raw)!==entry.sha256)throw new TypeError('Original collection source changed');total+=raw.length;if(total>2*1024*1024)throw new TypeError('Original collection source aggregate bound');
    const source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(raw),existing=sources.get(entry.path);
    if(existing&&(existing.source!==source||existing.sha256!==entry.sha256||existing.bytes!==entry.bytes))throw new TypeError('Original collection source overlap differs');
    if(!existing)sources.set(entry.path,freeze({...entry,source}));
  }
  const child=Object.freeze({digest:hash(JSON.stringify({parent:prior.child.digest,sourceProfileSha256:hash(bytes)})),rustVersion:prior.profile.rustVersion});
  profiles.set(child,{dependencies:parent.dependencies,sources,functions:new Map(),syntaxRoots:new Map()});
  const result=Object.freeze({schema:'private-compiler-output-collection-source-access-v1',digest:child.digest,sourceProfileSha256:hash(bytes),
    original:path=>{collectionInputsGuard();return builtinAstOriginal(child,path);},
    function:(path,name,selector=null)=>{collectionInputsGuard();return originalAstFunction(child,path,name,selector);},
    assert:fragment=>{collectionInputsGuard();return assertOriginalAstFunction(child,fragment);},
    definition:(path,kind,name)=>{collectionInputsGuard();return originalAstDefinition(child,path,kind,name);},
    variant:(definition,name)=>{collectionInputsGuard();return astEnumVariant(child,definition,name);}});
  collectionInputsGuard();
  compilerOutputSources.set(result,{profile:prior.profile,sourcePlan:prior.sourcePlan,child});return result;
}
