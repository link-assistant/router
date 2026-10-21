// GENERATED: explicit ASCII base asset schedule, copied native producer nodes.
import { jsonRetentionRuntimeAssets } from './json-retention-runtime-assets.mjs';
import { readFileSync } from 'node:fs';
import { hostData, HostChecker, HOST_CONTRACTS } from './extensions/host-contracts.mjs';
import { typeScriptAliases, typeScriptType } from './type-layout.mjs';
import {createHash} from 'node:crypto';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {ASCII_BASE_HELPER_SOURCE,ASCII_BASE_HELPER_SHA256,ASCII_BASE_PARENT_JSON,ASCII_BASE_ASSET_JSON} from './ascii-base-runtime-assets-source-data.mjs';
const __asciiBaseHash=source=>createHash('sha256').update(source).digest('hex');
export function hostCoreAsciiBaseRuntimeAssets(){
 assertReverseConcreteSourceHost();
 const __asciiBaseCurrent=readFileSync(new URL('./ascii-base-runtime-assets.mjs',import.meta.url),'utf8');
 if(__asciiBaseHash(__asciiBaseCurrent)!==ASCII_BASE_HELPER_SHA256||__asciiBaseCurrent!==ASCII_BASE_HELPER_SOURCE)throw new TypeError('ASCII base helper source changed');
 assertReverseConcreteSourceHost();
 const __asciiBaseApply=Reflect.apply,__asciiBaseParse=JSON.parse,__asciiBaseGet=Map.prototype.get,__asciiBaseSize=Object.getOwnPropertyDescriptor(Map.prototype,'size').get;
 const __asciiBaseParents=__asciiBaseParse(ASCII_BASE_PARENT_JSON),__asciiBasePins=__asciiBaseParse(ASCII_BASE_ASSET_JSON);
 for(const __asciiBaseRow of __asciiBaseParents){const __asciiBaseActual=readFileSync(new URL('./'+__asciiBaseRow.path,import.meta.url),'utf8');if(__asciiBaseHash(__asciiBaseActual)!==__asciiBaseRow.sha256||__asciiBaseActual!==__asciiBaseRow.source)throw new TypeError('ASCII base original producer source changed: '+__asciiBaseRow.path);assertReverseConcreteSourceHost();}
const checker = new HostChecker('Rust', []), program = checker.program({ language: 'Rust', items: hostData(), main: null });
assertReverseConcreteSourceHost();
const types = program.declarations, aliases = typeScriptAliases(types);
assertReverseConcreteSourceHost();
const namedAliases = new Set([...types].filter(([, entry]) => entry.k === 'data').map(([name]) => name));
assertReverseConcreteSourceHost();
const files = new Map();
assertReverseConcreteSourceHost();
files.set('json-macro-runtime.mjs', readFileSync(new URL('./json-macro-runtime.mjs', import.meta.url), 'utf8').replaceAll("'./extensions/json-values.mjs'", "'./json-values.mjs'").replaceAll("'./extensions/json-numbers.mjs'", "'./json-numbers.mjs'"));
assertReverseConcreteSourceHost();
files.set('json-macro-runtime.d.mts', readFileSync(new URL('./json-macro-runtime.d.mts', import.meta.url), 'utf8'));
assertReverseConcreteSourceHost();
files.set('json-update-runtime.mjs', readFileSync(new URL('./json-update-runtime.mjs', import.meta.url), 'utf8').replace("'./extensions/json-roundtrip-runtime.mjs'", "'./json-roundtrip-runtime.mjs'").replace("'./extensions/json-values.mjs'", "'./json-values.mjs'").replace("'./extensions/json-runtime.mjs'", "'./json-runtime.mjs'"));
assertReverseConcreteSourceHost();
files.set('json-update-runtime.d.mts', readFileSync(new URL('./json-update-runtime.d.mts', import.meta.url), 'utf8'));
assertReverseConcreteSourceHost();
for (const file of ['base64-runtime.mjs', 'base64-runtime.d.mts', 'json-option-runtime.mjs', 'json-option-runtime.d.mts']) {
    assertReverseConcreteSourceHost();
    files.set(file, readFileSync(new URL('./' + file, import.meta.url), 'utf8'));
    assertReverseConcreteSourceHost();
}
for (const file of ['json-roundtrip-numbers.mjs', 'json-roundtrip-runtime.mjs']) {
    assertReverseConcreteSourceHost();
    files.set(file, readFileSync(new URL('./extensions/' + file, import.meta.url), 'utf8'));
    assertReverseConcreteSourceHost();
}
for (const file of ['exact-binary64.mjs']) {
    assertReverseConcreteSourceHost();
    files.set(file, readFileSync(new URL('./extensions/' + file, import.meta.url), 'utf8'));
    assertReverseConcreteSourceHost();
}
for (const file of ['json-roundtrip-lexical.mjs', 'json-roundtrip-cache-source.mjs', 'json-roundtrip-NOTICE.md', 'json-roundtrip-LICENSE-MIT.txt', 'json-roundtrip-LICENSE-APACHE.txt']) {
    assertReverseConcreteSourceHost();
    files.set(file, readFileSync(new URL('./extensions/' + file, import.meta.url), 'utf8'));
    assertReverseConcreteSourceHost();
}
for (const file of ['json-runtime.mjs', 'json-values.mjs', 'json-parser.mjs', 'json-numbers.mjs']) {
    assertReverseConcreteSourceHost();
    files.set(file, readFileSync(new URL('./extensions/' + file, import.meta.url), 'utf8'));
    assertReverseConcreteSourceHost();
}
for (const family of ['json']) {
    assertReverseConcreteSourceHost();
    const declarations = HOST_CONTRACTS.filter(contract => contract.family === family).map(contract => `export declare function ${contract.jsExport}(${contract.params.map((type, index) => `arg${index}: ${typeScriptType(checker.hostType(type, [], { start: 0, end: 0 }), types, { aliases: namedAliases })}`).join(', ')}): ${typeScriptType(checker.hostType(contract.ret, [], { start: 0, end: 0 }), types, { aliases: namedAliases })};`).join('\n');
    assertReverseConcreteSourceHost();
    files.set(family + '-runtime.d.mts', aliases + '\n' + declarations + '\n');
    assertReverseConcreteSourceHost();
}
for (const file of ['json-NOTICE.md', 'json-LICENSE-MIT.txt', 'time-NOTICE.md', 'integer-NOTICE.md', 'fixed-integer-NOTICE.md']) {
    assertReverseConcreteSourceHost();
    try {
        files.set(file, readFileSync(new URL('./extensions/' + file, import.meta.url), 'utf8'));
    }
    catch (error) {
        if (error.code !== 'ENOENT')
            throw error;
    }
    assertReverseConcreteSourceHost();
}
for (const [path, content] of jsonRetentionRuntimeAssets()) {
    assertReverseConcreteSourceHost();
    files.set(path, content);
    assertReverseConcreteSourceHost();
}
 if(__asciiBaseApply(__asciiBaseSize,files,[])!==__asciiBasePins.length)throw new TypeError('ASCII base selected source universe differs');
 for(const __asciiBaseRow of __asciiBasePins){const __asciiBaseActual=__asciiBaseApply(__asciiBaseGet,files,[__asciiBaseRow.name]);if(__asciiBaseHash(__asciiBaseActual)!==__asciiBaseRow.sha256||__asciiBaseActual!==__asciiBaseRow.source)throw new TypeError('ASCII base selected source changed: '+__asciiBaseRow.name);}
 assertReverseConcreteSourceHost();return files;
}
export function coreAsciiBaseAssetSchedule(){return {schema:'router-ascii-base-selected-assets-v1',selectedAssets:33,selectedNames:["arithmetic-digit-retention.mjs","base64-runtime.d.mts","base64-runtime.mjs","exact-binary64.mjs","fixed-integer-NOTICE.md","formal-ai-lexer-LICENSE","formal-ai-lexer.mjs","integer-NOTICE.md","json-LICENSE-MIT.txt","json-macro-runtime.d.mts","json-macro-runtime.mjs","json-NOTICE.md","json-numbers.mjs","json-option-runtime.d.mts","json-option-runtime.mjs","json-parser.mjs","json-roundtrip-cache-source.mjs","json-roundtrip-lexical.mjs","json-roundtrip-LICENSE-APACHE.txt","json-roundtrip-LICENSE-MIT.txt","json-roundtrip-NOTICE.md","json-roundtrip-numbers.mjs","json-roundtrip-retention-source.mjs","json-roundtrip-runtime.mjs","json-runtime.d.mts","json-runtime.mjs","json-update-runtime.d.mts","json-update-runtime.mjs","json-values.mjs","macro-token-trees.mjs","rust-item-boundaries.mjs","rust-structure.mjs","time-NOTICE.md"],producerSources:['ascii-base-runtime-assets.mjs','host-assets.mjs','json-retention-runtime-assets.mjs'],hostCheckerExecuted:true,completeHostData:true,completeNamedAliases:true,generatedDeclarationFamilies:['json'],unrelatedAssetReads:false,fullBuilderCallbackParity:false};}
