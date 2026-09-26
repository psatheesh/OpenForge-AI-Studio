'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {initialize,dataHome}=require('../scripts/first-run.cjs');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('one-click NSIS installer auto-starts and avoids user toolchain prerequisites',()=>{
  const yml=read('electron-builder.yml');
  assert.match(yml,/oneClick:\s*true/);
  assert.match(yml,/runAfterFinish:\s*true/);
  assert.match(yml,/scripts\/first-run\.cjs/);
  assert.match(read('scripts/electron-entry.cjs'),/require\(path\.join\(appRoot,'applications','desktop'/);
});
test('idempotent first run provisions an app-local workspace without installed AI',()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'of-first-run-'));
  const resources=fs.mkdtempSync(path.join(os.tmpdir(),'of-resources-'));
  try {
    const one=initialize({home,resourceRoot:resources});
    const two=initialize({home,resourceRoot:resources});
    assert.equal(one.state.localAi,false);
    assert.equal(two.state.mode,'hybrid');
    for(const item of ['projects','logs','config','models']) assert.ok(fs.statSync(path.join(home,item)).isDirectory());
    assert.ok(fs.existsSync(path.join(home,'config','installation.json')));
  }finally{fs.rmSync(home,{recursive:true,force:true});fs.rmSync(resources,{recursive:true,force:true});}
});
test('first run detects prepackaged local AI model in an offline bundle',()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'of-ai-first-'));
  const resources=fs.mkdtempSync(path.join(os.tmpdir(),'of-ai-resources-'));
  try {
    const offline=path.join(resources,'offline');
    const ollama=path.join(offline,'ollama',process.platform==='win32'?'ollama.exe':'ollama');
    fs.mkdirSync(path.dirname(ollama),{recursive:true});fs.writeFileSync(ollama,'test binary');
    const model='blobs/sha256-123';
    fs.mkdirSync(path.join(offline,'models','blobs'),{recursive:true});
    fs.writeFileSync(path.join(offline,'models',model),'test weights');
    fs.writeFileSync(path.join(offline,'bundle-manifest.json'),JSON.stringify({format:1,models:[{name:'example-code',files:[model]}]}));
    const {state}=initialize({home,resourceRoot:resources});
    assert.equal(state.localAi,true);assert.equal(state.mode,'offline-ready');
  }finally{fs.rmSync(home,{recursive:true,force:true});fs.rmSync(resources,{recursive:true,force:true});}
});
test('build instructions produce setup on Windows and CI verifies release artifact',()=>{
  assert.match(read('installer/windows/build-installer.ps1'),/SHA256/);
  assert.match(read('.github/workflows/windows-installer.yml'),/upload-artifact/);
});
