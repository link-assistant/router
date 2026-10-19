// Bounded source-only before/after diagnostic. No emitted JS, CTFE/runtime
// execution, generated corpus, TypeScript compiler or Rust process is used.
// Pass a source-links module URL/path; baseline imports may be relocated to
// the same current immutable dependencies in a temporary diagnostic folder.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {DataRustParser} from '../extensions/data.mjs';
import {tokenizeRust} from '../extensions/lexical.mjs';

const sourceLinks=process.argv[2]?new URL(process.argv[2].startsWith('file:')?process.argv[2]:pathToFileURL(resolve(process.argv[2]))):new URL('../extensions/source-links.mjs',import.meta.url);
const {withCapturedSourceParser,linkParsedFile,metadataDigest}=await import(sourceLinks.href),Parser=withCapturedSourceParser(DataRustParser);
const count=128,repetitions=3,source=Array.from({length:count},(_,index)=>`pub const VALUE_${index}:u64=${index}u64;`).join('\n')+'\nfn main(){}';
const scope=Object.freeze({profile:'source-capture-benchmark-v1',purpose:'same-byte source capture only'}),runs=[];
for(let attempt=0;attempt<=repetitions;attempt++) {
  const start=performance.now(),parser=new Parser(tokenizeRust(source)),surface=parser.file();linkParsedFile(parser,surface,source,{sourcePath:'benchmark/immutable.rs',scope});
  const elapsed=performance.now()-start,digest=metadataDigest(surface);
  if(surface.items.filter(entry=>entry.constant).length!==count)throw new Error('benchmark did not capture every constant');
  if(attempt)runs.push({milliseconds:elapsed,semanticDigest:digest});
}
if(new Set(runs.map(run=>run.semanticDigest)).size!==1)throw new Error('source capture changed source semantics');
const implementation=readFileSync(sourceLinks),hash=bytes=>createHash('sha256').update(bytes).digest('hex');
process.stdout.write(JSON.stringify({profile:scope.profile,node:process.version,implementationSha256:hash(implementation),sourceSha256:hash(source),sourceBytes:Buffer.byteLength(source),declarations:count,warmup:1,repetitions,runs},null,2)+'\n');
