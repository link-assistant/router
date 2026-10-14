import copy
import hashlib
import io
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from packet import PacketStore

class PacketTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix='router-complete-packet-');self.repo=Path(self.temp.name);self.case=self.repo/'docs/case-studies/issue-759';self.case.mkdir(parents=True);self.name='raw/complete.tar.xz';self.file=self.case/self.name;self.file.parent.mkdir();self.data=b'complete opaque original\x00\xff\r\n';self.members=[{'path':'original.bin','bytes':len(self.data),'sha256':hashlib.sha256(self.data).hexdigest()}];self.pack()
        self.git('init','-q');self.git('add','.');self.git('-c','core.hooksPath=/dev/null','commit','-qm','original complete packet');self.head=self.git('rev-parse','HEAD').decode().strip();self.blob=self.git('rev-parse',self.head+':docs/case-studies/issue-759/'+self.name).decode().strip();body=self.file.read_bytes();self.original=body
        self.index={'schema':'complete-packet-git-index-v1','archives':{self.name:{'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'git':{'commit':self.head,'path':'docs/case-studies/issue-759/'+self.name,'blob':self.blob}}}};self.write()
    def tearDown(self):self.temp.cleanup()
    def git(self,*args):return subprocess.check_output(['git',*args],cwd=self.repo,timeout=15,stderr=subprocess.DEVNULL,env={**os.environ,'GIT_AUTHOR_NAME':'Fixture','GIT_AUTHOR_EMAIL':'fixture@example.invalid','GIT_COMMITTER_NAME':'Fixture','GIT_COMMITTER_EMAIL':'fixture@example.invalid'})
    def pack(self,kind=None):
        with tarfile.open(self.file,'w:xz',preset=6) as tar:
            item=tarfile.TarInfo('original.bin');item.size=len(self.data);tar.addfile(item,io.BytesIO(self.data))
            if kind:
                item=tarfile.TarInfo('second' if kind!='duplicate' else 'original.bin')
                if kind=='link':item.type=tarfile.SYMTYPE;item.linkname='original.bin'
                elif kind=='hardlink':item.type=tarfile.LNKTYPE;item.linkname='original.bin'
                elif kind=='traversal':item.name='../escape'
                tar.addfile(item)
    def write(self,index=None):
        (self.case/'packet-git-index.json').write_text(json.dumps(self.index if index is None else index))
    def store(self):return PacketStore(self.case,self.repo)
    def test_full_physical_and_absent_git_recovery(self):
        for present in [True,False]:
            if not present:self.file.unlink()
            store=self.store();self.assertEqual(store.verify_members(self.name,self.members)['completeMembers'],1)
            with store.verified_archive(self.name) as stream:self.assertEqual(stream.read(),self.original)
    def test_cli_recovers_exact_archive_without_overwriting(self):
        import sys
        import packet
        receipt=self.repo/'members.json';receipt.write_text(json.dumps({'members':self.members}));target=self.repo/'recovered.tar.xz';self.file.unlink()
        command=[sys.executable,packet.__file__,'--case-root',str(self.case),'--repository-root',str(self.repo),'--packet',self.name,'--members-receipt',str(receipt),'--copy-to',str(target)]
        result=subprocess.run(command,capture_output=True,timeout=20);self.assertEqual(result.returncode,0,result.stderr);self.assertEqual(target.read_bytes(),self.original)
        result=subprocess.run(command,capture_output=True,timeout=20);self.assertNotEqual(result.returncode,0);self.assertEqual(target.read_bytes(),self.original)
    def test_physical_mutation_refuses(self):
        self.file.write_bytes(self.original+b'changed')
        with self.assertRaisesRegex(ValueError,'Physical'):self.store().verified_archive(self.name)
    def test_foreign_root_and_linked_inputs(self):
        with self.assertRaises(ValueError):PacketStore(self.case,self.case)
        original=self.file.with_name('original.xz');self.file.rename(original);self.file.symlink_to(original)
        with self.assertRaisesRegex(ValueError,'Linked'):self.store().verified_archive(self.name)
    def test_index_mutations_fail_closed(self):
        for key,value in [('bytes',1),('sha256','f'*64),('extra',True)]:
            index=copy.deepcopy(self.index);index['archives'][self.name][key]=value;self.write(index)
            with self.assertRaises(ValueError):self.store().verified_archive(self.name)
        for key,value in [('commit','f'*40),('blob','f'*40),('path','../escape')]:
            index=copy.deepcopy(self.index);index['archives'][self.name]['git'][key]=value;self.write(index)
            with self.assertRaises(ValueError):self.store().verified_archive(self.name)
    def test_receipt_mutations_and_missing_extra_targets(self):
        for rows in [[],self.members+self.members,[{**self.members[0],'sha256':'f'*64}],[{**self.members[0],'bytes':len(self.data)+1}],[{**self.members[0],'path':'../escape'}],[{**self.members[0],'path':'other'}]]:
            with self.assertRaises(ValueError):self.store().verify_members(self.name,rows)
    def test_duplicate_json_and_deadlines(self):
        (self.case/'packet-git-index.json').write_text('{"schema":"x","schema":"y","archives":{}}')
        with self.assertRaisesRegex(ValueError,'Duplicate'):self.store()
        for deadline in [0,601,1.5,True]:
            with self.assertRaises(ValueError):PacketStore(self.case,self.repo,cap_seconds=deadline)
    def test_backward_hardlink_recovers_complete_bytes(self):
        self.pack('hardlink');self.git('add','.');self.git('-c','core.hooksPath=/dev/null','commit','-qm','complete duplicate');self.head=self.git('rev-parse','HEAD').decode().strip();body=self.file.read_bytes();self.index['archives'][self.name]={'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'git':{'commit':self.head,'path':'docs/case-studies/issue-759/'+self.name,'blob':self.git('rev-parse',self.head+':docs/case-studies/issue-759/'+self.name).decode().strip()}};self.write();self.assertEqual(self.store().verify_members(self.name,self.members+[{**self.members[0],'path':'second'}])['completeMembers'],2)
    def test_expanded_budget_and_truncated_compression_refuse(self):
        import packet
        previous=packet.MAX_TOTAL
        try:
            packet.MAX_TOTAL=16
            with self.assertRaises(ValueError):self.store().verify_members(self.name,self.members)
        finally:packet.MAX_TOTAL=previous
        truncated=self.original[:-8];self.file.write_bytes(truncated);self.git('add','.');self.git('-c','core.hooksPath=/dev/null','commit','-qm','truncated packet');head=self.git('rev-parse','HEAD').decode().strip();self.index['archives'][self.name]={'bytes':len(truncated),'sha256':hashlib.sha256(truncated).hexdigest(),'git':{'commit':head,'path':'docs/case-studies/issue-759/'+self.name,'blob':self.git('rev-parse',head+':docs/case-studies/issue-759/'+self.name).decode().strip()}};self.write()
        with self.assertRaises(ValueError):self.store().verify_members(self.name,self.members)
    def test_git_replacement_cannot_substitute_container(self):
        result=subprocess.run(['git','hash-object','-w','--stdin'],cwd=self.repo,input=b'forged replacement',capture_output=True,timeout=15);self.assertEqual(result.returncode,0);replacement=result.stdout.decode().strip();self.git('replace',self.blob,replacement)
        self.assertEqual(self.store().verify_members(self.name,self.members)['completeMembers'],1)
        # An inherited Git object directory must not redirect the verified repo.
        old=os.environ.get('GIT_OBJECT_DIRECTORY');os.environ['GIT_OBJECT_DIRECTORY']=str(self.repo/'missing')
        try:self.assertEqual(self.store().verify_members(self.name,self.members)['completeMembers'],1)
        finally:
            if old is None:os.environ.pop('GIT_OBJECT_DIRECTORY',None)
            else:os.environ['GIT_OBJECT_DIRECTORY']=old
    def test_symlink_traversal_duplicate_archive_members(self):
        for kind in ['link','traversal','duplicate']:
            self.pack(kind);self.git('add','.');self.git('-c','core.hooksPath=/dev/null','commit','-qm','negative original '+kind);head=self.git('rev-parse','HEAD').decode().strip();body=self.file.read_bytes();self.index['archives'][self.name]={'bytes':len(body),'sha256':hashlib.sha256(body).hexdigest(),'git':{'commit':head,'path':'docs/case-studies/issue-759/'+self.name,'blob':self.git('rev-parse',head+':docs/case-studies/issue-759/'+self.name).decode().strip()}};self.write()
            with self.assertRaises(ValueError):self.store().verify_members(self.name,self.members+[{**self.members[0],'path':'second','bytes':0,'sha256':hashlib.sha256(b'').hexdigest()}])

if __name__=='__main__':unittest.main()
