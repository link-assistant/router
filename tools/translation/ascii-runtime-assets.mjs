// GENERATED: exact selected native asset statements; explicit new read schedule.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assertReverseConcreteSourceHost} from './js-to-rust/concrete-source.mjs';
import {ASCII_RUNTIME_ASSET_SOURCE,ASCII_RUNTIME_ASSET_SHA256,ASCII_HOST_ASSET_SOURCE,ASCII_HOST_ASSET_SHA256,ASCII_SELECTED_ASSET_JSON} from './ascii-runtime-assets-source-data.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
export function hostCoreAsciiRuntimeAssets(){
 assertReverseConcreteSourceHost();
 const current=readFileSync(new URL('./ascii-runtime-assets.mjs',import.meta.url),'utf8');
 if(hash(current)!==ASCII_RUNTIME_ASSET_SHA256||current!==ASCII_RUNTIME_ASSET_SOURCE)throw new TypeError('ASCII selected asset producer source changed');
 const parent=readFileSync(new URL('./host-assets.mjs',import.meta.url),'utf8');
 if(hash(parent)!==ASCII_HOST_ASSET_SHA256||parent!==ASCII_HOST_ASSET_SOURCE)throw new TypeError('ASCII original asset producer source changed');
 assertReverseConcreteSourceHost();
 const parse=JSON.parse,apply=Reflect.apply,get=Map.prototype.get,pins=parse(ASCII_SELECTED_ASSET_JSON);
const files = new Map();
assertReverseConcreteSourceHost();
files.set('string-iterator-runtime.mjs', readFileSync(new URL('./extensions/string-iterator-runtime.mjs', import.meta.url), 'utf8'));
assertReverseConcreteSourceHost();
files.set('whitespace-data.mjs', readFileSync(new URL('./extensions/whitespace-data.mjs', import.meta.url), 'utf8'));
assertReverseConcreteSourceHost();
files.set('string-iterator-runtime.d.mts', "type RustOption<T> = Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;\nexport declare function stringLines(value: string): IterableIterator<string>;\nexport declare function stringWhitespace(value: string): IterableIterator<string>;\nexport declare function stringNext(value: IterableIterator<string>): RustOption<string>;\nexport declare function stringJoin(values: readonly string[], separator: string): string;\nexport declare function router_core_unicode_scalar_count(value: string): bigint;\nexport declare function router_core_ascii_chars_in(value: string, alphabet: string): boolean;\n");
assertReverseConcreteSourceHost();
for(const row of pins){const source=apply(get,files,[row.name]);if(hash(source)!==row.sha256||source!==row.source)throw new TypeError("ASCII selected asset source changed: "+row.name); }
assertReverseConcreteSourceHost();
return files;
}
export function coreAsciiAssetReadSchedule(){return {schema:'router-ascii-selected-assets-v1',producerSources:['ascii-runtime-assets.mjs','host-assets.mjs'],selectedAssets:["string-iterator-runtime.mjs","whitespace-data.mjs","string-iterator-runtime.d.mts"],runtimeReads:['extensions/string-iterator-runtime.mjs','extensions/whitespace-data.mjs'],declarationSource:'host-assets.mjs:hostRuntimeAssetsNamedDataAliases',unrelatedAssetReads:false,hostCheckerExecuted:false,fullBuilderCallbackParity:false};}
