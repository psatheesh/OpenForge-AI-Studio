'use strict';
const test=require('node:test'); const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('Windows one-click builder installs verified private Node and Yarn',()=>{
 const ps=read('installer/windows/build-installer.ps1');
 for(const name of ['SHASUMS256','Get-FileHash','22.16.0','1.22.22','Expand-Archive','--win','nsis'])assert.match(ps,new RegExp(name));
 assert.match(read('BUILD-WINDOWS-INSTALLER.cmd'),/build-installer\.ps1/);
});
test('packaged desktop runtime launches bundled sidecar and native Theia',()=>{
 const main=read('scripts/electron-entry.cjs');
 assert.match(main,/ELECTRON_RUN_AS_NODE/);assert.match(main,/openforge-workbench/);
 assert.match(main,/electron-main\.js/);
 const yml=read('electron-builder.yml');assert.match(yml,/scripts\/electron-entry\.cjs/);
 assert.match(yml,/runAfterFinish: true/);
});
test('release automation uploads only after build success',()=>{
 assert.match(read('.github/workflows/windows-installer.yml'),/build-installer\.ps1/);
 assert.match(read('.github/workflows/windows-installer.yml'),/upload-artifact/);
});
