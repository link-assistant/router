import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {preparePrimitiveOwnedVectorCoreSources} from './prepare-primitive-owned-vector-core-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function preparePrimitiveSlicePresenceAdoptionSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/primitive-slice-presence-adoption/complete-originals-and-rules.json.gz',pin:'9699bee12bcc48fb5d7cb601b732ccd6b85a461b205d3965d9fc75af474f4ad8',id:'router:primitive-slice-presence-adoption-complete-source-substitutions-v1',laterPlans:[preparePrimitiveOwnedVectorCoreSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=preparePrimitiveSlicePresenceAdoptionSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Primitive slice presence adoption source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
