// Fixed compilerFiles/currentAfter??after CLI sink. Operational veto, no proof.
import {writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {withProtectedNativeWriter,withProtectedNativeSourceAdmission,allowProtectedNativeAbsoluteDirectWrites,mutateProtectedNativeAbsoluteDirectWriter} from './protected-native-writers-20261102.mjs';
export function writeProtectedOwnedVectorCliPlan(root,produce){return withProtectedNativeWriter(root,()=>{
 const plan=withProtectedNativeSourceAdmission(root,produce),rows=withProtectedNativeSourceAdmission(root,()=>{const rows=[];for(const row of plan.compilerFiles){const path=row.path,target=resolve(root,path),after=row.currentAfter??row.after;rows.push({target,after});}return rows;});
 let batch=[],bytes=0;const flush=()=>{if(batch.length){allowProtectedNativeAbsoluteDirectWrites(root,batch);batch=[];bytes=0;}};for(const row of rows){const size=3*Buffer.byteLength(row.target)+96;if(batch.length&&(batch.length===1024||bytes+size>1048576))flush();batch.push(row.target);bytes+=size;}flush();
 for(const row of rows)mutateProtectedNativeAbsoluteDirectWriter(root,[row.target],captured=>writeFileSync(captured[0].canonicalTarget,row.after));return plan;
});}
