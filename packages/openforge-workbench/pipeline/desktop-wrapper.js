'use strict';
const fs = require('node:fs');
const path = require('node:path');

/** Package an existing self-contained web application as a standalone Electron app. */
function prepareDesktopApp(root, name='OpenForge Generated App'){
  if(!fs.existsSync(path.join(root,'index.html')))throw Error('Windows desktop packaging currently supports generated web applications with index.html');
  const slug=String(name).toLowerCase().replace(/[^a-z0-9-]/g,'-').slice(0,55)||'openforge-generated';
  const existingPath=path.join(root,'package.json');const original=fs.existsSync(existingPath)?JSON.parse(fs.readFileSync(existingPath,'utf8')):{};if(original.scripts?.build||Object.keys(original.dependencies||{}).length)throw Error('Desktop wrapper supports static web projects only; use a framework-specific packaging adapter for built web frameworks');const scripts={test:original.scripts?.test||'node --test',build:original.scripts?.build||'node --check app.js',package:'electron-builder --win nsis --x64 --publish never'};const p={...original,name:slug,version:'1.0.0',private:true,main:'electron-main.cjs',scripts,devDependencies:{electron:'38.0.0','electron-builder':'26.0.12'},build:{appId:'studio.openforge.generated',productName:name,artifactName:'OpenForge-Generated-Setup-${version}-${arch}.${ext}',directories:{output:'dist'},asar:true,files:['**/*','!dist/**/*','!tests/**/*','!node_modules/.cache/**/*','!requirements-traceability.json'],win:{target:[{target:'nsis',arch:['x64']}]},nsis:{oneClick:true,perMachine:false,createDesktopShortcut:true,createStartMenuShortcut:true,runAfterFinish:false}}};
  fs.writeFileSync(path.join(root,'package.json'),JSON.stringify(p,null,2));
  const expected=['index.html',...fs.readdirSync(root).filter(x=>/\.(?:js|css)$/.test(x))];
  const main=`'use strict';
const{app,BrowserWindow}=require('electron');const fs=require('node:fs');const path=require('node:path');
const base=__dirname;const required=${JSON.stringify(expected)};
function selfTest(){const missing=required.filter(file=>!fs.existsSync(path.join(base,file)));const report={ok:missing.length===0,missing,packaged:app.isPackaged,nodeBundled:!!process.versions.node,electronBundled:!!process.versions.electron,executable:process.execPath};const output=process.env.OPENFORGE_SELFTEST_OUTPUT;if(output)fs.writeFileSync(output,JSON.stringify(report,null,2));else process.stdout.write(JSON.stringify(report)+'\\n');app.exit(report.ok&&report.packaged?0:2);}
app.whenReady().then(()=>{if(process.argv.includes('--openforge-selftest'))return selfTest();const win=new BrowserWindow({width:1160,height:850,webPreferences:{nodeIntegration:false,contextIsolation:true,sandbox:true}});win.loadFile(path.join(base,'index.html')).then(()=>{if(process.env.OPENFORGE_STARTUP_OUTPUT)fs.writeFileSync(process.env.OPENFORGE_STARTUP_OUTPUT,JSON.stringify({loaded:true,packaged:app.isPackaged,url:win.webContents.getURL(),windowVisible:!win.isDestroyed()}));}).catch(e=>{if(process.env.OPENFORGE_STARTUP_OUTPUT)fs.writeFileSync(process.env.OPENFORGE_STARTUP_OUTPUT,JSON.stringify({loaded:false,error:e.message}));});});app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()});`;
  fs.writeFileSync(path.join(root,'electron-main.cjs'),main);
  const npmrc='audit=false\nfund=false\n';fs.writeFileSync(path.join(root,'.npmrc'),npmrc);
  return {packageJson:p,wrapper:'electron-main.cjs'};
}
module.exports={prepareDesktopApp};
