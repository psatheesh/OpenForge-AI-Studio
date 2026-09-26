'use strict';
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {writeReferenceApp}=require('./reference-app');
const {prepareDesktopApp}=require('./desktop-wrapper');
const {createZip}=require('../zip-export');

const PHASES=['analysis','generation','dependencies','compilation','automated-repair','testing','packaging','acceptance'];
const active=new Map();
function sha256(file){const h=crypto.createHash('sha256');h.update(fs.readFileSync(file));return h.digest('hex')}
function safeRelative(name){if(typeof name!=='string'||!name||name.includes('\\')||name.includes('\0')||path.posix.isAbsolute(name)||name.split('/').includes('..')||name==='.')throw Error('Unsafe generated filename');return name}
function inside(root,relative){const dest=path.resolve(root,safeRelative(relative));if(dest===root||!dest.startsWith(path.resolve(root)+path.sep))throw Error('File outside project');let cur=path.resolve(root);for(const part of path.relative(cur,dest).split(path.sep)){cur=path.join(cur,part);if(fs.existsSync(cur)&&fs.lstatSync(cur).isSymbolicLink())throw Error('Symlinks cannot be overwritten');}return dest}
function writeGenerated(root,files){const changed=[];for(const [rel,content]of Object.entries(files)){if(typeof content!=='string')throw Error('Generated content must be textual');const dest=inside(root,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content);changed.push(rel);}return changed}
function logStage(job,phase,status,details=''){const entry={phase,status,at:new Date().toISOString(),details:String(details).slice(-12000)};job.events.push(entry);job.phase=phase;fs.mkdirSync(job.runDir,{recursive:true});fs.writeFileSync(path.join(job.runDir,'job.json'),JSON.stringify(publicJob(job),null,2));return entry}
function publicJob(job){const {runId,projectId,created,phase,status,events,commands,artifacts,traceability,reason,mode,target,generator}=job;return {runId,projectId,created,phase,status,events,commands,artifacts,traceability,reason,mode,target,generator};}
function getJob(projectDir,runId){if(!/^[a-f0-9-]{36}$/.test(runId||''))throw Error('Invalid run ID');const key=path.join(projectDir,'.openforge-runs',runId);const inMemory=active.get(key);if(inMemory)return publicJob(inMemory);const file=path.join(key,'job.json');if(!fs.existsSync(file))throw Error('Run not found');return JSON.parse(fs.readFileSync(file,'utf8'));}
function systemCommand(cmd,args,cwd,timeoutMs=300000){return new Promise(resolve=>{let stdout='',stderr='',done=false,timeout=false;const env={...process.env,CI:'1',NO_COLOR:'1',...(process.versions.electron?{ELECTRON_RUN_AS_NODE:'1'}:{})};const child=spawn(cmd,args,{cwd,env,windowsHide:true,shell:false,stdio:['ignore','pipe','pipe']});const capture=(which,buf)=>{const str=buf.toString();if(which==='stdout')stdout=(stdout+str).slice(-120000);else stderr=(stderr+str).slice(-120000)};child.stdout.on('data',d=>capture('stdout',d));child.stderr.on('data',d=>capture('stderr',d));const timer=setTimeout(()=>{timeout=true;child.kill('SIGKILL')},timeoutMs);child.on('error',error=>{if(!done){done=true;clearTimeout(timer);resolve({ok:false,exitCode:-1,stdout,stderr:stderr+'\n'+error.message,timeout})}});child.on('close',code=>{if(!done){done=true;clearTimeout(timer);resolve({ok:code===0&&!timeout,exitCode:code,stdout,stderr,timeout})}})});}
function commandFor(kind,dir){const bundledNpm=process.platform==='win32'&&path.join(path.dirname(process.execPath),'node_modules','npm','bin','npm-cli.js');const npmCli=process.env.OPENFORGE_NPM_CLI||(bundledNpm&&fs.existsSync(bundledNpm)?bundledNpm:null);const npm=npmCli?(process.env.OPENFORGE_NODE||process.execPath):(process.platform==='win32'?'npm.cmd':'npm');const npmArgs=npmCli?[npmCli]:[];const pkg=path.join(dir,'package.json');const meta=fs.existsSync(pkg)?JSON.parse(fs.readFileSync(pkg,'utf8')):{};
  if(kind==='dependencies')return meta.dependencies||meta.devDependencies?[npm,[...npmArgs,fs.existsSync(path.join(dir,'package-lock.json'))?'ci':'install','--no-audit','--no-fund'],dir]:null;
  if(kind==='compilation')return meta.scripts?.build?[npm,[...npmArgs,'run','build'],dir]:[process.execPath,['--check',fs.existsSync(path.join(dir,'app.js'))?'app.js':'server.js'],dir];
  if(kind==='testing')return meta.scripts?.test?[npm,[...npmArgs,'test'],dir]:[process.execPath,['--test'],dir];
  if(kind==='packaging')return [npm,[...npmArgs,'run','package'],dir];return null;
}
async function execStage(job,kind,dir,options){const item=commandFor(kind,dir);if(!item){logStage(job,kind,'skipped','No external dependencies or build step');return {ok:true,skipped:true}};
  if(!options.allowExecution){logStage(job,kind,'blocked','Code execution requires explicit approval in an isolated runner.');return {ok:false,blocked:true}};
  logStage(job,kind,'running',item[0]+' '+item[1].join(' '));const result=await (options.executor||systemCommand)(...item,options.timeoutMs||300000);job.commands.push({stage:kind,command:item[0]+' '+item[1].join(' '),...result});logStage(job,kind,result.ok?'passed':'failed',(result.stdout+'\n'+result.stderr).slice(-3500));return result;
}
function collectContext(root){const files={};let count=0;let bytes=0;const scan=(dir,prefix='')=>{if(!fs.existsSync(dir))return;for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(count>=50||bytes>=35000)break;if(ent.isSymbolicLink()||['dist','node_modules','.git'].includes(ent.name))continue;const rel=prefix?prefix+'/'+ent.name:ent.name,full=path.join(dir,ent.name);if(ent.isDirectory())scan(full,rel);else if(ent.isFile()&&/\.(?:js|jsx|ts|tsx|json|html|css|md|py|cjs)$/.test(ent.name)){const text=fs.readFileSync(full,'utf8');if(text.length>12000)continue;files[rel]=text;count++;bytes+=text.length;}}};scan(root);return files;}
function makeTrace(meta){return (meta.analysis?.features||[]).map((text,i)=>({id:'R-'+String(i+1).padStart(3,'0'),text,status:'unverified',files:[],tests:[]}))}
function traceAndWrite(job,dir){fs.writeFileSync(path.join(dir,'requirements-traceability.json'),JSON.stringify(job.traceability,null,2));}
function initJob({projectDir,meta,options={}}){const runId=crypto.randomUUID(),runDir=path.join(projectDir,'.openforge-runs',runId);const job={runId,runDir,projectId:meta.id||'reference',created:new Date().toISOString(),phase:'created',status:'queued',events:[],commands:[],artifacts:[],traceability:makeTrace(meta),reason:'',mode:meta.mode||'hybrid',target:options.target||'windows',generator:options.generator||'ai'};active.set(runDir,job);logStage(job,'created','queued');return job}
function zipProject(dir,output){return new Promise((resolve,reject)=>{const out=fs.createWriteStream(output);try{createZip(dir,out);out.on('finish',resolve);out.on('error',reject)}catch(e){reject(e)}})}
async function runPipeline({projectDir,meta,options={},aiGenerate}){
  const job=initJob({projectDir,meta,options}),root=path.join(projectDir,'files');options.onCreated?.(publicJob(job));fs.mkdirSync(root,{recursive:true});const fail=(state,reason)=>{job.status=state;job.reason=reason;logStage(job,job.phase,state,reason);return publicJob(job)};
  try{
    job.status='running';logStage(job,'analysis','passed',`${job.traceability.length} requirements identified; original prompt retained in project.json`);
    if(job.generator==='reference'){
      if(!options.referenceFixture)throw Error('Reference generator is reserved for explicit acceptance samples');
      const generated=writeReferenceApp(root);job.traceability=[{id:'R-001',text:'Persist, search and delete offline notes',status:'implemented-test-linked',files:generated,tests:['tests/notes.test.cjs']},{id:'R-002',text:'Install and run standalone on clean Windows',status:'pending-windows-acceptance',files:['electron-main.cjs'],tests:['installer/windows/accept-generated-app.ps1']}];
      logStage(job,'generation','passed','Created deterministic reference app: '+generated.join(', '));
    }else{
      if(typeof aiGenerate!=='function')return fail('blocked','Configure an online or offline coding model before full AI generation.');
      const groups=[];const requirements=job.traceability.length?job.traceability:[{id:'R-001',text:meta.prompt}];
      for(let i=0;i<requirements.length;i+=Math.max(1,options.batchSize||4))groups.push(requirements.slice(i,i+Math.max(1,options.batchSize||4)));
      let n=0;for(const group of groups){n++;logStage(job,'generation','running',`Generating requirement batch ${n}/${groups.length}`);const augmented={...meta,prompt:`Build these requirements in executable source code, with matching tests. Integrate with previously generated files. Include each requirement ID as a comment in relevant tests.\n${group.map(x=>x.id+': '+x.text).join('\n')}\nGlobal project context:\n${meta.prompt.slice(0,17000)}`};const response=await aiGenerate(augmented,{files:collectContext(root)});const files=writeGenerated(root,response.files);for(const item of group){item.files.push(...files);item.status='generated-unverified'}logStage(job,'generation','passed',`Batch ${n}: ${files.length} files; ${response.model||'model'}`)}
    }
    traceAndWrite(job,root);
    if(job.generator==='ai'&&meta.template==='web'){if(!fs.existsSync(path.join(root,'index.html')))return fail('blocked','AI generation did not produce index.html');if(!fs.existsSync(path.join(root,'tests'))||!fs.readdirSync(path.join(root,'tests')).length)return fail('blocked','AI output has no executable tests; request tests before release');}
    if(job.target==='windows'&&meta.template!=='web'&&job.generator!=='reference')return fail('blocked','Windows standalone packaging currently supports web/Electron targets only; use an appropriate framework-specific packaging adapter for this project.');
    if(job.target==='windows')prepareDesktopApp(root,job.generator==='reference'?'OpenForge Notes':meta.name);
    const dep=await execStage(job,'dependencies',root,options);if(!dep.ok)return fail(dep.blocked?'awaiting-approval':'failed','Dependency installation did not complete. See job commands.');
    let built=await execStage(job,'compilation',root,options);
    const maxRepairs=Math.max(0,Math.min(Number(options.maxRepairs??2),5));let attempt=0;
    while(!built.ok&&!built.blocked&&job.generator==='ai'&&typeof aiGenerate==='function'&&attempt<maxRepairs){attempt++;logStage(job,'automated-repair','running',`Repair attempt ${attempt}/${maxRepairs}`);const proposal=await aiGenerate({...meta,prompt:`Fix this compile failure. Modify only necessary source files and add regression tests.\n${built.stderr.slice(-10000)}\nOriginal:\n${meta.prompt.slice(0,12000)}`},{files:collectContext(root)});writeGenerated(root,proposal.files);logStage(job,'automated-repair','passed',`Updated ${Object.keys(proposal.files).length} files`);built=await execStage(job,'compilation',root,options);}
    if(!built.ok)return fail(built.blocked?'awaiting-approval':'failed','Compilation did not complete after available repair attempts.');
    let tested=await execStage(job,'testing',root,options);
    while(!tested.ok&&!tested.blocked&&job.generator==='ai'&&typeof aiGenerate==='function'&&attempt<maxRepairs){attempt++;logStage(job,'automated-repair','running',`Test repair attempt ${attempt}/${maxRepairs}`);const response=await aiGenerate({...meta,prompt:`Fix failing tests, retain expected behavior and add regression tests:\n${tested.stderr.slice(-8000)}\n${tested.stdout.slice(-4000)}`},{files:collectContext(root)});writeGenerated(root,response.files);logStage(job,'automated-repair','passed',`Updated ${Object.keys(response.files).length} files`);built=await execStage(job,'compilation',root,options);if(!built.ok)continue;tested=await execStage(job,'testing',root,options)}
    if(!tested.ok)return fail(tested.blocked?'awaiting-approval':'failed','Automated tests failed or execution needs approval.');
    if(job.generator==='reference')job.traceability[0].status='test-passed';traceAndWrite(job,root);
    if(job.target==='windows'){
      if(process.platform!=='win32')return fail('awaiting-windows-runner','Source compiled and tests passed; Windows x64 installer and clean-machine acceptance require a Windows build runner.');
      const packaged=await execStage(job,'packaging',root,options);if(!packaged.ok)return fail(packaged.blocked?'awaiting-approval':'failed','Windows packaging did not complete.');
      const installer=fs.readdirSync(path.join(root,'dist')).find(f=>/^OpenForge-Generated-Setup-.*\.exe$/i.test(f));if(!installer)return fail('failed','Packaging returned success but no .exe installer was produced.');
      const full=path.join(root,'dist',installer);job.artifacts.push({file:full,size:fs.statSync(full).size,sha256:sha256(full),type:'windows-nsis-installer'});
      job.status='awaiting-windows-acceptance';logStage(job,'acceptance','pending','Run the clean Windows installation acceptance script; no production claim until evidence is collected.');return publicJob(job);
    }
    if(job.target==='web'){
      const out=path.join(job.runDir,'openforge-web-bundle.zip');await zipProject(root,out);job.artifacts.push({file:out,size:fs.statSync(out).size,sha256:sha256(out),type:'web-source-bundle'});job.status='built-requires-review';logStage(job,'acceptance','pending','Unit tests passed. Human requirements review and browser E2E must be completed before production acceptance.');return publicJob(job);
    }
    return fail('blocked','Unsupported packaging target '+job.target);
  }catch(e){return fail('failed',String(e?.stack||e).slice(-5000))}finally{active.delete(job.runDir)}
}
module.exports={runPipeline,getJob,PHASES,safeRelative,inside,writeGenerated,systemCommand,prepareDesktopApp,writeReferenceApp};
