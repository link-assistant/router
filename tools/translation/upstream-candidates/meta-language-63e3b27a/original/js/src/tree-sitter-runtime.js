// One shared initialization keeps production parsing and development oracles
// on the same authenticated UTF-8 runtime without loading the public package.
import { Parser } from 'web-tree-sitter';
import { readCompressedGrammarAsset } from './grammar-asset-path.js';
import { readRuntimeProjectData } from './project-data-loader.js';

await Parser.init({
  wasmBinary: readCompressedGrammarAsset(
    'js/src/vendor/web-tree-sitter/web-tree-sitter.wasm.gz',
    new URL('./vendor/web-tree-sitter/web-tree-sitter.wasm.gz', import.meta.url),
    readRuntimeProjectData(new URL('./vendor/web-tree-sitter/runtime-lock.json', import.meta.url)).wasmSha256,
  ),
});
