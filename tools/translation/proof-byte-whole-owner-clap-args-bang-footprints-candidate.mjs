// Actual sealed Args output plus independently checked original caller scopes.
// Namespace confinement grants no Args/FromArgMatches runtime implementation.
import {createHash} from 'node:crypto';
import {deriveFootprintOriginalContext,deriveFootprintOriginalModule,deriveFootprintClapArgsSourceOutput} from './derive-footprints.mjs';
import {assertClapArgsSourceOutput} from './derive-clap-args.mjs';
import {assertConcatLiteralSourceExpansion} from './derive-clap-concat.mjs';
import {attributeOwnersForWholeSourceOperation as attributeOwners} from "./proof-byte-whole-owner-serde-bang-footprints-candidate.mjs";
const proofs=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
export function proveClapArgsBangFootprint({context,certificate}={}){
  const original=deriveFootprintOriginalContext(context,certificate),module=deriveFootprintOriginalModule(context,certificate),owners=certificate.owners.filter(owner=>owner.target.join('::')==='clap::Args');
  if(owners.length!==1)throw new TypeError('Args bang closure requires one actual sealed original derive owner');
  const output=assertClapArgsSourceOutput(deriveFootprintClapArgsSourceOutput(context,certificate),{dependencies:original.dependencies,source:module.source,span:certificate.span});
  const concatenated=output.outputs.flatMap(branch=>branch.concatExpansions);
  if(concatenated.length){const caller=certificate.clapConcatCaller;if(!caller||caller.source!==certificate.source||caller.sourceSha256!==certificate.sourceSha256||JSON.stringify(caller.span)!==JSON.stringify(certificate.span)||caller.dependenciesDigest!==original.dependencies.digest||caller.macroOwnerResolved!==true||JSON.stringify(caller.resolved)!==JSON.stringify(['core','concat'])||JSON.stringify(caller.expansionDigests)!==JSON.stringify(concatenated.map(proof=>proof.digest)))throw new TypeError('Args concat requires its exact original private caller/ancestor certificate');for(const proof of concatenated){assertConcatLiteralSourceExpansion(proof,{dependencies:original.dependencies,source:proof.input.source});}}
  const attributes=attributeOwners({...original,context,module},certificate,new Set(['allow','automatically_derived',...certificate.attributes.map(attribute=>attribute.name)]));
  const evidence={schema:'original-clap-args-bang-output-v1',source:certificate.source,sourceSha256:certificate.sourceSha256,span:certificate.span,itemSha256:certificate.itemSha256,inputCertificateDigest:certificate.digest,dependenciesDigest:original.dependencies.digest,compilationProfile:certificate.compilationProfile,owners,attributeOwners:attributes,fixedMacro:{target:['clap','value_parser'],sourceOutputDigest:output.digest,originalTypedExpansionDigests:output.valueParserExpansions.map(row=>row.expansionDigest),concatCallerDigest:certificate.clapConcatCaller?.digest??null,concatExpressionDigests:concatenated.map(row=>row.digest)},outputs:output.outputs,semanticSyntaxRoundTrip:true,selectedOwnerBangComplete:true,dimensions:{bangMacroComplete:true,typeNamespaceComplete:false,valueNamespaceComplete:false,attributeMacroComplete:false},generatedImplBehavior:false,obligations:['all sibling original derive owners require independent output closure','unknown original caller/ancestor effects remain refused','generated Args trait execution and full runtime parity remain unimplemented']};
  const proof=freeze({...evidence,digest:hash(JSON.stringify(evidence))});proofs.set(proof,{context,certificate});return proof;
}
export function assertClapArgsBangFootprint(proof,context,certificate){const state=proofs.get(proof);if(!state||state.context!==context||state.certificate!==certificate)throw new TypeError('Unsealed or mismatched original Args bang output');return proof;}
export const isClapArgsBangFootprint=value=>!!value&&proofs.has(value);
