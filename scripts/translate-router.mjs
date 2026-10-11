#!/usr/bin/env node
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { regenerate } from '../tools/translation/bulk.mjs';
import {regenerateCompilationMatrix} from '../tools/translation/matrix-bulk.mjs';
import {createCompilationMatrix,DECLARED_FAMILY_PROFILES} from '../tools/translation/compilation-matrix.mjs';

const args = process.argv.slice(2);
let root = resolve(dirname(fileURLToPath(import.meta.url)), '..'), check = false,profileMatrix=false;
const entries = [];
for (let index = 0; index < args.length; index++) {
  const argument = args[index];
  if (argument === '--check') check = true;
  else if(argument==='--profile-matrix')profileMatrix=true;
  else if (['--root', '--entry'].includes(argument) && args[index + 1] && !args[index + 1].startsWith('--')) {
    const value = args[++index];
    if (argument === '--root') root = resolve(value); else entries.push(value);
  } else throw new Error('Usage: node scripts/translate-router.mjs [--check] [--profile-matrix] [--root REPOSITORY] [--entry TRACKED_RS]');
}
const options={root,check,entries:entries.length?entries:undefined};
const { manifest, failures } = profileMatrix?regenerateCompilationMatrix({...options,matrix:createCompilationMatrix({profiles:DECLARED_FAMILY_PROFILES})}):regenerate(options);
console.log(JSON.stringify(profileMatrix?{kind:manifest.schema,matrixSha256:manifest.matrixSha256,sourceSetSha256:manifest.sourceSetSha256,profiles:manifest.profiles.map(member=>({name:member.name,profileSha256:member.profileSha256,totals:member.totals,projects:member.projects})),platformDomainComplete:false,commonExecutableOutput:false,runtimeParity:false,mode:check?'check':'write'}:{ ...manifest.totals, projects: manifest.projects, runtimeParity: false, mode: check ? 'check' : 'write' }));
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
}
