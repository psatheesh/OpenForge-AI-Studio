'use strict';
// Single packaged product: Theia desktop + first-party local software builder.
// Electron already contains Node; no machine-wide Node or Yarn needed.
const path = require('node:path');
const fs = require('node:fs');
const { fork } = require('node:child_process');
const { initialize, launchLocalAi } = require('./first-run.cjs');
const appRoot=path.resolve(__dirname,'..');
const provision=initialize();
const dataRoot=path.join(provision.home,'projects');
fs.mkdirSync(dataRoot,{recursive:true});
const localAI=launchLocalAi(provision);
const servicePath=path.join(appRoot,'packages','openforge-workbench','server.js');
const sidecar=fork(servicePath,[],{
  execPath:process.execPath,
  cwd:path.dirname(servicePath),
  env:{...process.env,ELECTRON_RUN_AS_NODE:'1',OPENFORGE_DATA:dataRoot,HOST:'127.0.0.1',PORT:'4343',
    OPENFORGE_NODE:path.join(process.resourcesPath,'runtime','node','node.exe'),
    OPENFORGE_NPM_CLI:path.join(process.resourcesPath,'runtime','node','node_modules','npm','bin','npm-cli.js'),
    ...(localAI?{OLLAMA_MODEL:provision.state.models[0],OLLAMA_URL:'http://127.0.0.1:11434/api/chat'}:{})},
  stdio:'ignore',windowsHide:true
});
sidecar.on('error',e=>console.error('OpenForge service failed:',e));
function stop(){for(const proc of [sidecar,localAI])if(proc && proc.exitCode===null && !proc.killed)proc.kill();}
process.once('exit',stop);
process.once('SIGTERM',stop);
process.once('SIGINT',stop);
// Starts the packaged native Theia Electron main process.
require(path.join(appRoot,'applications','desktop','lib','backend','electron-main.js'));
