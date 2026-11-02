// Actual full committed source-bank transport case. UNRUN; no Rust execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,realpathSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {exportProvenanceTranslatorBundle} from '../export-provenance-20261102.mjs';
import {readCompactSourceVaultDirectory} from '../compact-source-vault-store-20261102.mjs';
import {withCompactSourceVault} from '../compact-source-vault-20261102.mjs';
import {TRANSLATION_PROVENANCE_PATH,withTranslationProvenanceData} from '../translation-provenance-20261102.mjs';
const root=fileURLToPath(new URL('../../../',import.meta.url));
test('whole actual compact compiler bank retains every declared copied source and complete notice',{timeout:60000,concurrency:false},t=>{
 const temporary=realpathSync(mkdtempSync(join(tmpdir(),'router-provenance-export-')));t.after(()=>rmSync(temporary,{recursive:true,force:true}));const output=join(temporary,'bank'),result=exportProvenanceTranslatorBundle({sourceRoot:root,output,storage:'compact'});
 assert.equal(result.completeReceivingClosure,false);assert.equal(result.typescriptDependencyIncluded,false);assert.equal(result.provenance.declaredOriginalBytesCompared,true);assert.equal(result.provenance.compilerQualified,false);assert.equal(result.provenance.runtimeParity,false);
 const restored=readCompactSourceVaultDirectory(output);withCompactSourceVault(restored,lease=>{const catalogue=JSON.parse(lease.read(TRANSLATION_PROVENANCE_PATH).toString('utf8'));withTranslationProvenanceData(catalogue,view=>{const expected=new Set(view.files()),paths=restored.metadata.files.map(row=>row.path).filter(name=>expected.has(name)||name.startsWith('tools/translation/vendor/')||name.startsWith('tools/translation/js-to-rust/vendor/'));view.paths(paths);for(const name of expected)view.bytes(name,lease.read(name));});});
});
test('storage and path protocol is closed before exporting any source',{timeout:60000},()=>{
 for(const storage of ['caller-exporter','unknown',''])assert.throws(()=>exportProvenanceTranslatorBundle({sourceRoot:root,output:'/not-used',storage}),/closed storage/u);assert.throws(()=>exportProvenanceTranslatorBundle({sourceRoot:root}),/explicit source\/output/u);
});
