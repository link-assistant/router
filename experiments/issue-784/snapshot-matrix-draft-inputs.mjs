// Whole current physical input DATA only; no output plan or private permit.
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {discoverCompilerSourceInputs} from '../../tools/translation/compiler-source-inputs.mjs';
import {discoverSourceProfileInputs} from '../../tools/translation/source-profile-inputs.mjs';
import {captureSourceCorpus} from '../../tools/translation/source-corpus.mjs';
import {repositoryRustLayout} from '../../tools/translation/repository-layout.mjs';
import {createCompilationMatrix,compilationMatrixDescription,DECLARED_FAMILY_PROFILES} from '../../tools/translation/compilation-matrix.mjs';
const root=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const tracked=execFileSync('git',['ls-files','-z','--','*.rs'],{cwd:root,encoding:'utf8',maxBuffer:8*1024*1024}).split('\0').filter(Boolean).sort();
const matrix=createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES});
console.log(JSON.stringify({tracked,entries:repositoryRustLayout(root).entries.filter(path=>tracked.includes(path)).sort(),compiler:discoverCompilerSourceInputs({root}),profiles:discoverSourceProfileInputs({root}),corpus:captureSourceCorpus({root,paths:tracked}),matrix:compilationMatrixDescription(matrix),matrixSha256:matrix.sha256,semanticAuthority:false,runtimeParity:false,rustExecuted:false}));
