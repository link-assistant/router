import {fileURLToPath} from 'node:url';
import {prepareNativeSubstitutionCopy} from './prepare-native-substitution-copy.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeClassSourceOwners({root=ROOT}={}){return prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-class-source-owners/complete-originals-and-rules.json.gz',pin:'e00e694fc5266d61424e94c8527729ee3b5a2cc3028c8840247c835861cdda54',id:'router:native-class-source-owner-copy-v1'});}
