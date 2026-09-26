const test=require('node:test'); const assert=require('node:assert/strict'); const fs=require('node:fs'); const path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
test('both Theia targets ship built-in OpenForge and native AI packages',()=>{
 for(const name of ['browser','desktop']) {const p=load(`applications/${name}/package.json`);assert.equal(p.dependencies['@openforge/product'],'0.2.0');
 for(const n of ['core','monaco','debug','terminal','scm','vsx-registry','ai-core','ai-chat','ai-ide','ai-ollama','ai-openai']) assert.equal(p.dependencies[`@theia/${n}`],'1.75.0');
 }});
test('custom AI agent is a product dependency, not separate extension install',()=>{const p=load('packages/openforge-product/package.json');assert.ok(p.theiaExtensions.some(x=>x.frontend));const b=fs.readFileSync(path.join(root,'packages/openforge-product/src/browser/openforge-frontend-module.ts'),'utf8');assert.match(b,/OpenForgeWorkbenchWidget/);assert.match(b,/OpenForgeAIBuilderAgent/);});
test('one launcher runs local builder with native IDE',()=>{const b=fs.readFileSync(path.join(root,'scripts/launch.js'),'utf8');assert.match(b,/openforge-workbench\/server\.js/);assert.match(b,/theia/);});
test('Theia versions are pinned consistently',()=>{for(const name of ['browser','desktop'])for(const [dep,version] of Object.entries(load(`applications/${name}/package.json`).dependencies))if(dep.startsWith('@theia/'))assert.equal(version,'1.75.0');});
