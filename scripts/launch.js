'use strict';
// One product start command supervises the native Theia host and bundled OpenForge builder.
const path=require('node:path');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const target=process.argv[2]==='desktop'?'desktop':'browser';
const children=[];
const env={...process.env,HOST:'127.0.0.1',PORT:'4343',OPENFORGE_DATA:process.env.OPENFORGE_DATA||path.join(root,'projects')};
function run(cmd,args,cwd,environment){
 const child=spawn(cmd,args,{cwd,env:environment||env,stdio:'inherit',shell:false,windowsHide:true});
 children.push(child); child.on('error',error=>{console.error(error);stop(1)});
 child.on('exit',(code)=>{if(!stopping && code!==null)stop(code||0)});
 return child;
}
let stopping=false;
function stop(code){if(stopping)return;stopping=true; for(const child of children) if(child.exitCode===null)child.kill('SIGTERM');process.exitCode=code;}
process.on('SIGINT',()=>stop(0));process.on('SIGTERM',()=>stop(0));
run(process.execPath,[path.join(root,'packages/openforge-workbench/server.js')],root,env);
const bin=path.join(root,'node_modules','.bin',process.platform==='win32'?'theia.cmd':'theia');
run(bin,['start',...(target==='browser'?['--hostname=127.0.0.1','--port=3000']:[])],path.join(root,'applications',target),env);
