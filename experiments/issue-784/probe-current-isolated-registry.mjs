// Uninstalled complete current-source proposal; the frozen registry stays exact.
import {mkdtempSync,readFileSync,writeFileSync,readdirSync,rmSync,realpathSync,statSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {prepareIsolatedProjectCompiler} from '../../tools/translation/prepare-isolated-project-compiler.mjs';
import {transportConcreteSourcePhases} from '../../tools/translation/concrete-phased-equations.mjs';
const label=process.argv[2]??'current-isolated';
if(process.argv.length>3||!/^[-a-z0-9]{1,64}$/.test(label))throw Error('Use one finite evidence label');
const root=resolve('.'),revision=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const hash=value=>createHash('sha256').update(value).digest('hex');
const profile='tools/translation/source-profiles/isolated-project-compiler/manifest.json.gz';
const originalRegistry=readFileSync(profile),temporary=mkdtempSync(join(tmpdir(),'router-784-current-isolated-'));
try{
 const output=join(temporary,'proposal'),receipt=prepareIsolatedProjectCompiler({root,revision,output});
 const names=readdirSync(output).sort();
 if(JSON.stringify(names)!==JSON.stringify(['driver-before.mjs','isolated-project-batch.mjs','isolated-project-driver.mjs','manifest.json','manifest.json.gz','parent-before.mjs','proposal.json']))throw Error('Complete original proposal output census differs');
 const files=names.map(path=>{const bytes=readFileSync(join(output,path));return {path,base64:bytes.toString('base64'),bytes:bytes.length,sha256:hash(bytes)};});
 const get=path=>Buffer.from(files.find(row=>row.path===path).base64,'base64');
 if(!gunzipSync(get('manifest.json.gz'),{maxOutputLength:1048576}).equals(get('manifest.json')))throw Error('Complete current registry transport differs');
 const registry=JSON.parse(get('manifest.json').toString('utf8'));
 const tsRoot=realpathSync(join(root,'js/node_modules/typescript'));
 const inputs=registry.sources.map(row=>{
  const path=row.origin==='typescript'?join(tsRoot,row.path.slice('js/node_modules/typescript/'.length)):join(root,row.path);
  const bytes=readFileSync(path),state=statSync(path),sha256=hash(bytes),mode=state.mode&0o111?'100755':'100644';
  if(bytes.length!==row.bytes||sha256!==row.sha256||mode!==row.mode)throw Error('Current source differs from actual captured Git/TypeScript bytes: '+row.path);
  return {path,row,sha256};
 });
 const equations=transportConcreteSourcePhases([
  ['driver-before.mjs','isolated-project-driver.mjs'],['parent-before.mjs','isolated-project-batch.mjs'],
 ].map(([before,after])=>({before:get(before).toString('utf8'),middle:get(before).toString('utf8'),after:get(after).toString('utf8'),language:'JavaScript'})));
 for(const input of inputs)if(hash(readFileSync(input.path))!==input.sha256)throw Error('Complete current input changed at final source boundary');
 if(!readFileSync(profile).equals(originalRegistry))throw Error('Original frozen registry changed');
 const result={schema:'complete-current-isolated-registry-proposal-v1',revision,receipt,files,equations,
  originalRegistrySha256:hash(originalRegistry),allCapturedInputsCurrent:true,originalRegistryUnchanged:true,
  installed:false,productionExecutableGain:0,semanticAuthority:false,runtimeParity:false};
 const raw=Buffer.from(JSON.stringify(result));if(raw.length>32*1024*1024)throw Error('Finite complete proposal evidence bound');
 const target='ci-logs/issue-784-restart-2/'+label+'-registry-proposal.json.gz';
 writeFileSync(target,gzipSync(raw),{flag:'wx'});
 if(!gunzipSync(readFileSync(target),{maxOutputLength:32*1024*1024}).equals(raw))throw Error('Complete current registry proposal readback differs');
 console.log(JSON.stringify({target,bytes:raw.length,sha256:hash(raw),revision,files:registry.files,
  totalSourceBytes:registry.totalBytes,originalRegistryUnchanged:true,installed:false}));
}finally{rmSync(temporary,{recursive:true,force:false});}
