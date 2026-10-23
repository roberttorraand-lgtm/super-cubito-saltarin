"""Real WebRTC/relay tests and screenshots. Requires Python Playwright + Chromium.
Uses disposable local brokers; no public service or release is modified.
"""
import contextlib,json,os,pathlib,subprocess,urllib.request
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
SHOTS=ROOT/'docs'/'screenshots'
SHOTS.mkdir(parents=True,exist_ok=True)
@contextlib.contextmanager
def broker():
    code="import {createGameServer} from './server.js';const app=createGameServer();app.server.listen(0,'127.0.0.1',()=>console.log(app.server.address().port));process.stdin.on('data',s=>{if(String(s).trim()==='cut')app.signaling.close();});"
    proc=subprocess.Popen(['node','--input-type=module','-e',code],cwd=ROOT,stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
    url='http://127.0.0.1:'+proc.stdout.readline().strip()
    try:yield proc,url
    finally:proc.terminate();proc.wait(timeout=5)
def health(url):
    with urllib.request.urlopen(url+'/health') as r:return json.load(r)
def fps(page):
    return page.evaluate("""()=>new Promise(resolve=>{let start,last,n=0;function f(t){start??=t;last=t;n++;if(t-start<2200)requestAnimationFrame(f);else resolve(Math.round((n-1)*10000/(last-start))/10);}requestAnimationFrame(f);})""")
report={}
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-features=WebRtcHideLocalIpsWithMdns','--allow-loopback-in-peer-connection','--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows'])
    errors=[]
    def page(url,name):
        p=browser.new_page(viewport={'width':1440,'height':900});p.add_init_script("const Native=RTCPeerConnection;window.__iceCount=0;window.RTCPeerConnection=class extends Native{constructor(...a){super(...a);this.addEventListener('icecandidate',e=>{if(e.candidate)window.__iceCount++});}};");p.on('pageerror',lambda e:errors.append(str(e)));p.goto(url,wait_until='networkidle');p.fill('#name',name);return p
    # Measure just one client and capture the real UI, not a mock-up.
    with broker() as (_,url):
        p=page(url,'Guardia');p.wait_for_timeout(500);p.screenshot(path=str(SHOTS/'v0.5-menu.png'))
        p.locator('details summary').first.click();p.check('#show-fps');p.select_option('#quality','normal');p.locator('details summary').first.click()
        p.click('#solo');p.wait_for_selector('#ready',state='visible');p.click('#start');p.wait_for_selector('#ready',state='hidden');p.wait_for_timeout(1500)
        report['single_normal_fps']=fps(p);p.screenshot(path=str(SHOTS/'v0.5-seguridad.png'))
        p.keyboard.press('Tab');p.wait_for_selector('#phone',state='visible');p.click('[data-camera="1"]');p.wait_for_timeout(500);p.screenshot(path=str(SHOTS/'v0.5-camaras.png'));p.keyboard.press('Tab');p.wait_for_selector('#phone',state='hidden')
        p.evaluate("()=>{const q=document.querySelector('#quality');q.value='low';q.dispatchEvent(new Event('change'));}");p.wait_for_timeout(500);report['single_low_fps']=fps(p);p.screenshot(path=str(SHOTS/'v0.5-ligero.png'));print(json.dumps(report),flush=True)
        p.close()
    # Direct connection: the broker can go away without stopping the simulation.
    with broker() as (proc,url):
        host=page(url,'Anfitrión');host.click('#create');host.wait_for_selector('#ready',state='visible');code=host.locator('#room-code').text_content().split()[1]
        guest=page(url,'Compañero');guest.fill('#code',code);guest.click('#join');guest.wait_for_selector('#ready',state='visible')
        guest.wait_for_function("()=>/DIRECTA|APOYO/.test(document.querySelector('#network').textContent)",timeout=15000)
        direct='DIRECTA' in guest.locator('#network').text_content()
        host.wait_for_function("()=>!document.querySelector('#start').disabled");host.click('#start');guest.wait_for_selector('#ready',state='hidden');guest.keyboard.down('KeyW');guest.wait_for_timeout(650);guest.keyboard.up('KeyW')
        assert health(url)['simulationRooms']==0
        host.screenshot(path=str(SHOTS/'v0.5-cooperativo.png'))
        host.keyboard.press('Escape');host.click('#save');host.wait_for_function("()=>document.querySelector('#save-status').textContent.includes('guardada')");host.click('#resume')
        if direct:
            before=guest.locator('#clock').text_content();proc.stdin.write('cut\n');proc.stdin.flush();guest.wait_for_timeout(3000)
            assert guest.locator('#menu').is_hidden();assert guest.locator('#clock').text_content()!=before
            assert health(url)['simulationRooms']==0 and health(url)['linkRooms']==0
            report['direct_survives_broker_shutdown']=True
        else:
            assert host.evaluate('()=>window.__iceCount')==0 and guest.evaluate('()=>window.__iceCount')==0
            report['direct_test']='Unavailable: managed Chromium gathered no ICE candidates; automatic relay verified.'
        host.keyboard.press('Escape');host.locator('#pause [data-leave]').click();guest.wait_for_selector('#menu',state='visible',timeout=10000);assert 'anfitrión' in guest.locator('#error').text_content().lower()
        host.close();guest.close()
    # Forced relay: the relay forwards packets but still does not simulate a room.
    with broker() as (_,url):
        host=page(url,'Anfitrión');host.click('#create');host.wait_for_selector('#ready',state='visible');code=host.locator('#room-code').text_content().split()[1]
        guest=page(url,'Red restringida');guest.locator('details summary').first.click();guest.select_option('#link-mode','relay');guest.locator('details summary').first.click();guest.fill('#code',code);guest.click('#join');guest.wait_for_selector('#ready',state='visible')
        guest.wait_for_function("()=>document.querySelector('#network').textContent.includes('APOYO')");host.wait_for_function("()=>!document.querySelector('#start').disabled");host.click('#start');guest.wait_for_selector('#ready',state='hidden');guest.wait_for_timeout(500)
        assert health(url)['simulationRooms']==0;assert health(url)['linkRooms']==1
        report['relay_keeps_simulation_on_host']=True
        host.close();guest.wait_for_selector('#menu',state='visible');guest.close()
    assert not errors,errors
    report['page_errors']=errors;report['screenshots']=[p.name for p in SHOTS.glob('v0.5-*.png')]
    (SHOTS/'hosted-babylon-verification.json').write_text(json.dumps(report,indent=2),encoding='utf8')
    print(json.dumps(report));browser.close()
