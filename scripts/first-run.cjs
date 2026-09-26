'use strict';
/** Per-user, idempotent first-run provisioning (no administrator privileges). */
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');

function dataHome(env=process.env, homedir=os.homedir()) {
  return path.resolve(env.OPENFORGE_HOME || path.join(env.APPDATA || path.join(homedir,'.config'),'OpenForge AI Studio'));
}
function executableFile(base){return process.platform==='win32' ? path.join(base,'ollama','ollama.exe') : path.join(base,'ollama','ollama');}
function readManifest(resourceRoot){
  const file=path.join(resourceRoot,'offline','bundle-manifest.json');
  if(!fs.existsSync(file)) return null;
  const manifest=JSON.parse(fs.readFileSync(file,'utf8'));
  if(manifest.format!==1 || !Array.isArray(manifest.models)) throw Error('Unsupported offline bundle manifest');
  return manifest;
}
function initialize(options={}) {
  const env=options.env||process.env;
  const home=options.home||dataHome(env);
  const resourceRoot=options.resourceRoot||process.resourcesPath||path.resolve(__dirname,'../installer');
  for(const name of ['projects','logs','config','models']) fs.mkdirSync(path.join(home,name),{recursive:true});
  const manifest=readManifest(resourceRoot);
  const ollama=executableFile(path.join(resourceRoot,'offline'));
  const localAi=manifest && fs.existsSync(ollama) && manifest.models.length>0 && manifest.models.every(m=>{
    const files=m.files||[];
    return files.every(f=>fs.existsSync(path.join(resourceRoot,'offline','models',f)));
  });
  const state={version:1,initialized:new Date().toISOString(),mode:localAi?'offline-ready':'hybrid',localAi:!!localAi,models:manifest?.models?.map(m=>m.name)||[],dataDirectory:home,checks:{projectsWritable:true,offlineBundle:!!localAi}};
  const stateFile=path.join(home,'config','installation.json');
  fs.writeFileSync(stateFile,JSON.stringify(state,null,2));
  return {state,home,resourceRoot,ollama:localAi?ollama:null,modelRoot:path.join(resourceRoot,'offline','models')};
}
function launchLocalAi(provision) {
  if(!provision.ollama) return null;
  const env={...process.env,OLLAMA_HOST:'127.0.0.1:11434',OLLAMA_MODELS:provision.modelRoot};
  const child=cp.spawn(provision.ollama,['serve'],{env,windowsHide:true,stdio:'ignore'});
  child.on('error', e=>console.error('Local AI failed:',e.message));
  return child;
}
module.exports={dataHome,readManifest,initialize,launchLocalAi};
