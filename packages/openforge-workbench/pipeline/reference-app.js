'use strict';
const fs = require('node:fs');
const path = require('node:path');

/** Deterministic end-to-end acceptance fixture: a real, offline notes application. */
function writeReferenceApp(root) {
  const files = {
    'index.html': `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OpenForge Notes</title><link rel="stylesheet" href="style.css"></head>
<body><main><header><span class="eyebrow">OPENFORGE GENERATED APPLICATION</span><h1>Offline Notes</h1><p>Private notes, saved on this computer. No account or network required.</p></header><form id="note-form"><label for="note-title">Title</label><input id="note-title" placeholder="Note title" required maxlength="160"><label for="note-text">Content</label><textarea id="note-text" placeholder="Write a note..." required></textarea><button type="submit">Save note</button></form><label for="note-search">Search notes</label><input id="note-search" placeholder="Search by title or content"><p id="note-count" role="status"></p><section id="notes" aria-live="polite"></section></main><script src="notes.js"></script><script src="app.js"></script></body></html>`,
    'style.css': `*{box-sizing:border-box}body{font:16px/1.6 system-ui,sans-serif;background:#0d1726;color:#f1f5fa;margin:0}main{max-width:880px;margin:35px auto;padding:0 18px}.eyebrow{color:#80dbc7;letter-spacing:.11em;font-size:12px}h1{font-size:44px;margin:0}header p{color:#aebed2}form,.note{background:#1a2c43;border:1px solid #3f536b;border-radius:12px;padding:18px;margin:20px 0}label{display:block;margin:15px 0 5px;font-weight:600}input,textarea{width:100%;background:#0b1423;color:#fff;border:1px solid #60728b;border-radius:7px;padding:12px;font:inherit}textarea{min-height:110px}button{background:#71dfca;color:#0b1a25;padding:10px 18px;border:0;border-radius:7px;font-weight:700;margin-top:12px;cursor:pointer}.note button{background:#f2ada5}.note h2{margin:0}#note-count{color:#b8c5d4}#notes:empty:after{content:'Your saved notes will appear here.';color:#9aabc0}`, 
    'notes.js': `'use strict';
/* Independently testable model, shared by the renderer and acceptance tests. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.OpenForgeNotes=factory();})(typeof globalThis!=='undefined'?globalThis:this,function(){
  function createStore(storage){const key='openforge-notes-v1';const read=()=>{let v;try{v=JSON.parse(storage.getItem(key)||'[]')}catch{v=[]}return Array.isArray(v)?v:[]};const save=items=>storage.setItem(key,JSON.stringify(items));return {list(query=''){const q=String(query).toLowerCase();return read().filter(n=>n.title.toLowerCase().includes(q)||n.text.toLowerCase().includes(q))},add(title,text){title=String(title||'').trim();text=String(text||'').trim();if(!title||!text)throw Error('Title and content are required');const item={id:String(Date.now())+'-'+Math.random().toString(36).slice(2,9),title,text,created:new Date().toISOString()};save([item,...read()]);return item},remove(id){const before=read();save(before.filter(n=>n.id!==id));return before.length!==read().length}};}
  return{createStore};});`,
    'app.js': `'use strict';
const store=OpenForgeNotes.createStore(window.localStorage);const form=document.getElementById('note-form');const search=document.getElementById('note-search');const notes=document.getElementById('notes');const count=document.getElementById('note-count');
function render(){notes.replaceChildren();const entries=store.list(search.value);count.textContent=entries.length+' note(s)';for(const item of entries){const card=document.createElement('article');card.className='note';const heading=document.createElement('h2');heading.textContent=item.title;const body=document.createElement('p');body.textContent=item.text;const btn=document.createElement('button');btn.type='button';btn.textContent='Delete';btn.setAttribute('aria-label','Delete '+item.title);btn.addEventListener('click',()=>{store.remove(item.id);render()});card.append(heading,body,btn);notes.append(card)}}
form.addEventListener('submit',event=>{event.preventDefault();store.add(document.getElementById('note-title').value,document.getElementById('note-text').value);form.reset();render()});search.addEventListener('input',render);render();`,
    'tests/notes.test.cjs': `'use strict';const test=require('node:test');const assert=require('node:assert/strict');const{createStore}=require('../notes.js');
function storage(){const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}}
test('create, search and delete notes',()=>{const s=createStore(storage());const a=s.add('Pump calculations','Flow 1250 gpm');assert.equal(s.list().length,1);assert.equal(s.list('pump').length,1);assert.equal(s.list('NOTFOUND').length,0);assert.equal(s.remove(a.id),true);assert.equal(s.list().length,0)});
test('notes persist across store instances',()=>{const memory=storage();createStore(memory).add('Offline','Runs without network');assert.equal(createStore(memory).list()[0].title,'Offline')});
test('reject empty notes',()=>{const s=createStore(storage());assert.throws(()=>s.add('','content'));assert.throws(()=>s.add('title',''))});`,
    'REQUIREMENTS.md': `# OpenForge Notes — verified acceptance fixture\n\nAcceptance scope: create, persist, search and delete notes offline; install on a clean Windows x64 runner and start with Node.js/Yarn removed from PATH. This fixture proves the release pipeline only for this sample application; it is not proof that arbitrary pasted prompts are fully implemented.\n`,
    'openforge.manifest.json': JSON.stringify({name:'OpenForge Notes',template:'web',platforms:['Windows','Web'],generation:'deterministic-acceptance-fixture',requirements:[{id:'R-001',text:'Create and persist notes offline',test:'tests/notes.test.cjs'},{id:'R-002',text:'Search notes',test:'tests/notes.test.cjs'},{id:'R-003',text:'Delete notes',test:'tests/notes.test.cjs'},{id:'R-004',text:'Install and run without separate Node.js or Yarn',test:'installer/windows/accept-generated-app.ps1'}]},null,2),
  };
  for(const [rel,content] of Object.entries(files)){const dest=path.join(root,rel);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,content)}
  return Object.keys(files);
}
module.exports={writeReferenceApp};
