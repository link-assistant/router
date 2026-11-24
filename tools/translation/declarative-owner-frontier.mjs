// A candidate frontier is not a namespace certificate. Its only authority is
// sealed source/transcription identity; no supplied scope table can close it.
import {createHash} from 'node:crypto';
import {isDeclarativeClosureEvidence} from './declarative-closure.mjs';
import {isDeclarativeSourceProof} from './declarative-source-profile.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const frontiers=new WeakSet(),hash=value=>createHash('sha256').update(value).digest('hex');
function inputRecord(input) {
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.getOwnPropertySymbols(input).length)throw new TypeError('Owner frontier requires a plain checked evidence record');
  const entries=Object.getOwnPropertyDescriptors(input);
  if(Object.keys(entries).some(name=>!['dependencies','closure'].includes(name))||Object.values(entries).some(entry=>!('value' in entry)))throw new TypeError('Caller-supplied scope or closure authority is not accepted');
  return {dependencies:entries.dependencies?.value,closure:entries.closure?.value};
}
const tokenText=tree=>tree?.kind==='token'?tree.text:null;
function declarationFacts(origin) {
  const header=origin.definitionHeader;
  if(!header||header.sourceSha256!==origin.sourceSha256||header.sourceVerified!==true)throw new TypeError('Owner candidate is missing exact original declaration header evidence');
  const attributes=header.attributes.map(attribute=>({name:tokenText(attribute.tokens[0]),sourceSyntax:attribute.sourceSyntax,tokens:attribute.tokens,ownerResolved:false}));
  return {source:origin.source,sourceSha256:origin.sourceSha256,definitionDigest:origin.definitionDigest,name:header.name,kind:header.kind,headerSpan:header.span,visibility:header.visibility,
    attributes,writtenMacroExport:attributes.some(attribute=>attribute.name==='macro_export'),transparencyAnnotation:attributes.find(attribute=>attribute.name==='rustc_macro_transparency')??null,
    sourceVerified:true,exportOwnerVerified:false,attributeOwnersResolved:false,hygieneVerified:false};
}
export function extractDeclarativeOwnerFrontier(input) {
  const {dependencies,closure}=inputRecord(input);
  if(!isDeclarativeSourceProof(dependencies)||!isDeclarativeClosureEvidence(closure)||dependencies.digest!==closure.dependencyDigest)throw new TypeError('Owner frontier requires matching privately sealed source and expansion evidence');
  const frames=new Map(closure.frames.map(frame=>[frame.expansionDigest,frame])),calls=[],definitions=[];
  for(const frame of frames.values()) {
    const declaration=declarationFacts(frame.origin);definitions.push(declaration);
    for(const call of frame.calls) {
      const candidates=call.children.map(digest=>{
        const child=frames.get(digest);if(!child)throw new TypeError('Candidate child has no sealed trace frame');
        const target=declarationFacts(child.origin);
        return {target,writtenFinalNameMatches:call.writtenPath.at(-1)===target.name,callOwnerResolved:false};
      });
      calls.push({expansionDigest:frame.expansionDigest,path:call.path,writtenPath:call.writtenPath,hygiene:call.hygiene,sourceSyntax:call.sourceSyntax,candidates,
        obligations:[
          call.hygiene==='definition-site-dollar-crate'?'defining-crate export/path identity and visibility':'actual invocation-site type/macro namespace and lexical order',
          'all source attributes and expansion phases have independently proven owners',
          ...(candidates.length>1?['sealed exhaustive conditional selection and equal namespace footprints']:[]),
        ],callOwnerResolved:false});
    }
  }
  const evidence={schema:'declarative-owner-frontier-v1',dependencyDigest:dependencies.digest,closureDigest:closure.digest,definitions,calls,rootInvocationOwnerResolved:false,
    requiredConsumerEvidence:['source-sealed original module graph and full namespace uncertainty','exact locked Cargo feature closure and conditional declaration availability','resolved definition/call-site owner and original attribute owners','opaque capture origin and mixed-site hygiene','complete nested macro closure and anonymous-scope confinement','all feasible conditional branches with identical checked namespace footprint'],
    dimensions:{typeNamespaceComplete:false,valueNamespaceComplete:false,bangMacroComplete:false,attributeMacroComplete:false},ownerVerified:false,generatedBehavior:false};
  const result=freezeMacroTree({...evidence,digest:hash(JSON.stringify(evidence))});frontiers.add(result);return result;
}
export function isDeclarativeOwnerFrontier(value){return !!value&&frontiers.has(value);}
