// Finite diagnostic, not the original test or a deadline qualification.
import {performance} from 'node:perf_hooks';
import {prepareCoreAsciiSources,prepareCurrentCoreAsciiSources,composeCoreAscii} from '../../tools/translation/prepare-core-ascii-sources.mjs';
import {transportConcreteSyntaxMeta} from '../../tools/translation/concrete-syntax-meta.mjs';
import {assertUnitMatchesSourceComposition} from '../../tools/translation/test/unit-matches-source-composition.mjs';
import {assertCurrentCoreUnicodeSourceComposition} from '../../tools/translation/test/current-unit-unicode-source-composition.mjs';
const begin=performance.now();let last=begin;
const mark=stage=>{const now=performance.now();console.log(JSON.stringify({stage,elapsedMs:now-begin,stageMs:now-last}));last=now;};
const plan=prepareCoreAsciiSources();mark('complete-birth');
const current=prepareCurrentCoreAsciiSources(),finalSources=Object.fromEntries(current.files.map(row=>[row.path,row]));mark('complete-current');
for(const row of plan.files){
 transportConcreteSyntaxMeta(row.beforeMeta);transportConcreteSyntaxMeta(row.afterMeta);
 for(const stage of row.stages){transportConcreteSyntaxMeta(stage.beforeMeta);transportConcreteSyntaxMeta(stage.afterMeta);}
}
mark('all-birth-metadata-receiving');
const prior=Object.fromEntries(plan.files.map(row=>[row.path,{after:row.before}]));composeCoreAscii(prior);mark('complete-composition');
const host=plan.files.find(row=>row.path.endsWith('/host-contracts.mjs'));
try{composeCoreAscii({...prior,[host.path]:{after:host.before+' '}});throw Error('unknown parent accepted');}catch(error){if(!/preceding complete source/.test(error.message))throw error;}
mark('unknown-parent-refusal');
assertUnitMatchesSourceComposition(current.layers[1],Object.fromEntries(plan.files.map(row=>[row.path,row])),finalSources);mark('all-unit-receiving');
assertCurrentCoreUnicodeSourceComposition(current.layers[2],Object.fromEntries(current.layers.slice(0,2).flatMap(layer=>layer.files.map(row=>[row.path,row]))),finalSources);mark('all-unicode-receiving');
