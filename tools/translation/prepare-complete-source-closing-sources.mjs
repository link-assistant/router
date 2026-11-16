import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareEmptyWrittenAttributeGrammarSources} from './prepare-empty-written-attribute-grammar-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareCompleteSourceClosingSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/complete-source-closing/complete-originals-and-rules.json.gz',pin:'6d62043046583ac21bd3fe0c5dd945d3092d0250fee3ffca01f0a4b3f22bd6de',id:'router:complete-source-closing-complete-source-substitutions-v1',laterPlans:[prepareEmptyWrittenAttributeGrammarSources({root})]}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareCompleteSourceClosingSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Complete source closing differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}
