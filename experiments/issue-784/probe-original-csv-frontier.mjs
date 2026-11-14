// Bounded diagnostic: complete historical parents in separate one-file graphs.
// These graphs cannot qualify the original complete library/Cargo/profile test.
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {gzipSync} from 'node:zlib';
import {associatedOriginalInputs,associatedOriginalDependencyInputs} from '../../tools/translation/test/associated-original-context.mjs';
import {loadDeriveDependencyProof} from '../../tools/translation/derive-dependencies.mjs';
import {translateProject,translateProjectOwnedDefinitions} from '../../tools/translation/project.mjs';

const choices=new Map([
 ['config',['src/config.rs',['parse_csv','parse_usize_csv']]],
 ['associative',['src/storage/associative.rs',['split_repository_list']]],
]);
const [choice,output,mode='ordinary',...extra]=process.argv.slice(2);
if(!choices.has(choice)||!output?.startsWith('ci-logs/issue-784-restart-2/')||!['ordinary','owned'].includes(mode)||extra.length)throw new TypeError('Select config|associative, one fresh investigation output and ordinary|owned');
const [entry,names]=choices.get(choice),context=associatedOriginalInputs('csv-original-source.test.mjs');
const source=context.source(entry),{manifest,lock}=associatedOriginalDependencyInputs(context);
if(Buffer.byteLength(source)>1_000_000)throw new TypeError('Complete parent exceeds the finite probe bound');
const start=performance.now();
const translate=mode==='owned'?translateProjectOwnedDefinitions:translateProject;
const result=translate({entry,paths:[entry],readSource:path=>{
 if(path!==entry)throw new TypeError('Single-parent diagnostic cannot admit another source');
 return source;
},cargoManifest:manifest,compilationProfile:context.inputs.compilationProfile,
 deriveDependencies:loadDeriveDependencyProof({manifest,lock}),
 progress:event=>console.log('PROGRESS '+JSON.stringify(event)),
});
const record={scope:'Complete original parent, one-file graph only; no complete-library qualification.',
 entry,mode,sourceBytes:Buffer.byteLength(source),sourceSha256:createHash('sha256').update(source).digest('hex'),
 elapsedMs:performance.now()-start,meta:result.meta,javascript:result.javascript,typescript:result.typescript};
const raw=Buffer.from(JSON.stringify(record));
if(raw.length>32*1024*1024)throw new TypeError('Complete diagnostic output exceeds the finite bound');
writeFileSync(output,gzipSync(raw),{flag:'wx'});
const relevant=row=>names.some(name=>row.name?.split('.').at(-1)===name);
console.log(JSON.stringify({...record,meta:undefined,javascript:undefined,typescript:undefined,
 executable:result.executableDeclarations.filter(relevant).map(row=>({name:row.name,span:row.span})),
 refused:result.meta.refused.filter(relevant),completeOutputBytes:raw.length}));
