import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareWidePrimitiveSliceSources} from './prepare-wide-primitive-slice-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareEmptyWrittenAttributeGrammarSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/empty-written-attribute-grammar/complete-originals-and-rules.json.gz',pin:'3f12e624eb92a465269a63685656da5d783c19f5146610229d06be46f0016291',id:'router:empty-written-attribute-grammar-complete-source-substitutions-v1',laterPlans:[prepareWidePrimitiveSliceSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareEmptyWrittenAttributeGrammarSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Empty written attribute grammar source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
