import { spawn, execFileSync } from "node:child_process";
import { mkdirSync, cpSync, writeFileSync } from "node:fs";
const [root,device,...args]=process.argv.slice(2);
if(!root||!device)throw Error("Usage: node scripts/run-native50.mjs BUILD_ROOT DEVICE_ID");
const bundle=args.includes("--developer")?"dev.quad.preview.basic50devqa":"dev.quad.preview.basic50qa";
const launchArgs=args.filter(arg=>arg!=="--developer");
const suffix=launchArgs.includes("--compact")?"-compact":"";
const sim=(...args)=>execFileSync("xcrun",["simctl",...args],{encoding:"utf8",timeout:60000}).trim();
sim("install",device,root+"/DerivedQA/Build/Products/Debug-iphonesimulator/QUADTest.app");
const events=[];
await new Promise((resolve,reject)=>{
 const proc=spawn("xcrun",["simctl","launch","--console",device,bundle,...launchArgs]);
 let buffer="",done=false,failure;
 const stop=()=>{try{sim("terminate",device,bundle);}catch{}};
 const timer=setTimeout(()=>{failure=new Error("Native UI timeout");stop();},600000);
 proc.stdout.on("data",data=>{
  process.stdout.write(data);buffer+=data;
  const lines=buffer.split("\n");buffer=lines.pop();
  for(const line of lines){const at=line.indexOf("QUAD_NATIVE_QA ");if(at<0)continue;
   let event;try{event=JSON.parse(line.slice(at+15));}catch{continue;}
   events.push(event);
   if(event.error)failure=new Error(event.error);
   if(event.phase==="done"||event.phase==="failed"){done=true;stop();}
  }
 });
 proc.stderr.on("data",data=>process.stderr.write(data));
 proc.on("error",reject);
 proc.on("close",()=>{clearTimeout(timer);writeFileSync(root+"/native-events"+suffix+".json",JSON.stringify(events,null,2));if(failure||!done)return reject(failure??new Error("No terminal native report"));resolve();});
});
const container=sim("get_app_container",device,bundle,"data");
mkdirSync(root+"/screenshots"+suffix,{recursive:true});
cpSync(container+"/Documents",root+"/screenshots"+suffix,{recursive:true});
console.log("Native UI verified stages:",events.filter(e=>e.phase==="stage-checked").length);
