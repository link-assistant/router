// Development source DATA. Every descriptor field and access stays observable.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {fileURLToPath} from 'node:url';
import {transportConcreteSourcePhases} from './concrete-source-origin-equations.mjs';
import {ownershipCompiler} from './js-to-rust/vendor/module-syntax.mjs';
const pin='e782e1f4dd9bd5934ed22a51b11fe0d264a68223380e747085781149edb645a6';
const original="function ownershipRuntimeSame(a,b){const o=ownershipRuntimeOps;if(!a||!b)return a===b;const names=['value','get','set','writable','enumerable','configurable'];for(let at=0;at<names.length;at++){const key=names[at];if(o.own(a,key)!==o.own(b,key)||o.own(a,key)&&a[key]!==b[key])return false;}return true;}";
export function proposeRuntimeLoaderComparison(ts,path,before){
 const fail=message=>{throw TypeError('Runtime loader comparison source: '+message);};
 if(ts.version!=='5.9.3'||path!=='tools/translation/js-to-rust/vendor/module-syntax.mjs'||typeof before!=='string')fail('actual compiler and complete source required');
 if(createHash('sha256').update(before).digest('hex')!==pin)fail('complete original source differs');
 const parse=source=>{const file=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);if(file.parseDiagnostics.length)fail('complete native grammar differs');return file;};
 const file=parse(before),rows=file.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='ownershipRuntimeSame');
 if(rows.length!==1||rows[0].getText(file)!==original)fail('complete native descriptor comparison differs');
 const fields=['value','get','set','writable','enumerable','configurable'];
 const replacement="function ownershipRuntimeSame(a,b){const o=ownershipRuntimeOps;if(!a||!b)return a===b;"
  +fields.map(key=>`if(o.own(a,'${key}')!==o.own(b,'${key}')||o.own(a,'${key}')&&a.${key}!==b.${key})return false;`).join('')
  +'return true;}';
 const start=rows[0].getStart(file),end=rows[0].end,after=before.slice(0,start)+replacement+before.slice(end);
 if(createHash('sha256').update(after).digest('hex')!=='5587f9b51453bd4fd13a7a1383d96a96d19d7bf55bf46a66f5ed21b916172d36')fail('complete candidate source differs');
 parse(after);
 const inverse=after.slice(0,start)+original+after.slice(start+replacement.length);
 if(inverse!==before)fail('complete native inverse differs');
 const [equation]=transportConcreteSourcePhases([{before,middle:after,after,language:'JavaScript'}]);
 if(equation.inverse!==before)fail('complete concrete inverse differs');
 return {schema:'runtime-loader-descriptor-comparison-source-v1',path,before,after,inverse,equation,
  nativeSelection:{span:[start,end],expected:original,replacement},fields,
  originalOwnCallsAndFieldReadsPreserved:true,retainedVerdicts:false,semanticAuthority:false,runtimeParity:false};
}
export function prepareRuntimeLoaderComparison(){
 const before=gunzipSync(readFileSync(new URL('source-profiles/runtime-loader-comparison/original.mjs.gz',import.meta.url)),{maxOutputLength:65536}).toString('utf8');
 const path='tools/translation/js-to-rust/vendor/module-syntax.mjs',plan=proposeRuntimeLoaderComparison(ownershipCompiler(),path,before);
 const current=readFileSync(new URL(path,new URL('../../',import.meta.url)),'utf8');
 if(current!==before&&current!==plan.after)throw TypeError('Runtime loader comparison source: unknown complete physical source');
 return {...plan,current};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const mode=process.argv.slice(2).join(' ');if(!['--emit','--write','--check'].includes(mode))throw TypeError('Use --emit|--write|--check');
 const plan=prepareRuntimeLoaderComparison();
 if(mode==='--emit')console.log(JSON.stringify(plan));
 else if(mode==='--write')writeFileSync(new URL(plan.path,new URL('../../',import.meta.url)),plan.after);
 else if(plan.current!==plan.after)throw TypeError('Runtime loader comparison source: complete output is stale');
 if(mode!=='--emit')console.log(JSON.stringify({mode,path:plan.path,semanticAuthority:false}));
}
