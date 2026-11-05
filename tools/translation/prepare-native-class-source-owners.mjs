import {fileURLToPath} from 'node:url';
import {withNativeSubstitutionOperation,prepareNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
import {prepareNativeSourceOperationPart1} from './prepare-native-source-operation-part-1.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeClassSourceOwners({root=ROOT}={}){return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-class-source-owners/complete-originals-and-rules.json.gz',pin:'e00e694fc5266d61424e94c8527729ee3b5a2cc3028c8840247c835861cdda54',id:'router:native-class-source-owner-copy-v1',laterPlans:[prepareNativeSourceOperationPart1({root})]}));}
