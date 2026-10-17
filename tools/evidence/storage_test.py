import copy
import hashlib
import io
import json
import lzma
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest
from storage import Storage


def sha(b):return hashlib.sha256(b).hexdigest()


class Fixture:
    def __init__(self):
        self.temp=tempfile.TemporaryDirectory(prefix='router-evidence-storage-')
        self.repo=Path(self.temp.name)/'repo';self.repo.mkdir()
        self.case=self.repo/'docs/case-studies/issue-759';self.ci=self.case/'raw/ci';self.ci.mkdir(parents=True)
        self.data={'text-objects/a.xz':b'complete original\x00\xff\n','text-objects/b.xz':b'distinct report\r\n'}
        for name,b in self.data.items():
            p=self.ci/name;p.parent.mkdir(exist_ok=True);p.write_bytes(lzma.compress(b,preset=6))
        self.git('init','-q');self.git('add','.');self.git('-c','core.hooksPath=/dev/null','commit','-qm','complete original fixtures')
        head=self.git('rev-parse','HEAD').decode().strip();self.original_head=head;members=[];objects={}
        for i,(name,b)in enumerate(self.data.items()):
            p=self.ci/name;member='decoded/'+str(i)+'.bytes';members.append((member,b));path='docs/case-studies/issue-759/raw/ci/'+name
            objects[name]={'containerBytes':p.stat().st_size,'containerSha256':sha(p.read_bytes()),'decodedBytes':len(b),'decodedSha256':sha(b),'archive':'raw/ci/batch.tar.xz','member':member,'git':{'commit':head,'path':path,'blob':self.git('rev-parse',head+':'+path).decode().strip()}}
        self.members=members;self.archive=self.ci/'batch.tar.xz';self.pack(members)
        self.original_archive=self.archive.read_bytes()
        self.index={'schema':'ci-object-batch-index-v1','gitPrefix':'docs/case-studies/issue-759/raw/ci','objects':objects,'archives':{'raw/ci/batch.tar.xz':{'bytes':self.archive.stat().st_size,'sha256':sha(self.archive.read_bytes()),'members':[m for m,_ in members]}}}
        self.write_index()
        self.originals={name:(self.ci/name).read_bytes()for name in self.data}
        for name in self.data:(self.ci/name).unlink()
    def git(self,*args):return subprocess.check_output(['git',*args],cwd=self.repo,stderr=subprocess.DEVNULL,timeout=15,env={**os.environ,'GIT_AUTHOR_NAME':'Fixture','GIT_AUTHOR_EMAIL':'fixture@example.invalid','GIT_COMMITTER_NAME':'Fixture','GIT_COMMITTER_EMAIL':'fixture@example.invalid'})
    def pack(self,members):
        with tarfile.open(self.archive,'w:xz',preset=6)as tar:
            for name,b in members:
                entry=tarfile.TarInfo(name);entry.size=len(b);entry.mtime=0;entry.mode=0o644;tar.addfile(entry,io.BytesIO(b))
    def write_index(self):
        (self.ci/'object-storage-index.json').write_text(json.dumps(self.index))
    def store(self):return Storage(self.case,self.repo)
    def entries(self):return [{'path':name,'sha256':row['containerSha256'],'compressed_bytes':row['containerBytes'],'scrubbed_content_sha256':row['decodedSha256']}for name,row in self.index['objects'].items()]
    def update_archive(self):
        row=self.index['archives']['raw/ci/batch.tar.xz'];row['bytes']=self.archive.stat().st_size;row['sha256']=sha(self.archive.read_bytes());self.write_index()
    def close(self):self.temp.cleanup()


