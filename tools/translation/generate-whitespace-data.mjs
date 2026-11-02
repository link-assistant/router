#!/usr/bin/env node
import {withProtectedSpecialCliWriter} from './protected-special-cli-writers-20261102.mjs';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
import {whitespaceSourceArtifacts} from './extensions/whitespace-source.mjs';
const args=process.argv.slice(2);
if(args.length>1||args.some(argument=>argument!=='--check'))throw new TypeError('Usage: node tools/translation/generate-whitespace-data.mjs [--check]');
const check=args.includes('--check'),ROOT=fileURLToPath(new URL('../../',import.meta.url));
function produce(writer){
 const artifacts=whitespaceSourceArtifacts();
 const outputs=[['./extensions/whitespace-data.mjs',artifacts.javascript],['./source-profiles/whitespace-iterators/white-space.meta.json',artifacts.metaJson]];
 if(writer)writer.preflight(outputs.map(([path])=>'tools/translation/'+path.slice(2)));
 for(const [path,expected]of outputs){
  const target=new URL(path,import.meta.url);
  if(check){if(readFileSync(target,'utf8')!==expected)throw new TypeError('Generated whitespace artifact differs from its original source lift: '+path);}
  else writer.write('tools/translation/'+path.slice(2),expected);
 }
 return artifacts;
}
const artifacts=check?produce(null):withProtectedSpecialCliWriter(ROOT,produce);
console.log(JSON.stringify({mode:check?'check':'write',sourceInputs:artifacts.meta.sourceInputs.length,scalarCodes:artifacts.codes.length,namespaceAuthority:false,runtimeAuthority:false,rustBuilds:0}));
