// Actual offline pack/install/exports/bin/runtime case SOURCE ONLY. UNRUN.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {exportPartitionedTranslatorBundle} from '../partitioned-export-bundle.mjs';
const SOURCE=fileURLToPath(new URL('../../../',import.meta.url));
test('copied receiving roots produce real packed JS and TS exports CLI and runtime closure without aliases',{timeout:300000},t=>{
 const directory=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-real-packed-layout-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const receiving=join(directory,'receiving'),pack=join(directory,'packs');fs.mkdirSync(pack);exportPartitionedTranslatorBundle({sourceRoot:SOURCE,output:receiving});
 const put=(name,text)=>{fs.mkdirSync(dirname(join(receiving,name)),{recursive:true});fs.writeFileSync(join(receiving,name),text);};
 for(const name of ['Cargo.toml','Cargo.lock','rust/Cargo.toml'])put(name,fs.readFileSync(join(SOURCE,name)));
 put('rust/src/lib.rs','pub fn next(value:u64)->u64{value+1_u64}\n');
 put('js/package.json',JSON.stringify({name:'receiving-layout-native',version:'1.0.0',type:'module',exports:{'.':'./index.js','./native':'./src/index.mjs'},bin:{'router-native':'src/cli.mjs'},files:['index.js','testing.js','src','runtime'],dependencies:{},devDependencies:{}}));
 put('js/index.js','export {next} from "./src/index.mjs";\n');put('js/testing.js','export const testMarker=true;\n');put('js/catalog.json','{}\n');put('js/schemas/value.json','{"type":"integer"}\n');put('js/src/cli.mjs','#!/usr/bin/env node\nimport {next} from "./index.mjs";console.log(String(next(6n)));\n');fs.chmodSync(join(receiving,'js/src/cli.mjs'),0o755);
 put('unit.json',JSON.stringify({schema:'router-forward-project-unit-v1',id:'copied-pack',entry:'rust/src/lib.rs',authority:'Rust',javascript:'js/src/index.mjs',typescript:'ts/src/index.mts',meta:'translation/project.json',inverse:'literals'}));
 const require=createRequire(join(SOURCE,'js/package.json')),typescript=dirname(require.resolve('typescript/package.json'));fs.mkdirSync(join(receiving,'js/node_modules'),{recursive:true});fs.cpSync(typescript,join(receiving,'js/node_modules/typescript'),{recursive:true});
 const env={...process.env,ROUTER_NATIVE_TS_SOURCE_ROOT:receiving};delete env.NODE_OPTIONS;delete env.NODE_PATH;delete env.NODE_TEST_CONTEXT;
 const git=args=>execFileSync('git',['-C',receiving,'-c','core.hooksPath=/dev/null','-c','gc.auto=0','-c','user.name=Copied package fixture','-c','user.email=fixture@example.invalid',...args],{env,encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});put('.git/info/exclude','node_modules/\n');git(['add','.']);git(['commit','--quiet','-m','Independent physical receiving project']);
 const runner='import {planForwardProjectUnitSynchronization,applyForwardProjectUnitSynchronization} from "./tools/translation/forward-project-unit-synchronization.mjs";const options={root:process.cwd(),manifestPath:"unit.json"};applyForwardProjectUnitSynchronization(JSON.stringify(planForwardProjectUnitSynchronization(options)),options);';put('plan-receiving.mjs',runner);execFileSync(process.execPath,[join(receiving,'plan-receiving.mjs')],{cwd:receiving,env,timeout:120000,maxBuffer:8*1024*1024});
 put('ts/src/index.ts','// independently authored copied target\n');assert.throws(()=>execFileSync(process.execPath,[join(receiving,'scripts/regenerate-native-typescript.mjs'),'--root',receiving,'--source-root',receiving],{cwd:directory,env,timeout:120000,maxBuffer:8*1024*1024}));assert.equal(fs.readFileSync(join(receiving,'ts/src/index.ts'),'utf8'),'// independently authored copied target\n');fs.unlinkSync(join(receiving,'ts/src/index.ts'));
 execFileSync(process.execPath,[join(receiving,'scripts/regenerate-native-typescript.mjs'),'--root',receiving,'--source-root',receiving],{cwd:directory,env,timeout:120000,maxBuffer:8*1024*1024});execFileSync(process.execPath,[join(receiving,'scripts/check-native-typescript.mjs'),'--root',receiving,'--source-root',receiving,'--out-dir','ts/dist'],{cwd:directory,env,timeout:120000,maxBuffer:8*1024*1024});
 assert.ok(fs.readdirSync(join(receiving,'js/runtime')).length>0);assert.ok(fs.readdirSync(join(receiving,'ts/runtime')).some(name=>name.endsWith('.ts')));assert.ok(fs.readdirSync(join(receiving,'ts/dist/runtime')).some(name=>name.endsWith('.js')));
 for(const [language,name]of [['js','receiving-layout-native'],['ts','@link-assistant/router-typescript-draft']]){
  const packed=JSON.parse(execFileSync('npm',['pack','--ignore-scripts','--json','--pack-destination',pack],{cwd:join(receiving,language),env,encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024}));assert.equal(packed.length,1);const names=packed[0].files.map(row=>row.path);assert.ok(names.some(path=>path.startsWith(language==='js'?'runtime/':'dist/runtime/')));assert.ok(names.includes(language==='js'?'src/cli.mjs':'dist/src/cli.js'));
  const consumer=join(directory,'consumer-'+language);fs.mkdirSync(consumer);fs.writeFileSync(join(consumer,'package.json'),'{"private":true,"type":"module"}\n');execFileSync('npm',['install','--offline','--ignore-scripts','--no-audit','--no-fund',join(pack,packed[0].filename)],{cwd:consumer,env,timeout:60000,maxBuffer:8*1024*1024});
  const inspect='import assert from "node:assert/strict";const root=await import('+JSON.stringify(name)+'),native=await import('+JSON.stringify(name+'/native')+');assert.equal(root.next(7n),8n);assert.equal(native.next(7n),8n);';execFileSync(process.execPath,['--input-type=module','--eval',inspect],{cwd:consumer,env:{...env,ROUTER_NATIVE_TS_SOURCE_ROOT:consumer},timeout:20000,maxBuffer:1024*1024});const bin=join(consumer,'node_modules/.bin/router-native');assert.equal(execFileSync(bin,[],{cwd:consumer,env,encoding:'utf8',timeout:20000,maxBuffer:1024*1024}).trim(),'7');
 }
 // No fixture-created .mjs aliases or links to the original checkout exist.
 assert.equal(fs.lstatSync(join(receiving,'js/node_modules/typescript')).isSymbolicLink(),false);assert.equal(fs.existsSync(join(receiving,'ts/node_modules')),false);
});
