import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareIntegerCheckedWidthNativeSource} from './integer-checked-width-native-source.mjs';
import {preparePrimitiveOptionWidthSources} from './prepare-primitive-option-width-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareIntegerCheckedWidthSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/integer-checked-width-source/complete-originals-and-rules.json.gz',pin:'9be0249a4fd707cd90d27561805d9a956ca0ce8a84fcc6d1e9139caec49c71a4',id:'router:integer-checked-width-source-complete-source-substitutions-v1',laterPlans:[prepareIntegerCheckedWidthNativeSource({root}),preparePrimitiveOptionWidthSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareIntegerCheckedWidthSources();if(args[0]==='--write'){const native=prepareIntegerCheckedWidthNativeSource();writeNativeSubstitutionCopy(native,{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Integer checked width source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),nativeFiles:plan.descendantFiles.map(row=>row.path),receivingExecuted:false,rustExecuted:false}));
}
