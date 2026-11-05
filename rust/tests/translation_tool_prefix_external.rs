//! Independent native tool-prefix lookup oracle SOURCE, CI-only and UNRUN.
//! Tiny isolated compiler fixtures; no Cargo recursion or local execution.
use std::{fs,path::{Path,PathBuf},process::{Command,Stdio,Output},thread,time::{Duration,Instant,SystemTime,UNIX_EPOCH}};
struct Scratch(PathBuf);
impl Drop for Scratch{fn drop(&mut self){let _=fs::remove_dir_all(&self.0);}}
fn compile(directory:&Path,name:&str,source:&str,external:Option<&Path>)->Output{
    let input=directory.join(format!("{name}.rs"));fs::write(&input,source).unwrap();
    let mut command=Command::new("rustc");command.arg("--edition=2021").arg("--crate-name").arg(name).arg("--crate-type=lib").arg("-Cdebuginfo=0").arg("-Ccodegen-units=1").arg("--out-dir").arg(directory).arg(&input).stdout(Stdio::piped()).stderr(Stdio::piped());
    if let Some(path)=external{command.arg("--extern").arg(format!("rustfmt={}",path.display()));}
    let mut child=command.spawn().unwrap();let deadline=Instant::now()+Duration::from_secs(30);
    loop{if child.try_wait().unwrap().is_some(){return child.wait_with_output().unwrap();}if Instant::now()>=deadline{let _=child.kill();let _=child.wait();panic!("bounded tool-prefix native fixture exceeded30 seconds");}thread::sleep(Duration::from_millis(10));}
}
#[test]
fn actual_extern_prelude_and_local_type_prefixes_precede_tool_lookup(){
    if std::env::var_os("CI").is_none(){return;}
    let nonce=SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos();let scratch=Scratch(std::env::temp_dir().join(format!("router-tool-prefix-{}-{nonce}",std::process::id())));fs::create_dir(&scratch.0).unwrap();
    let plain=compile(&scratch.0,"plain","#[rustfmt::skip]pub fn keep(value:u8)->u8{value}",None);assert!(plain.status.success(),"{}",String::from_utf8_lossy(&plain.stderr));
    let external=compile(&scratch.0,"rustfmt","pub struct Marker;",None);assert!(external.status.success(),"{}",String::from_utf8_lossy(&external.stderr));let library=scratch.0.join("librustfmt.rlib");assert!(library.is_file());
    for (name,source,external) in [("external","#[rustfmt::skip]pub fn keep(value:u8)->u8{value}",Some(library.as_path())),("nested_external","mod nested{#[rustfmt::skip]pub fn keep(value:u8)->u8{value}}",Some(library.as_path())),("local","mod rustfmt{}#[rustfmt::skip]pub fn keep(value:u8)->u8{value}",None)]{
        let output=compile(&scratch.0,name,source,external);assert!(!output.status.success(),"shadowed tool unexpectedly compiled: {name}");let error=String::from_utf8_lossy(&output.stderr);assert!(error.contains("rustfmt")&&error.contains("skip"),"unexpected native refusal: {error}");
    }
}
