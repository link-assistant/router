// Report free identifiers (TS 2304 "Cannot find name") in JS modules without
// resolving imports. Usage: node undefined-names.mjs file...
import {createRequire} from 'node:module';
const require=createRequire(new URL('../../js/package.json',import.meta.url));
const ts=require('typescript');
const files=process.argv.slice(2);
const ignore=new Set(['process','Buffer','console','setTimeout','clearTimeout','setInterval','clearInterval','setImmediate','clearImmediate','queueMicrotask','structuredClone','globalThis','Bun','Deno','URL','URLSearchParams','TextEncoder','TextDecoder','fetch','Headers','Request','Response','AbortController','AbortSignal','performance','crypto','WebAssembly','require','module','__dirname','__filename','exports','atob','btoa','Blob','FormData','ReadableStream','WritableStream','TransformStream','WebSocket','Event','EventTarget','DOMException','BroadcastChannel','MessageChannel','Worker','navigator','SharedArrayBuffer','Atomics','FinalizationRegistry','WeakRef','Intl','Iterator','CompressionStream','DecompressionStream','File','CustomEvent','MessagePort','MessageEvent','TextDecoderStream','TextEncoderStream','CountQueuingStrategy','ByteLengthQueuingStrategy','PerformanceObserver','gc']);
const program=ts.createProgram(files,{allowJs:true,checkJs:true,noEmit:true,noResolve:true,types:[],lib:['lib.esnext.d.ts'],target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,skipLibCheck:true});
let n=0;
for(const sf of program.getSourceFiles()){if(sf.fileName.includes('node_modules'))continue;
 for(const d of program.getSemanticDiagnostics(sf)){if(d.code!==2304&&d.code!==2552&&d.code!==2662&&d.code!==2663)continue;const name=ts.flattenDiagnosticMessageText(d.messageText,'\n').match(/'([^']+)'/)?.[1];if(ignore.has(name))continue;const {line}=sf.getLineAndCharacterOfPosition(d.start);console.log(`${sf.fileName}:${line+1}: ${name}`);n++;}}
console.log(`undefined-names: ${n}`);
