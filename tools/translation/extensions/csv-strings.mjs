// Forward scalar-character Split and standard borrowed-str allocation only.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {decodeRustCharacter} from './rust-character.mjs';
import {requireBorrowedString} from './string-iterators.mjs';
import {typeError,unsupported} from '../vendor/meta-language/translation/diagnostics.js';

const root=new URL('../source-profiles/csv-strings/',import.meta.url);
const manifest=JSON.parse(readFileSync(new URL('manifest.json',root),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
for(const source of manifest.sources){
  const compressed=readFileSync(new URL(source.file,root));
  if(hash(compressed)!==source.compressedSha256)throw new Error('CSV standard source archive differs from its pinned bytes');
  const bytes=gunzipSync(compressed,{maxOutputLength:150_000});
  if(bytes.length!==source.bytes||hash(bytes)!==source.sha256)throw new Error('CSV standard source differs from its original bytes');
}
export const CSV_STRING_PROFILE=Object.freeze({id:manifest.profile,rust:manifest.rust,constEligible:false});
const plans=new WeakSet();
export function planCharacterSplit(receiver,argument,span){
  requireBorrowedString(receiver,span);
  if(argument?.k!=='routerPatternChar'||typeof argument.raw!=='string'||decodeRustCharacter(argument.raw,argument.span)!==argument.value)throw unsupported('str::split Pattern','requires an actual written single Unicode scalar char literal',span);
  const plan=Object.freeze({profile:CSV_STRING_PROFILE.id,operation:'split',delimiter:argument.value,raw:argument.raw,constEligible:false,span:Object.freeze({...span})});plans.add(plan);return plan;
}
export function checkCharacterSplit(checker,node,object){
  if(node.args.length!==1)throw typeError('str::split expects one Pattern argument',node.span);
  const plan=planCharacterSplit(object.type,node.args[0],node.span);
  if(!plans.has(plan))throw new TypeError('Split requires a private checked standard plan');
  return {k:'routerStringSplit',object,delimiter:plan.delimiter,type:{kind:'routerIterator',element:structuredClone(object.type)},csvStringProof:{...plan,verified:true},constEligible:false,span:node.span};
}
export function checkCharacterSplitNext(checker,node,object){
  if(node.args.length||object.k!=='routerStringSplit'||object.csvStringProof?.profile!==CSV_STRING_PROFILE.id||object.csvStringProof.verified!==true)throw unsupported('Split::next','requires one immediate fresh checked scalar-character split cursor',node.span);
  requireBorrowedString(object.type.element,node.span);
  if(!checker.instantiations?.option)throw unsupported('Split::next result','requires the canonical actual standard Option instantiator',node.span);
  return {k:'routerStringSplitNext',object,type:checker.instantiations.option(object.type.element,node.span),csvStringProof:{profile:CSV_STRING_PROFILE.id,verified:true,operation:'next',consumption:'fresh-cursor-once',constEligible:false,span:{...node.span}},constEligible:false,span:node.span};
}
export function allocatingStringFunctionItem(parser,segments,path){
  if(segments.at(-1)!=='to_string')return null;
  const writtenOwner=segments.slice(0,-1),owner=parser.resolveSourceNamespace(writtenOwner,path,'type');
  // str::to_string is provided by the standard ToString trait, not an
  // inherent str method. A local/inherited ToString can replace that prelude
  // trait while leaving the primitive str owner itself entirely unchanged.
  const trait=parser.resolveSourceNamespace(['ToString'],path,'type'),standardTrait=!parser.builtinShadow('ToString',path)&&['ToString','std::string::ToString'].includes(trait.join('::'));
  if(writtenOwner.length===1&&writtenOwner[0]==='str'&&standardTrait&&!parser.builtinShadow('str',path)&&owner.join('::')==='str')return 'str::to_string';
  if(writtenOwner.length===1&&writtenOwner[0]==='ToString'&&!parser.builtinShadow('ToString',path)&&['ToString','std::string::ToString'].includes(owner.join('::')))return 'ToString::to_string';
  return null; // Qualified/aliased/custom traits need separate namespace proof.
}
export function checkedAllocatingStringItem(type,span){requireBorrowedString(type,span);return {kind:'string',rustSourceType:true,rustOwnership:{kind:'owned',source:'String'}};}
export function requireCsvEmitterProof(node){
  if(node.csvStringProof?.profile!==CSV_STRING_PROFILE.id||node.csvStringProof.verified!==true||node.constEligible!==false)throw new Error('missing checked standard CSV string proof');
  if(node.k==='routerStringSplit'&&decodeRustCharacter(node.csvStringProof.raw,node.span)!==node.delimiter)throw new Error('Split delimiter differs from its actual checked source character');
}
