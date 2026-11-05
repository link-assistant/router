// Fixed actual core CLI sink. Operational source-ownership veto, never authority.
import {writeFileSync} from 'node:fs';
import {withProtectedPreparerWriter,allowContainedPreparerSourceWrites,writeContainedPreparerSource} from './protected-preparer-writers-20261102.mjs';
import {withProtectedNativeSourceAdmission} from './protected-native-writers-20261102.mjs';
// Only CLI --write calls this operation. Read-only original producer APIs do not.
// Original stale callback runs over every row before any mutation or alias write.
export function writeProtectedCoreCliPlan(root,produce,stale){
 return withProtectedPreparerWriter(root,()=>{
  const plan=withProtectedNativeSourceAdmission(root,produce);
  withProtectedNativeSourceAdmission(root,()=>stale(plan));
  const rows=withProtectedNativeSourceAdmission(root,()=>plan.files.map(row=>({path:row.path,before:row.current,after:row.currentAfter})));
  allowContainedPreparerSourceWrites(root,rows);
  for(const row of rows)writeContainedPreparerSource(root,row,target=>writeFileSync(target,row.after));
  return plan;
 });
}
