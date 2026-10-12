// Original standard slice-reference body for arithmetic source projections.
// A pinned library definition is not a caller trait-owner/auto-borrow proof.
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {isJsonMacroSourceProof} from './json-macro-sources.mjs';
import {compilePinnedArithmeticReferenceSource} from './arithmetic-reference-source.mjs';
import {compileArithmeticSourceFragments} from './arithmetic-source-fragments.mjs';
import {compileArithmeticSourceData} from './arithmetic-source-data.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
const root=new URL('./source-profiles/json-macro/standard/',import.meta.url),hash=bytes=>createHash('sha256').update(bytes).digest('hex'),states=new WeakMap();
export function compilePinnedJsonSliceReferenceFragments(dependencies,{sharedForwarding=false}={}){
  if(typeof sharedForwarding!=='boolean')throw new TypeError('Reference source selection requires a boolean syntax-only profile');
  if(!isJsonMacroSourceProof(dependencies))throw new TypeError('Reference fragments require private original dependency evidence');
  const profileBytes=readFileSync(new URL('manifest.json',root));if(hash(profileBytes)!=='4d71ed0cce3a2bbf144dd314362d0b474fa0eb26329231e1be1b369f5c388db6')throw new TypeError('Original standard source profile changed');
  const profile=JSON.parse(profileBytes),pin=profile.sources.find(row=>row.path==='library-core-src-convert-mod.rs.gz');if(!pin||pin.sha256!=='0b05be0bc9c7d92d788abd6817d648b4479ed6e29ffe24cfd6879e09ee9fbdab')throw new TypeError('Original core reference input identity changed');
  const compressed=readFileSync(new URL(pin.path,root));if(hash(compressed)!==pin.archiveSha256)throw new TypeError('Original core reference archive changed');const decoded=gunzipSync(compressed,{maxOutputLength:65536});if(decoded.length!==pin.bytes||hash(decoded)!==pin.sha256)throw new TypeError('Original core reference bytes changed');
  const source=decoded.toString('utf8'),modulePath=['core','convert'],path='impl::AsRef::slice_T::as_ref',selectedPaths=[path,...(sharedForwarding?['impl::AsRef::shared_T::as_ref']:[])],referenceSource=compilePinnedArithmeticReferenceSource(),program=compileArithmeticSourceFragments(source,selectedPaths),data=compileArithmeticSourceData(source,modulePath);
  const candidate=freezeMacroTree({schema:'original-standard-slice-reference-ir-projection-v1',rust:profile.rust,source:{path:'library/core/src/convert/mod.rs',sha256:pin.sha256,profileSha256:hash(profileBytes)},modulePath,path,selectedPaths,referenceSource,program,data,projectionOnly:true,traitOwnerVerified:false,referenceContractVerified:false,primitiveCopyVerified:false,toolchainIdentityVerified:false,namespaceAuthority:false,parseAdmission:false,applicationEffectCompleteness:false,runtimeParity:false,remainingObligations:['actual caller AsRef/method resolution and prelude owners','borrow/coercion/reference forwarding where and UFCS rules','primitive Copy/architecture and original builtin attribute ownership','allocation/pointer validity and whole reader behavior']});states.set(candidate,{program,data,modulePath,referenceSource});return candidate;
}
export function pinnedJsonSliceReferencePrograms(candidate){const state=states.get(candidate);if(!state)throw new TypeError('Unsealed original slice reference candidate');return {...state,modulePath:[...state.modulePath]};}
