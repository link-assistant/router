import test from 'node:test';
import assert from 'node:assert/strict';
import {constants as osConstants} from 'node:os';
import {std_fs_remove_file,tokio_fs_remove_file} from '../extensions/effects-runtime.mjs';
const error=code=>Object.assign(new Error(`fixture ${code}`),{code});
const capability=code=>({fs:{sync:{unlinkSync(){throw error(code);}},async:{unlink:async()=>{throw error(code);}}}});
test('Unix OS categories follow pinned Rust mappings and preserve uncategorized errno rather than invented variants',async()=>{
  const cases=[['ENOENT','NotFound'],['EACCES','PermissionDenied'],['EPERM','PermissionDenied'],['EIO','Uncategorized'],['EMFILE','Uncategorized'],['ENFILE','Uncategorized'],['EBADF','Uncategorized'],['ENOSPC','StorageFull'],['EFBIG','FileTooLarge'],['EPIPE','BrokenPipe'],['ENOMEM','OutOfMemory'],['ENAMETOOLONG','InvalidFilename'],['EOPNOTSUPP','Unsupported']];
  for(const [code,kind] of cases) {
    const injected=capability(code);
    for(const operation of [std_fs_remove_file,tokio_fs_remove_file]) {
      const result=await operation('source-derived-error',injected);assert.equal(result.$,'Err');assert.equal(result.field0.kind,kind,code);
      const expected=process.platform !== 'win32' && Number.isInteger(osConstants.errno?.[code])?{$:'Some',field0:BigInt(osConstants.errno[code])}:{$:'None'};
      assert.deepEqual(result.field0.raw_os_error,expected,code);
    }
  }
});
test('numeric errno aliases preserve target-specific Rust classification and unknown errors stay uncategorized',()=>{
  const expected=process.platform === 'win32'?'Uncategorized':osConstants.errno?.ENOTSUP === osConstants.errno?.EOPNOTSUPP?'Unsupported':'Uncategorized';
  assert.equal(std_fs_remove_file('fixture',capability('ENOTSUP')).field0.kind,expected);
  for(const code of ['EUNKNOWN','UNKNOWN'])assert.equal(std_fs_remove_file('fixture',capability(code)).field0.kind,'Uncategorized');
  if(process.platform !== 'win32' && Number.isInteger(osConstants.errno?.ENOENT)) {
    const custom={fs:{sync:{unlinkSync(){throw Object.assign(error('EUNKNOWN'),{errno:-osConstants.errno.ENOENT});}}}};
    assert.equal(std_fs_remove_file('fixture',custom).field0.kind,'NotFound');
  }
});
