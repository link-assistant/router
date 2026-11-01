// Real fixed-old-producer migration case SOURCE ONLY / UNRUN. No live source writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {replayKnownOriginalProducer,originalProducerReplayData} from '../layout-ownership-bulk-20261101-replay.mjs';
import {regenerateNativeTypeScript} from '../js-to-rust/native-typescript.mjs';
const SOURCE=fileURLToPath(new URL('../../../',import.meta.url));
test('complete fixed original cohort migrates legacy targets only after exact isolated replay',{timeout:300000},t=>{
 const directory=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-old-owned-migration-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
 const token=replayKnownOriginalProducer({root:SOURCE,producer:'native-typescript',dependencyArchive:process.env.ROUTER_ORIGINAL_TYPESCRIPT_ARCHIVE}),legacy=originalProducerReplayData(token,'native-typescript',SOURCE);assert.throws(()=>originalProducerReplayData(token,'native-typescript',SOURCE),/genuine freshly/u);
 for(const [path,row]of legacy){fs.mkdirSync(dirname(join(directory,path)),{recursive:true});fs.writeFileSync(join(directory,path),row.source,{mode:row.mode});}const oldPackage=fs.readFileSync(join(directory,'ts/package.json'),'utf8');assert.equal(JSON.parse(oldPackage).files,undefined);fs.writeFileSync(join(directory,'ts/src/authored-neighbor.ts'),'export const authored="keep";\n');
 const result=regenerateNativeTypeScript(directory,{sourceRoot:SOURCE});assert.ok(result.changed.includes('ts/package.json'));const current=JSON.parse(fs.readFileSync(join(directory,'ts/package.json'),'utf8'));assert.deepEqual(current.files,['dist']);assert.equal(current.bin['router-native'],'dist/src/cli.js');assert.match(current.scripts.build,/--root \.\. --source-root \.\./u);assert.equal(fs.readFileSync(join(directory,'ts/src/authored-neighbor.ts'),'utf8'),'export const authored="keep";\n');
 const ledger=fs.readFileSync(join(directory,'tools/translation/js-to-rust/generated/native-typescript/ownership-20261101.json'),'utf8'),target=join(directory,'ts/src/core.ts'),before=fs.readFileSync(target,'utf8');fs.writeFileSync(target,before+'\n// independent authored modification\n');assert.throws(()=>regenerateNativeTypeScript(directory,{sourceRoot:SOURCE}),/edited|authored/u);assert.equal(fs.readFileSync(target,'utf8'),before+'\n// independent authored modification\n');assert.equal(fs.readFileSync(join(directory,'tools/translation/js-to-rust/generated/native-typescript/ownership-20261101.json'),'utf8'),ledger);
});
test('offline archive corruption refuses before legacy target mutation',{timeout:60000},t=>{
 const directory=fs.realpathSync(fs.mkdtempSync(join(tmpdir(),'router-old-corrupt-')));t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));const archive=join(directory,'corrupt.tgz');fs.writeFileSync(archive,'not the locked original registry package');assert.throws(()=>replayKnownOriginalProducer({root:SOURCE,producer:'native-typescript',dependencyArchive:archive}),/offline original TypeScript tarball differs/u);assert.equal(fs.readFileSync(archive,'utf8'),'not the locked original registry package');
});
