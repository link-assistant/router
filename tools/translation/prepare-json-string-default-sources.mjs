import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeRustFunctionCopies} from './native-rust-function-copies.mjs';
import {prepareJsonScalarDefaultNativeSource,prepareJsonScalarDefaultSources} from './prepare-json-scalar-default-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareJsonStringDefaultNativeSource({root=ROOT}={}){return prepareNativeRustFunctionCopies({root,archive:'tools/translation/source-profiles/json-string-default-source/complete-native-template-rules.json.gz',pin:'c04fe211c4f123fd0fab33f30d497b9fdf29e86967a95193c6fe3200150f01d7',id:'router:json-string-default-native-function-copies-v1',laterPlans:[prepareJsonScalarDefaultNativeSource({root})]});}
export function prepareJsonStringDefaultSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/json-string-default-source/complete-originals-and-rules.json.gz',pin:'6ec37b0490dcebfd2240ef637bc29a1cdab646c2073d3a812010b3df82ba6dd0',id:'router:json-string-default-source-complete-source-substitutions-v1',laterPlans:[prepareJsonStringDefaultNativeSource({root}),prepareJsonScalarDefaultSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareJsonStringDefaultSources();if(args[0]==='--write'){const native=prepareJsonStringDefaultNativeSource();writeNativeSubstitutionCopy(native,{root:ROOT});writeNativeSubstitutionCopy(plan,{root:ROOT});}if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('JSON string default source copy differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),nativeFiles:plan.descendantFiles.map(row=>row.path),receivingExecuted:false,rustExecuted:false}));
}