class StorageTests(unittest.TestCase):
    def setUp(self):self.f=Fixture()
    def tearDown(self):
        destination=os.environ.get('ROUTER_STORAGE_FIXTURE_VECTORS')
        if destination:
            path=Path(destination);rows=json.loads(path.read_text()) if path.exists() else []
            rows.append({'case':self._testMethodName,'originalDecodedHex':{k:v.hex() for k,v in self.f.data.items()},'originalContainerHex':{k:v.hex() for k,v in self.f.originals.items()},'originalBatchHex':self.f.original_archive.hex(),'originalGitCommit':self.f.original_head,'originalGitCommitObjectHex':self.f.git('cat-file','commit',self.f.original_head).hex(),'originalGitTree':self.f.git('ls-tree','-r',self.f.original_head).decode(),'finalIndexHex':(self.f.ci/'object-storage-index.json').read_bytes().hex(),'finalBatchHex':self.f.archive.read_bytes().hex() if self.f.archive.exists() else None,'runtimeParity':False,'semanticAuthority':False})
            path.write_text(json.dumps(rows,indent=2)+'\n')
        self.f.close()
    def test_exact_git_containers_and_complete_member_bytes_with_old_paths_absent(self):
        store=self.f.store()
        for name,b in self.f.data.items():
            self.assertFalse((self.f.ci/name).exists());self.assertTrue(store.exists(name));self.assertEqual(store.read_container(name),self.f.originals[name]);self.assertEqual(store.read_decoded(name),b)
        result=store.verify_entries(self.f.entries()*2);self.assertEqual(result['receiptReferences'],4);self.assertEqual(result['uniqueLogicalObjects'],2);self.assertEqual(result['decodedBytesStreamed'],sum(map(len,self.f.data.values())))
        self.assertEqual(result['physicalArchives'],1);self.assertEqual(store.physical_metrics()['distinctPhysicalFiles'],2)
        with self.assertRaises(TypeError):store.objects['text-objects/a.xz']['decodedBytes']=0
        with self.assertRaises(TypeError):store.objects['text-objects/a.xz']['git']['commit']='0'*40
        with self.assertRaises(TypeError):store.targets['raw/ci/batch.tar.xz']['extra']='forged'
    def test_staged_before_archive_install_still_reads_exact_git_bytes(self):
        self.f.archive.unlink();store=self.f.store()
        for name,b in self.f.data.items():self.assertEqual(store.read_decoded(name),b)
        result=store.verify_entries(self.f.entries())
        self.assertEqual(result['declaredArchives'],1);self.assertEqual(result['physicalArchives'],0)
        self.assertEqual(result['decodedBytesStreamed'],sum(map(len,self.f.data.values())))
        self.assertEqual(store.physical_metrics()['distinctPhysicalFiles'],1)
        self.f.index['objects']['text-objects/a.xz']['decodedSha256']='0'*64;self.f.write_index()
        with self.assertRaisesRegex(ValueError,'decoded member size/hash'):self.f.store().read_decoded('text-objects/a.xz')
    def test_unindexed_regular_container_retains_existing_behaviour(self):
        p=self.f.ci/'legacy.gz';import gzip;p.write_bytes(gzip.compress(b'old exact\n',mtime=0));store=self.f.store();self.assertEqual(store.read_decoded('legacy.gz'),b'old exact\n');self.assertEqual(store.container_size('legacy.gz'),p.stat().st_size)
    def test_duplicate_index_keys_and_missing_extra_member_targets(self):
        for mutate in [lambda x:x['archives']['raw/ci/batch.tar.xz']['members'].append('extra'),lambda x:x['archives']['raw/ci/batch.tar.xz']['members'].pop(),lambda x:x['archives']['raw/ci/batch.tar.xz']['members'].append('decoded/0.bytes'),lambda x:x['archives'].update({'extra':copy.deepcopy(next(iter(x['archives'].values())))}),lambda x:x['objects']['text-objects/b.xz'].update(member='decoded/0.bytes')]:
            original=copy.deepcopy(self.f.index);mutate(self.f.index);self.f.write_index()
            with self.assertRaises(ValueError):self.f.store()
            self.f.index=original
        (self.f.ci/'object-storage-index.json').write_text('{"schema":1,"schema":2}')
        with self.assertRaisesRegex(ValueError,'Duplicate'):self.f.store()
    def test_path_traversal_symlink_root_index_container_and_archive_refuse(self):
        for name in ['../outside','/outside','a//b','a/./b','a/../b','a\\b']:
            with self.assertRaises(ValueError):self.f.store().read_container(name)
        for target in ['object-storage-index.json','batch.tar.xz']:
            p=self.f.ci/target;original=p.read_bytes();p.unlink();p.symlink_to(self.f.repo/'elsewhere')
            with self.assertRaises(ValueError):store=self.f.store();store.read_decoded('text-objects/a.xz')
            p.unlink();p.write_bytes(original)
        p=self.f.ci/'text-objects/a.xz';p.symlink_to(self.f.repo/'elsewhere')
        with self.assertRaises(ValueError):self.f.store().read_container('text-objects/a.xz')
    def test_mutated_git_commit_path_blob_container_length_hash_refuse(self):
        for key,value in [('commit','0'*40),('blob','0'*40),('path','wrong/path')]:
            original=copy.deepcopy(self.f.index);self.f.index['objects']['text-objects/a.xz']['git'][key]=value;self.f.write_index()
            with self.assertRaises(ValueError):self.f.store().read_container('text-objects/a.xz')
            with self.assertRaises(ValueError):self.f.store().read_decoded('text-objects/a.xz')
            self.f.index=original
        for key,value in [('containerBytes',1),('containerSha256','0'*64)]:
            original=copy.deepcopy(self.f.index);self.f.index['objects']['text-objects/a.xz'][key]=value;self.f.write_index()
            with self.assertRaises(ValueError):self.f.store().read_container('text-objects/a.xz')
            self.f.index=original
    def test_corrupt_duplicate_missing_extra_and_nonfile_tar_members_refuse(self):
        for members in [self.f.members+self.f.members[:1],self.f.members[:1],self.f.members+[('extra',b'wrong')],[('../outside',b'wrong')],[(self.f.members[0][0],b'mutated'),self.f.members[1]]]:
            self.f.pack(members);self.f.update_archive()
            with self.assertRaises((ValueError,tarfile.TarError)):self.f.store().read_decoded('text-objects/a.xz')
        original=copy.deepcopy(self.f.index);changed=b'x'*len(self.f.data['text-objects/a.xz'])
        self.f.index['objects']['text-objects/a.xz']['decodedSha256']=sha(changed)
        self.f.pack([(self.f.members[0][0],changed),self.f.members[1]]);self.f.update_archive()
        with self.assertRaisesRegex(ValueError,'decoded member size/hash'):self.f.store().read_decoded('text-objects/a.xz')
        self.f.index=original
        self.f.pack(self.f.members);self.f.update_archive();self.f.archive.write_bytes(self.f.archive.read_bytes()[:-10])
        with self.assertRaises(ValueError):self.f.store().read_decoded('text-objects/a.xz')
    def test_nonregular_archive_header_size_and_decode_bomb_refuse(self):
        for kind,size in [(tarfile.SYMTYPE,0),(tarfile.LNKTYPE,0),(tarfile.DIRTYPE,0),(tarfile.REGTYPE,128*1024*1024+1)]:
            entry=tarfile.TarInfo(self.f.members[0][0]);entry.type=kind;entry.size=size;entry.linkname='outside'
            # Craft the complete malformed header without allocating its claimed body.
            self.f.archive.write_bytes(lzma.compress(entry.tobuf()+b'\0'*1024));self.f.update_archive()
            with self.assertRaises((ValueError,tarfile.TarError)):self.f.store().read_decoded('text-objects/a.xz')
        self.f.pack(self.f.members);self.f.update_archive();self.f.archive.unlink()
        original=copy.deepcopy(self.f.index);self.f.index['objects']['text-objects/a.xz']['decodedBytes']=1;self.f.write_index()
        with self.assertRaisesRegex(ValueError,'bound exceeded'):self.f.store().read_decoded('text-objects/a.xz')
        self.f.index=original
    def test_foreign_unreachable_git_and_changed_physical_container_refuse(self):
        original=copy.deepcopy(self.f.index)
        self.f.git('checkout','--orphan','foreign')
        self.f.git('rm','-rf','--cached','.')
        self.f.git('-c','core.hooksPath=/dev/null','commit','--allow-empty','-qm','foreign unrelated lineage')
        with self.assertRaises(ValueError):self.f.store().read_container('text-objects/a.xz')
        self.f.git('checkout','-q',original['objects']['text-objects/a.xz']['git']['commit'])
        (self.f.ci/'text-objects/a.xz').write_bytes(b'changed')
        with self.assertRaisesRegex(ValueError,'disagrees'):self.f.store().read_container('text-objects/a.xz')
    def test_custom_index_is_relative_to_case_and_missing_git_refuses(self):
        alternate=self.f.case/'storage/custom.json';alternate.parent.mkdir();alternate.write_bytes((self.f.ci/'object-storage-index.json').read_bytes())
        store=Storage(self.f.case,self.f.repo,index='storage/custom.json')
        self.assertEqual(store.read_decoded('text-objects/a.xz'),self.f.data['text-objects/a.xz'])
        foreign=Path(self.f.temp.name)/'empty-repo';foreign.mkdir();subprocess.run(['git','init','-q'],cwd=foreign,check=True)
        with self.assertRaises(ValueError):Storage(self.f.case,foreign,index='storage/custom.json').read_container('text-objects/a.xz')
    def test_subset_cli_keeps_full_original_manifests_and_qualifies_exclusions(self):
        import importlib.util
        path=Path(__file__).resolve().parents[2]/'docs/case-studies/issue-759/raw/ci/verify-archive.py'
        spec=importlib.util.spec_from_file_location('storage_verifier_test',path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        manifest=self.f.ci/'artifact-selection-manifest.json'
        rows=[{'downloaded_text_files':self.f.entries()+[{'path':'historical-absent.gz','sha256':'0'*64}]}]
        manifest.write_text(json.dumps(rows));before=manifest.read_bytes()
        names=['artifact-selection-manifest.json']
        result=module.verify(self.f.ci,self.f.repo,names,logical_targets=list(self.f.data))
        self.assertEqual(result['errors'],[]);self.assertEqual(result['excluded_receipt_references'],1)
        self.assertEqual(result['counts']['receipt_references'],2);self.assertEqual(result['scope'],'complete-declared-current-object-subset');self.assertEqual(manifest.read_bytes(),before)
        complete=module.verify(self.f.ci,self.f.repo,names)
        self.assertTrue(complete['errors'])
        for targets in [['text-objects/a.xz'],['unknown.xz'],list(self.f.data)*2]:
            with self.assertRaises(ValueError):module.verify(self.f.ci,self.f.repo,names,logical_targets=targets)
    def test_wrong_current_receipt_hash_or_extra_index_reference_refuse(self):
        migrated=self.f.entries();migrated[0].update(original_gzip_sha256='f'*64,compression='xz',bytes=migrated[0]['compressed_bytes'],compressed_bytes=999)
        self.assertEqual(self.f.store().verify_entries(migrated)['receiptReferences'],2)
        migrated[0]['bytes']=1
        with self.assertRaisesRegex(ValueError,'length mismatch'):self.f.store().verify_entries(migrated)
        entries=self.f.entries();entries[0]['sha256']='0'*64
        with self.assertRaises(ValueError):self.f.store().verify_entries(entries)
        entries=self.f.entries();entries[0]['scrubbed_content_sha256']='0'*64
        with self.assertRaises(ValueError):self.f.store().verify_entries(entries)
        with self.assertRaises(ValueError):self.f.store().verify_entries(self.f.entries()[:1])
    def module(self,name):
        import importlib.util
        path=Path(__file__).resolve().parents[2]/'docs/case-studies/issue-759/raw/ci'/name
        spec=importlib.util.spec_from_file_location('storage_consumer_test_'+name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
    def test_writer_preserves_indexed_old_container_without_recreating_or_recompressing(self):
        module=self.module('archive-ci.py');module.ROOT=self.f.ci
        previous=os.environ.get('ROUTER_CI_GIT_ROOT');os.environ['ROUTER_CI_GIT_ROOT']=str(self.f.repo)
        try:
            module.write_bounded(self.f.ci/'text-objects/a.xz',self.f.originals['text-objects/a.xz'])
            self.assertFalse((self.f.ci/'text-objects/a.xz').exists())
            with self.assertRaisesRegex(ValueError,'mutation refused'):module.write_bounded(self.f.ci/'text-objects/a.xz',b'different compression bytes')
            self.assertFalse((self.f.ci/'.disk-budget-state.json').exists())
            self.assertEqual(module.read_stored(self.f.ci/'text-objects/a.xz'),self.f.originals['text-objects/a.xz'])
        finally:
            if previous is None:os.environ.pop('ROUTER_CI_GIT_ROOT',None)
            else:os.environ['ROUTER_CI_GIT_ROOT']=previous
    def test_summary_separates_unchanged_historical_receipt_facts_current_logical_and_physical(self):
        module=self.module('summarize-archive.py');folder=self.f.ci/'owner--project/artifacts';folder.mkdir(parents=True);current=folder/'1';current.mkdir()
        ledger={'requested_attempts':1,'log_status_counts':{'collected':1},'job_status_counts':{'collected':1},'attempts':[{'repository':'owner/project'}]}
        (self.f.ci/'archive-completeness-ledger.json').write_text(json.dumps(ledger));(folder/'metadata-collection-status.json').write_text('{}');(current/'text-manifest.json').write_text(json.dumps(self.f.entries()))
        rows=[{'id':1,'selection_reason':'previously_downloaded','downloaded_text_files':[{'path':'historical-absent.gz','compressed_bytes':7}],'size_in_bytes':0}]
        selection=folder/'artifact-selection-manifest.json';selection.write_text(json.dumps(rows));before=selection.read_bytes()
        result=module.summarize(self.f.ci,self.f.repo);artifact=result['artifacts'][0]
        self.assertEqual(artifact['unique_stored_text_bytes_referenced'],7);self.assertEqual(artifact['unique_stored_text_objects_referenced'],1)
        self.assertEqual(artifact['current_text_manifest_measurement']['receipt_references'],2);self.assertEqual(artifact['current_text_manifest_measurement']['original_container_bytes'],sum(map(len,self.f.originals.values())))
        self.assertEqual(result['historical_selection_container_bytes_referenced'],7);self.assertEqual(result['case_allocated_bytes'],self.f.store().physical_metrics()['physicalAllocatedBytes']);self.assertEqual(selection.read_bytes(),before)
        alternate=self.f.case/'custom-index.json';alternate.write_bytes((self.f.ci/'object-storage-index.json').read_bytes())
        self.assertEqual(module.summarize(self.f.ci,self.f.repo,'custom-index.json')['artifacts'],result['artifacts'])
        rows[0]['downloaded_text_files'].append({'path':'historical-absent.gz','compressed_bytes':8});selection.write_text(json.dumps(rows))
        with self.assertRaisesRegex(ValueError,'Inconsistent'):module.summarize(self.f.ci,self.f.repo)
        rows[0]['id']='../outside';selection.write_text(json.dumps(rows))
        with self.assertRaisesRegex(ValueError,'identity'):module.summarize(self.f.ci,self.f.repo)
    def test_bounds_boolean_sizes_invalid_deadlines_and_partial_consumption_refuse(self):
        for value in [True,-1,128*1024*1024+1]:
            original=copy.deepcopy(self.f.index);self.f.index['objects']['text-objects/a.xz']['decodedBytes']=value;self.f.write_index()
            with self.assertRaises(ValueError):self.f.store()
            self.f.index=original
        self.f.write_index()
        for value in [0,1801,True]:
            with self.assertRaises(ValueError):Storage(self.f.case,self.f.repo,cap_seconds=value)
        iterator=self.f.store().iter_decoded(['text-objects/a.xz']);next(iterator)
        with self.assertRaises(ValueError):next(iterator)

if __name__=='__main__':unittest.main()
