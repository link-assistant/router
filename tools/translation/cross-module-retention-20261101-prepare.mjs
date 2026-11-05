// Complete retention successor source recipe. All execution remains UNRUN.
import {fileURLToPath} from 'node:url';
import {prepareMixedNativeSubstitutionCopy,withMixedNativeSubstitutionOperation} from './failure-aware-mixed-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCrossModuleRetentionSources({root=ROOT}={}){
 return withMixedNativeSubstitutionOperation(()=>prepareMixedNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/cross-module-retention-20261101/complete-originals-and-rules.json.gz',pin:'f3cfea58994ab2c0e87a59b3f0b63ce99c463fd4c00b0f4fbe98d9df05271f92',id:'router:cross-module-retention-20261101-complete-source-substitutions-v1'}));
}
