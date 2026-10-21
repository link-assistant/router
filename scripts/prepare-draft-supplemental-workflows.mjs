#!/usr/bin/env node
// Fixed eighteen source substitutions only; source proof is not CI success.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {readFixedNineDraftWorkflowSources,DRAFT_SUPPLEMENTS} from './fixed-nine-draft-policy.mjs';
const require=createRequire(new URL('./ci/package.json',import.meta.url)),{parseDocument,Parser,CST}=require('yaml'),ROOT=fileURLToPath(new URL('../',import.meta.url));
const fail=message=>{throw TypeError('Fixed-nine workflow proposal: '+message);};
function grammar(source){const document=parseDocument(source,{version:'1.2',uniqueKeys:true,keepSourceTokens:true});if(document.errors.length)fail('complete native YAML grammar differs');return document;}
function concrete(source){
 if(typeof source!=='string'||source.length>524288)fail('bounded complete YAML source required');const tokens=[...new Parser().parse(source)],meta=JSON.stringify({schema:'fixed-nine-native-yaml-CST-v1',source,tokens});if(meta.length>4194304)fail('complete YAML CST budget');const parsed=JSON.parse(meta);if(parsed.schema!=='fixed-nine-native-yaml-CST-v1'||parsed.source!==source||parsed.tokens.map(token=>CST.stringify(token)).join('')!==source)fail('serialized/reparsed native YAML CST source differs');grammar(source);return {source,meta};
}
function keySpan(source,rule){
 const document=grammar(source),parent=rule.id==='github-pr-events:default-three-plus-ready'?document.getIn(['on'],true):rule.id==='fixed-supplemental-draft-phase:caller-only'?document.getIn(['jobs'],true):fail('unknown sealed rule'),key=rule.id==='github-pr-events:default-three-plus-ready'?'pull_request':'javascript',pairs=parent?.items?.filter(row=>row.key?.value===key)??[];
 if(pairs.length!==1||!Array.isArray(pairs[0].key.range))fail('actual unique native YAML key required');const range=pairs[0].key.range,start=range[0]-2;if(start<0||source.slice(start,start+rule.before.length)!==rule.before||source.split(rule.before).length!==2)fail('native key and complete sealed literal differ');return {span:[start,start+rule.before.length],nativeKeySpan:[range[0],range[1]],key};
}
function phase(source,rule,phaseName){
 const first=concrete(source),selected=keySpan(first.source,rule),[start,end]=selected.span,after=source.slice(0,start)+rule.after+source.slice(end),last=concrete(after),inverse={span:[start,start+rule.after.length],expected:rule.after,replacement:rule.before};
 if(after.slice(...inverse.span)!==inverse.expected)fail('actual whole inverse span differs');const restored=after.slice(0,inverse.span[0])+inverse.replacement+after.slice(inverse.span[1]);if(restored!==source||concrete(restored).meta!==first.meta)fail('complete canonical phase inverse differs');return {phase:phaseName,rule:rule.id,before:source,after,beforeMeta:first.meta,afterMeta:last.meta,nativeSelection:selected,inverse,completeInverse:true};
}
export function prepareDraftSupplementalWorkflows({root=ROOT}={}){
 root=path.resolve(root);const packet=readFixedNineDraftWorkflowSources({root}),files=[];
 for(const row of packet.files){const current=fs.readFileSync(path.resolve(root,row.path),'utf8'),expected=row.after??row.before;if(current!==row.before&&current!==expected)fail('physical workflow differs from exact reviewed before/after: '+row.path);const rules=packet.rules.filter(rule=>rule.path===row.path),changed=DRAFT_SUPPLEMENTS.includes(path.basename(row.path));if(rules.length!==(changed?2:0))fail('fixed-nine complete rule census differs');
  const stages=[];let after=row.before;if(changed){for(const [index,rule]of rules.entries()){const stage=phase(after,rule,index===0?'language':'repository');stages.push(stage);after=stage.after;}}if(after!==expected)fail('full sealed afterimage differs');let inverse=after;for(const stage of [...stages].reverse()){if(inverse.slice(...stage.inverse.span)!==stage.inverse.expected)fail('full reverse-ordered inverse differs');inverse=inverse.slice(0,stage.inverse.span[0])+stage.inverse.replacement+inverse.slice(stage.inverse.span[1]);}if(inverse!==row.before)fail('full workflow inverse differs');files.push({path:row.path,before:row.before,after,current,changed,stages,inverse});
 }
 readFixedNineDraftWorkflowSources({root});for(const row of files)if(fs.readFileSync(path.resolve(root,row.path),'utf8')!==row.current)fail('full physical workflow changed');return {schema:'fixed-nine-draft-supplemental-workflow-proposal-v1',publishedSource:packet.publishedSource,files,draftOnly:true,sourceAuthority:false,gateSuccessObserved:false,readyTransitionObserved:false,branchRulesFresh:false};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const args=process.argv.slice(2);if(args.length!==1||!['--emit','--check','--write'].includes(args[0]))fail('use --emit|--check|--write');const proposal=prepareDraftSupplementalWorkflows();if(args[0]==='--check'&&proposal.files.some(row=>row.current!==row.after))fail('candidate workflow source differs');if(args[0]==='--write'){for(const row of proposal.files)if(fs.readFileSync(path.resolve(ROOT,row.path),'utf8')!==row.current)fail('complete source changed before write');for(const row of proposal.files)if(row.changed)fs.writeFileSync(path.resolve(ROOT,row.path),row.after);for(const row of proposal.files)if(fs.readFileSync(path.resolve(ROOT,row.path),'utf8')!==row.after)fail('complete source write/readback differs');}const wire=JSON.stringify(args[0]==='--emit'?proposal:{schema:proposal.schema,changed:proposal.files.filter(row=>row.changed).map(row=>row.path),gateSuccessObserved:false,readyTransitionObserved:false,branchRulesFresh:false});readFixedNineDraftWorkflowSources();for(const row of proposal.files)if(fs.readFileSync(path.resolve(ROOT,row.path),'utf8')!==(args[0]==='--write'?row.after:row.current))fail('complete source changed around serialization');console.log(wire);
}
