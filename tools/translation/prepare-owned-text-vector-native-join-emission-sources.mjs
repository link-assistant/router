import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareMixedNativeSubstitutionCopy as prepareNativeSubstitutionCopy,writeMixedNativeSubstitutionCopy as writeNativeSubstitutionCopy,withMixedNativeSubstitutionOperation as withNativeSubstitutionOperation,mixedNativeSubstitutionCopyHasChanges as nativeSubstitutionCopyHasChanges} from './failure-aware-mixed-native-substitution-copy.mjs';
import {prepareNativeHelperSyntaxOriginSources} from './prepare-native-helper-syntax-origin-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareOwnedTextVectorNativeJoinEmissionSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/owned-text-vector-native-join-emission/complete-originals-and-rules.json.gz',pin:'e1dd67c5cc956c39d413de5b5097dbc5b3bcd6f6b17418ff728f4cc0452d7553',id:'router:owned-text-vector-native-join-emission-complete-source-substitutions-v1',laterPlans:[prepareNativeHelperSyntaxOriginSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareOwnedTextVectorNativeJoinEmissionSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Owned text vector native join emission source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
