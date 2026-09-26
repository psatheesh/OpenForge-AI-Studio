"""Headless UI / offline Notes test; browser policy requires in-memory page content.
Requires Python Playwright/Chromium. It checks real DOM interactions against the local
HTTP API via a test-only fetch bridge, not a production Windows installation.
"""
import json, os, pathlib, subprocess, tempfile, time, urllib.request
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parents[1]
DATA=pathlib.Path(tempfile.mkdtemp(prefix='openforge-browser-'))
PORT='47819'
env={**os.environ,'OPENFORGE_DATA':str(DATA),'PORT':PORT,'HOST':'127.0.0.1'}
server=subprocess.Popen(['node',str(ROOT/'packages/openforge-workbench/server.js')],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
base=f'http://127.0.0.1:{PORT}'
def get(path):
    with urllib.request.urlopen(base+path) as r:return json.load(r)
def post(path,body):
    with urllib.request.urlopen(urllib.request.Request(base+path,data=json.dumps(body).encode(),headers={'Content-Type':'application/json'})) as r:return json.load(r)
try:
    for i in range(60):
        try:
            if get('/api/health')['ok']:break
        except Exception:time.sleep(.1)
    else:raise RuntimeError('OpenForge local server did not start')
    project=post('/api/acceptance/sample',{})['project'];project_id=project['id']
    static=ROOT/'packages/openforge-workbench/public'
    html=(static/'index.html').read_text().replace('<link rel="stylesheet" href="/style.css">','<style>'+(static/'style.css').read_text()+'</style>').replace('<script src="/config.js"></script>','<script>window.OPENFORGE_AUTH_REQUIRED=false;</script>').replace('<script src="/app.js"></script>','<script>'+(static/'app.js').read_text()+'</script>')
    html=html.replace('</head>', '''<script>Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:()=>null,setItem:()=>{}}});window.fetch=async function(url,options){let r=await window.bridgeFetch(String(url),{method:options?.method||'GET',body:options?.body||null,headers:options?.headers||{}});return new Response(r.body,{status:r.status,headers:{'Content-Type':r.contentType||'application/json'}})}</script></head>''')
    def bridge(url,options):
        from urllib.error import HTTPError
        payload=options.get('body')
        request=urllib.request.Request(base+url,data=(payload.encode() if payload is not None else None),method=options.get('method','GET'),headers=options.get('headers',{}))
        try:
            with urllib.request.urlopen(request,timeout=20) as r:return {'status':r.status,'body':r.read().decode(),'contentType':r.headers.get('Content-Type','application/json')}
        except HTTPError as e:return {'status':e.code,'body':e.read().decode(),'contentType':'application/json'}
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        page=browser.new_page(viewport={'width':1512,'height':920},device_scale_factor=1)
        page.expose_function('bridgeFetch',bridge)
        page.on('dialog',lambda dialog:dialog.accept())
        page.set_content(html)
        page.locator('.side-link[data-nav="projects"]').click()
        page.locator('#allProjects .project-card').filter(has_text='OpenForge Notes').first.click()
        page.locator('#pipelineTarget').select_option('web')
        page.locator('#approveExecution').check()
        page.locator('#pipelineBtn').click()
        page.wait_for_function("document.querySelector('#pipelineStatus').textContent.includes('built-requires-review')",timeout=30000)
        assert page.locator('#pipelineArtifacts a').count()==1
        page.screenshot(path='/mnt/data/openforge-v0.6-pipeline-ui.png',full_page=True)
        print('BROWSER UI: completed web generation pipeline displayed with downloadable artifact')
        files=DATA/project_id/'files'
        source=(files/'index.html').read_text().replace('<link rel="stylesheet" href="style.css">','<style>'+(files/'style.css').read_text()+'</style>').replace('<script src="notes.js"></script>','<script>'+(files/'notes.js').read_text()+'</script>').replace('<script src="app.js"></script>','<script>'+(files/'app.js').read_text()+'</script>')
        def render_app(initial=None):
            page=browser.new_page(viewport={'width':1140,'height':850})
            seed=json.dumps(initial or {})
            page.set_content(source.replace('</head>',f'<script>window.__stored={seed};Object.defineProperty(window,"localStorage",{{configurable:true,value:{{getItem:k=>window.__stored[k]||null,setItem:(k,v)=>window.__stored[k]=v}}}});</script></head>'))
            return page
        app=render_app()
        app.locator('#note-title').fill('Hydraulic report');app.locator('#note-text').fill('1250 gpm fire pump')
        app.get_by_role('button',name='Save note').click()
        assert app.get_by_text('Hydraulic report').count()==1
        stored=app.evaluate('window.__stored');app.close()
        app=render_app(stored)
        assert app.get_by_text('Hydraulic report').count()==1
        app.locator('#note-search').fill('1250')
        assert app.get_by_text('Hydraulic report').count()==1
        app.get_by_role('button',name='Delete Hydraulic report').click()
        assert app.locator('#notes article').count()==0
        app.screenshot(path='/mnt/data/openforge-v0.6-generated-notes-offline.png',full_page=True)
        print('GENERATED APP: create, persist across page reconstruction, search and delete all passed without network')
        browser.close()
finally:
    server.terminate()
    try:server.wait(timeout=3)
    except subprocess.TimeoutExpired:server.kill()
