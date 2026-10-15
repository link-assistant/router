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

class PacketRangeTests(unittest.TestCase):
    def setUp(self):
        from unittest.mock import patch
        self.fixture=PacketTests('test_full_physical_and_absent_git_recovery');self.fixture.setUp()
        self.repo,self.case,self.archive=self.fixture.repo,self.fixture.case,self.fixture.file
        self.partial=self.fixture.original[:len(self.fixture.original)//2]
        self.names=['failed/original-v1.tar.xz','recovered/original-v1.tar.xz']
        self.rows={name:{'archive':self.fixture.name,'offset':0,'bytes':len(self.partial),'sha256':hashlib.sha256(self.partial).hexdigest()}for name in self.names}
        self.index={'schema':'complete-packet-range-index-v1','ranges':self.rows};self.index_path=self.case/'packet-range-index.json';self.write()
        # All private staging stays within this fixture; no task/case installation.
        self.staging=patch('tempfile.gettempdir',return_value=str(self.repo.resolve()));self.staging.start()
    def tearDown(self):self.staging.stop();self.fixture.tearDown()
    def write(self,index=None):self.index_path.write_text(json.dumps(self.index if index is None else index))
    def recover(self,name=None,target=None):return self.fixture.store().recover_range_object(name or self.names[0],target or self.repo/'fresh-original.bin')
    def test_both_full_logical_originals_present_and_absent_use_one_stage_each(self):
        from unittest.mock import patch
        for source_present in [True,False]:
            if not source_present:self.archive.unlink()
            for logical_present in [True,False]:
                for i,name in enumerate(self.names):
                    physical=self.case/name;physical.parent.mkdir(exist_ok=True)
                    if logical_present:physical.write_bytes(self.partial)
                    elif physical.exists():physical.unlink()
                    target=self.repo/('fresh-'+str(source_present)+'-'+str(logical_present)+'-'+str(i))
                    with patch('tempfile.SpooledTemporaryFile',side_effect=AssertionError('No second compressed spool')):
                        result=self.recover(name,target)
                    self.assertEqual(target.read_bytes(),self.partial)
                    self.assertEqual(result['completeOriginalBytes'],len(self.partial));self.assertEqual(result['logicalObject'],name)
                    self.assertTrue(result['rangeRecovery']['fullArchiveVerified']);self.assertFalse(result['archiveDecoded'])
                    self.assertEqual(result['physicalOriginalPresentAndVerified'],logical_present)
                    if logical_present:self.assertEqual(physical.read_bytes(),self.partial)
                    self.assertEqual(list(self.repo.glob('complete-packet-range-*')),[])
        with self.fixture.store().verified_archive(self.fixture.name)as source:self.assertEqual(source.read(),self.fixture.original)
    def test_cli_recovers_both_opaque_originals_and_never_overwrites(self):
        import sys,packet
        for i,name in enumerate(self.names):
            target=self.repo/('cli-fresh-'+str(i));flag=['--logical-object',name]if i==0 else['--logical-object='+name]
            command=[sys.executable,packet.__file__,'--case-root',str(self.case),'--repository-root',str(self.repo),*flag,'--copy-to',str(target)]
            result=subprocess.run(command,capture_output=True,timeout=20);self.assertEqual(result.returncode,0,result.stderr)
            self.assertEqual(target.read_bytes(),self.partial);self.assertFalse(json.loads(result.stdout)['archiveDecoded'])
            repeated=subprocess.run(command,capture_output=True,timeout=20);self.assertNotEqual(repeated.returncode,0);self.assertEqual(target.read_bytes(),self.partial)
    def test_strict_rows_do_not_issue_git_witnesses_or_alias_chains(self):
        for changes in [{'extra':True},{'git':self.fixture.index['archives'][self.fixture.name]['git']},{'archive':self.names[1]},{'archive':'../escape'},{'archive':'missing'},{'offset':True},{'offset':-1},{'offset':1.0},{'bytes':True},{'bytes':-1},{'bytes':128*1024*1024+1},{'offset':256*1024*1024+1},{'offset':len(self.fixture.original)+1},{'offset':len(self.fixture.original),'bytes':1},{'sha256':'F'*64}]:
            with self.subTest(changes=changes):
                value=copy.deepcopy(self.index);value['ranges'][self.names[0]].update(changes);self.write(value)
                with self.assertRaises(ValueError):self.recover()
                self.assertFalse((self.repo/'fresh-original.bin').exists())
        for index in [[],{**self.index,'extra':True},{'schema':'complete-packet-git-index-v1','ranges':self.rows},{'schema':'complete-packet-range-index-v1','ranges':{}},{'schema':'complete-packet-range-index-v1','ranges':{str(i):self.rows[self.names[0]]for i in range(8193)}}]:
            self.write(index)
            with self.assertRaises(ValueError):self.recover()
    def test_duplicate_keys_nonfinite_values_and_escaping_logical_names_refuse(self):
        raw=json.dumps(self.index)
        for value in ['{"schema":"x","schema":"y","ranges":{}}',raw.replace('"offset": 0','"offset": 0, "offset": 0',1),raw.replace('"offset": 0','"offset": NaN',1),raw.replace('"offset": 0','"offset": Infinity',1)]:
            self.index_path.write_text(value)
            with self.assertRaises(ValueError):self.recover()
        for name in ['../escape','/absolute','a//b','a\\b','a\x00b','a\nb']:
            self.write({'schema':'complete-packet-range-index-v1','ranges':{name:self.rows[self.names[0]]}})
            with self.assertRaises(ValueError):self.recover(name)
    def test_wrong_full_archive_refuses_even_with_correct_original_overlay(self):
        physical=self.case/self.names[0];physical.parent.mkdir();physical.write_bytes(self.partial)
        self.archive.write_bytes(self.fixture.original+b'wrong-tail')
        with self.assertRaisesRegex(ValueError,'Physical packet'):self.recover()
        self.assertEqual(physical.read_bytes(),self.partial);self.assertFalse((self.repo/'fresh-original.bin').exists())
        self.archive.write_bytes(self.fixture.original)
        changed=copy.deepcopy(self.fixture.index);changed['archives'][self.fixture.name]['git']['commit']='f'*40;self.fixture.write(changed)
        with self.assertRaises(ValueError):self.recover()
    def test_opaque_slice_hash_and_complete_staged_archive_are_both_required(self):
        from unittest.mock import patch
        import archive_range
        for changes in [{'offset':1},{'bytes':len(self.partial)-1},{'sha256':'f'*64}]:
            value=copy.deepcopy(self.index);value['ranges'][self.names[0]].update(changes);self.write(value)
            target=self.repo/('bad-range-'+str(len(list(self.repo.glob('bad-range-*')))))
            with self.assertRaisesRegex(ValueError,'Recovered range byte/hash'):self.recover(target=target)
        self.write();original=archive_range.recover_archive_range
        for suffix in [b'changed-tail',None]:
            def altered_stage(path,output,**kwargs):
                source=Path(path);body=source.read_bytes();source.write_bytes(body[:-1]if suffix is None else body+suffix)
                return original(path,output,**kwargs)
            with patch.object(archive_range,'recover_archive_range',altered_stage):
                with self.assertRaisesRegex(ValueError,'Complete archive'):self.recover()
            self.assertFalse((self.repo/'fresh-original.bin').exists())
    def test_original_overlay_mismatch_links_and_output_links_refuse(self):
        physical=self.case/self.names[0];physical.parent.mkdir();physical.write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'Physical packet range'):self.recover()
        physical.unlink();physical.symlink_to(self.archive)
        with self.assertRaisesRegex(ValueError,'Linked'):self.recover()
        physical.unlink();target=self.repo/'linked-output';target.symlink_to(self.archive)
        with self.assertRaises(OSError):self.recover(target=target)
        self.assertEqual(self.archive.read_bytes(),self.fixture.original)
        self.index_path.unlink();self.index_path.symlink_to(self.archive)
        with self.assertRaises(OSError):self.recover()
    def test_linked_ancestors_nonregular_indices_and_unknown_objects_refuse(self):
        linked=self.repo/'linked-case';linked.symlink_to(self.case,target_is_directory=True)
        with self.assertRaises(ValueError):PacketStore(linked,self.repo)
        with self.assertRaises(ValueError):self.recover('undeclared')
        self.index_path.unlink();os.mkfifo(self.index_path)
        with self.assertRaises(ValueError):self.recover()
    def test_index_and_source_path_replacements_cannot_borrow_open_inode(self):
        from unittest.mock import patch
        import archive_range
        read=os.read;changed=False;body=self.index_path.read_bytes()
        def replace_index(descriptor,count):
            nonlocal changed
            chunk=read(descriptor,count)
            if chunk and not changed:
                changed=True;self.index_path.rename(self.case/'preserved-range-index');self.index_path.write_bytes(body)
            return chunk
        store=self.fixture.store()
        with patch.object(os,'read',replace_index):
            with self.assertRaisesRegex(ValueError,'index changed'):store.recover_range_object(self.names[0],self.repo/'fresh-original.bin')
        self.write();original=archive_range.recover_archive_range
        def replaced_source(path,output,**kwargs):
            moved=False;source=Path(path);content=source.read_bytes()
            def replace_source(descriptor,count):
                nonlocal moved
                chunk=read(descriptor,count)
                if chunk and not moved:moved=True;source.rename(self.repo/'preserved-private-stage');source.write_bytes(content)
                return chunk
            with patch.object(os,'read',replace_source):return original(path,output,**kwargs)
        with patch.object(archive_range,'recover_archive_range',replaced_source):
            with self.assertRaisesRegex(ValueError,'Archive changed'):self.recover()
        self.assertFalse((self.repo/'fresh-original.bin').exists())
    def test_deadlines_and_full_index_byte_budgets_are_not_extended(self):
        from unittest.mock import patch
        import packet,time
        store=self.fixture.store();store.deadline=time.monotonic()-1
        with self.assertRaises(TimeoutError):store.recover_range_object(self.names[0],self.repo/'never')
        with patch.object(packet,'MAX_TOTAL',len(self.partial)-1):
            with self.assertRaisesRegex(ValueError,'original byte bound'):self.recover()
        self.index_path.write_bytes(b' '*(4*1024*1024+1))
        with self.assertRaisesRegex(ValueError,'index too large'):self.recover()
    def test_failed_writes_preserve_partial_output_without_success(self):
        from unittest.mock import patch
        import archive_range
        original=archive_range.recover_archive_range
        def blocked_output(path,output,**kwargs):
            with patch.object(os,'write',return_value=0):return original(path,output,**kwargs)
        with patch.object(archive_range,'recover_archive_range',blocked_output):
            with self.assertRaisesRegex(OSError,'no progress'):self.recover()
        self.assertTrue((self.repo/'fresh-original.bin').is_file())
    def test_stalled_git_stage_obeys_shared_deadline_and_reaps_its_process_group(self):
        from unittest.mock import patch
        import sys,time,signal
        original=subprocess.Popen;processes=[];stop=os.killpg
        def stalled(command,**kwargs):
            if command[:3]==['git','cat-file','blob']:
                # Direct child exits; its descendant deliberately holds stdout.
                # The new stage must kill the group even after the leader exits.
                program='import os,time\nif os.fork(): os._exit(0)\ntime.sleep(30)\n'
                child=original([sys.executable,'-c',program],**kwargs);processes.append(child);return child
            return original(command,**kwargs)
        store=self.fixture.store();store.deadline=time.monotonic()+2;start=time.monotonic()
        with patch.object(subprocess,'Popen',stalled),patch.object(os,'killpg',wraps=stop)as killed:
            with self.assertRaises(TimeoutError):store.recover_range_object(self.names[0],self.repo/'never')
        self.assertLess(time.monotonic()-start,4);self.assertEqual(len(processes),1)
        killed.assert_called_with(processes[0].pid,signal.SIGKILL);self.assertIsNotNone(processes[0].returncode)
        self.assertEqual(list(self.repo.glob('complete-packet-range-*')),[]);self.assertFalse((self.repo/'never').exists())

if __name__=='__main__':unittest.main()
