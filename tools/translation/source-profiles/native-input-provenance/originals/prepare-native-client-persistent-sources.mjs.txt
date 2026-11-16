import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {prepareNativeSubstitutionCopy,writeNativeSubstitutionCopy,withNativeSubstitutionOperation,nativeSubstitutionCopyHasChanges} from './prepare-native-substitution-copy.mjs';
import {prepareNativeClientRemoteSources} from './prepare-native-client-remote-sources.mjs';
const ROOT=fileURLToPath(new URL('../../',import.meta.url));
export function prepareNativeClientPersistentSources({root=ROOT}={}){
 return withNativeSubstitutionOperation(()=>{const inputs=readNativeInputs(root),plan=prepareNativeSubstitutionCopy({root,archive:'tools/translation/source-profiles/native-client-persistent/complete-originals-and-rules.json.gz',pin:'4f3f6716d8c4784e4af25f27084dc816a1917712ede5299f6df864b5771bba1a',id:'router:native-client-persistent-complete-source-substitutions-v1',laterPlans:[prepareNativeClientRemoteSources({root})]});for(const row of inputs)assertNativeSourceProvenanceCurrent(root,row);return {...plan,nativeInputs:inputs,rustExecuted:false};});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--write','--check'].includes(args[0]))throw new TypeError('Use --emit|--write|--check');const plan=prepareNativeClientPersistentSources();if(args[0]==='--write')writeNativeSubstitutionCopy(plan,{root:ROOT});if(args[0]==='--check'&&nativeSubstitutionCopyHasChanges(plan))throw new TypeError('Native client persistent source differs');console.log(JSON.stringify(args[0]==='--emit'?plan:{schema:plan.schema,files:plan.files.map(row=>row.path),receivingExecuted:false}));
}

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {transportConcreteSyntaxSource,transportConcreteSyntaxMeta} from './concrete-syntax-meta.mjs';
function readNativeInputs(root){
 const bytes=readFileSync(resolve(root,'tools/translation/source-profiles/native-client-persistent/native-inputs.json'));if(createHash('sha256').update(bytes).digest('hex')!=='f522d088d7c0c03b544ba032f30a109dcb9b5a33df420f3dbc0936cf81cf0cf0')throw new TypeError('Complete native client source provenance differs');const data=JSON.parse(bytes);return data.files.map(row=>{const originalSource=readFileSync(resolve(root,row.originalPath),'utf8');if(Buffer.byteLength(originalSource)!==row.bytes||createHash('sha256').update(originalSource).digest('hex')!==row.sha256)throw new TypeError('Actual complete native original input differs');const joined=currentNativeSourceProvenance(root,{...row,source:originalSource}),source=joined.source;const concrete=transportConcreteSyntaxSource(source,{language:joined.language});if(transportConcreteSyntaxMeta(concrete.meta).source!==source)throw new TypeError('Complete native client CST inverse differs');return {...row,...joined,originalBytes:row.bytes,originalSha256:row.sha256,bytes:Buffer.byteLength(source),sha256:createHash('sha256').update(source).digest('hex'),source,concreteSyntax:concrete.meta,sourceAuthority:false,semanticAuthority:false};});
}

import {currentNativeSourceProvenance,assertNativeSourceProvenanceCurrent} from './native-source-history.mjs';
