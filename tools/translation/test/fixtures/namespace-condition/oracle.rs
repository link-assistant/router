// Source-only oracle: run with a separately qualified Rust2024 toolchain later.
fn condition(first:bool,value:Option<u8>,last:bool)->(bool,Vec<&'static str>){
 let mut trace=Vec::new();
 let result=if {trace.push("first");first}
     && let Some(v)={trace.push("next");value}
     && {trace.push("last");v>0&&last} {true}else{false};
 (result,trace)
}
fn main(){
 assert_eq!(condition(false,Some(1),true),(false,vec!["first"]));
 assert_eq!(condition(true,None,true),(false,vec!["first","next"]));
 assert_eq!(condition(true,Some(1),true),(true,vec!["first","next","last"]));
 assert_eq!(condition(true,Some(0),true),(false,vec!["first","next","last"]));
 let mut values=vec![1u8,2];let mut sum=0u8;
 while let Some(v)=values.pop(){sum+=v;}
 assert_eq!(sum,3);
}
