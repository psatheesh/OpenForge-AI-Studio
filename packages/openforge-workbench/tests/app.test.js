'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const os=require('node:os');
const path=require('node:path');
const fs=require('node:fs');
const http=require('node:http');
process.env.OPENFORGE_DATA=fs.mkdtempSync(path.join(os.tmpdir(),'openforge-test-'));
const {handle,analyze,safeRel}=require('../server');
let server,base;
test.before(async()=>{server=http.createServer(handle);await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));fs.rmSync(process.env.OPENFORGE_DATA,{recursive:true,force:true});});
const post=(path,data,method='POST')=>fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
test('analyzer extracts numbered and bullet requirements',()=>{let a=analyze('# Main app\n- Authentication\n- Database and API\n1. Offline mode');assert.equal(a.features.length,4);assert(a.tags.includes('Offline'));assert(a.tags.includes('Database'));});
test('blocks path traversal',()=>{assert.throws(()=>safeRel('../private'));assert.throws(()=>safeRel('/tmp/private'));assert.throws(()=>safeRel('evil\\path'));});
test('health and web assets reachable',async()=>{let h=await (await fetch(base+'/api/health')).json();assert.equal(h.ok,true);let r=await fetch(base+'/');assert.equal(r.status,200);assert.match(await r.text(),/OpenForge AI Studio/);});
test('create, list, open, edit, test, preview and export project',async()=>{
let r=await post('/api/projects',{name:'Hydraulic Designer',source:'ChatGPT',mode:'offline',template:'web',platforms:['Web','Windows'],prompt:'# Network\n- Pipe editor\n- Report export'});assert.equal(r.status,201);let c=await r.json(),id=c.project.id;assert.equal(c.project.mode,'offline');assert(c.files.some(x=>x.path==='index.html'));
let list=await(await fetch(base+'/api/projects')).json();assert(list.projects.some(x=>x.id===id));
let file=await(await fetch(base+'/api/projects/'+id+'/file?path=index.html')).json();assert.match(file.content,/Hydraulic Designer/);assert.match(file.content,/\?file=app.js/);
r=await post('/api/projects/'+id+'/file',{path:'src/custom.js',content:'const okay = true;'},'PUT');assert.equal(r.status,200);
let check=await(await post('/api/projects/'+id+'/test',{})).json();assert.equal(check.ok,true,check.stderr);
let preview=await fetch(base+'/api/projects/'+id+'/preview?file=index.html');assert.equal(preview.status,200);assert.match(await preview.text(),/Hydraulic Designer/);
let css=await fetch(base+'/api/projects/'+id+'/preview?file=style.css');assert.equal(css.status,200);
let exported=await fetch(base+'/api/projects/'+id+'/export');assert.equal(exported.status,200);let bytes=Buffer.from(await exported.arrayBuffer());assert.equal(bytes.subarray(0,2).toString(),'PK');
let patched=await(await post('/api/projects/'+id,{mode:'hybrid'},'PATCH')).json();assert.equal(patched.project.mode,'hybrid');
});
test('Python and API starter templates produce runnable tests',async()=>{
for(const template of ['python','api']){let r=await post('/api/projects',{name:'Check '+template,template,prompt:'- Print a greeting\n- Tests',mode:'offline',platforms:['Linux']});let p=await r.json();let result=await(await post('/api/projects/'+p.project.id+'/test',{})).json();assert.equal(result.ok,true,template+': '+result.stderr);}
});
test('remote AI requires configured model and does not pretend success',async()=>{let r=await post('/api/projects',{name:'AI test',prompt:'- Create working code',mode:'online'});let p=await r.json();r=await post('/api/projects/'+p.project.id+'/ai',{files:{}});assert.equal(r.status,422);assert.match((await r.json()).error,/not configured/);});
test('missing file and untrusted paths rejected',async()=>{let r=await post('/api/projects',{name:'Secure',prompt:'- Secure access'});let p=await r.json();r=await post('/api/projects/'+p.project.id+'/file',{path:'../../x.txt',content:'x'},'PUT');assert.equal(r.status,400);r=await fetch(base+'/api/projects/'+p.project.id+'/file?path=missing.txt');assert.equal(r.status,404);});
