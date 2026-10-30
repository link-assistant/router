import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges,prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareFloatingBodySources} from './prepare-floating-body-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareRangeBodySources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/range-body-inverse/complete-originals-and-rules.json.gz',pin:'10fd75c43b81691305746e2997a89613c38092763d4ff36e44c02c2a3d3814d4',id:'router:range-body-inverse-complete-source-substitutions-v1',laterPlans:[prepareFloatingBodySources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareRangeBodySources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Range body source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
