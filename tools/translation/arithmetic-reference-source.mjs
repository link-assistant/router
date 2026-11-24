// Private original standard declaration identity for source-IR projections.
// This does not close caller imports, builtin attributes or Rust trait phases.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {originalMacroTrees,freezeMacroTree} from './macro-token-trees.mjs';
const states=new WeakMap(),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),word=node=>node?.kind==='token'?node.text:null,root=new URL('./source-profiles/json-macro/standard/',import.meta.url);
export function compilePinnedArithmeticReferenceSource(){
  const bytes=readFileSync(new URL('manifest.json',root));if(hash(bytes)!=='4d71ed0cce3a2bbf144dd314362d0b474fa0eb26329231e1be1b369f5c388db6')throw new TypeError('Standard reference profile changed');const profile=JSON.parse(bytes),pin=profile.sources.find(row=>row.path==='library-core-src-convert-mod.rs.gz');if(!pin||pin.sha256!=='0b05be0bc9c7d92d788abd6817d648b4479ed6e29ffe24cfd6879e09ee9fbdab')throw new TypeError('Standard reference source identity changed');const compressed=readFileSync(new URL(pin.path,root));if(hash(compressed)!==pin.archiveSha256)throw new TypeError('Standard reference archive changed');const decoded=gunzipSync(compressed,{maxOutputLength:65536});if(decoded.length!==pin.bytes||hash(decoded)!==pin.sha256)throw new TypeError('Standard reference original bytes changed');
  const source=decoded.toString('utf8'),trees=originalMacroTrees(source),traits=[];
  for(let at=0;at<trees.length;at++)if(word(trees[at])==='trait'){
    let end=at+1;while(end<trees.length&&trees[end]?.delimiter!=='{'&&word(trees[end])!==';')end++;if(trees[end]?.delimiter!=='{')continue;const header=trees.slice(at,end),name=word(header[1]);if(name!=='AsRef')continue;
    if(header.length!==9||word(header[2])!=='<'||word(header[4])!==':'||word(header[6])!=='>'||word(header[7])!==':'||word(header[5])!==word(header[8]))throw new TypeError('Original reference trait generic signature is outside the selected profile');const formal=word(header[3]),body=trees[end].children,members=[];
    for(let i=0;i<body.length;i++)if(word(body[i])==='fn'){let finish=i+1;while(finish<body.length&&word(body[finish])!==';'&&body[finish]?.delimiter!=='{')finish++;if(word(body[finish])!==';')throw new TypeError('Original reference trait has an unproved body');const tokens=body.slice(i,finish+1),span={start:tokens[0].span.start,end:tokens.at(-1).span.end};if(tokens.length!==7||tokens[2]?.delimiter!=='('||tokens[2].children.length!==2||word(tokens[2].children[0])!=='&'||word(tokens[2].children[1])!=='self'||word(tokens[3])!=='->'||word(tokens[4])!=='&'||word(tokens[5])!==formal)throw new TypeError('Original shared reference trait member signature differs');members.push({name:word(tokens[1]),tokens,span,sha256:hash(source.slice(span.start,span.end))});i=finish;}
    const span={start:header[0].span.start,end:trees[end].span.end};traits.push({name,formal,header,span,sha256:hash(source.slice(span.start,span.end)),members});at=end;
  }
  if(traits.length!==1||traits[0].members.length!==1)throw new TypeError('Original reference trait declaration is absent or ambiguous');
  const issued={schema:'pinned-original-reference-declaration-identity-v1',sourceSha256:pin.sha256,modulePath:['core','convert'],sourcePath:'library/core/src/convert/mod.rs',profileSha256:hash(bytes),traits,canonicalDeclarationIdentified:true,attributeOwnerVerified:false,callerTraitOwnerVerified:false,copyContractVerified:false,namespaceAuthority:false,parseAdmission:false,applicationEffectCompleteness:false,runtimeParity:false};const encoded=JSON.stringify(issued),proof=freezeMacroTree({...JSON.parse(encoded),privateMetaRoundtrip:true,checkedMetaSha256:hash(encoded)});states.set(proof,{source,traits:proof.traits});return proof;
}
export const isArithmeticReferenceSource=proof=>!!proof&&states.has(proof);
export function arithmeticReferenceSourceMember(proof,fn,traitName){
  const state=states.get(proof);if(!state||fn?.sourceModuleSha256!==proof.sourceSha256||fn.sourceModulePath?.join('::')!==proof.modulePath.join('::')||fn.context?.role!=='impl'||fn.context.name!==traitName)throw new TypeError('Original canonical reference source membership differs');
  const traits=state.traits.filter(trait=>trait.name===traitName),trait=traits[0],members=trait?.members.filter(member=>member.name===fn.method);if(traits.length!==1||members?.length!==1||hash(state.source.slice(fn.span.start,fn.span.end))!==fn.sha256||hash(state.source.slice(fn.context.span.start,fn.context.span.end))!==fn.context.sha256)throw new TypeError('Original canonical reference signature is absent or changed');return trait;
}
