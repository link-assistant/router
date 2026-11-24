// Complete successor source equation; original source archives stay immutable.
import {fileURLToPath} from 'node:url';
import {prepareMixedNativeSubstitutionCopy,withMixedNativeSubstitutionOperation} from './failure-aware-mixed-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCrossModuleHelperBulkSources({root=ROOT}={}){
 return withMixedNativeSubstitutionOperation(()=>prepareMixedNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/cross-module-helper-bulk-20261101/complete-originals-and-rules.json.gz',pin:'2c1c9ee5f54eb3ccc5a4fc059bd6324a547a17f0e971ddff8885b965cf7f9d39',id:'router:cross-module-helper-bulk-20261101-complete-source-substitutions-v1'}));
}
