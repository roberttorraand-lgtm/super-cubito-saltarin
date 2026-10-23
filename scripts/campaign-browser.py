"""Campaign UI and hosted-night integration, using accelerated saved-game fixtures.
No production clock or gameplay overrides. Requires Playwright + Chromium.
"""
import json,os,pathlib,subprocess
from playwright.sync_api import sync_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
SHOTS=ROOT/'docs'/'screenshots';SHOTS.mkdir(parents=True,exist_ok=True)
fixtures=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {newWorld,newPlayer,snapshot} from './shared/simulation.js';console.log(JSON.stringify([1,2,3,4,5].map(n=>{const w=newWorld(n);w.elapsed=959.9;return {...snapshot(w,[newPlayer('fixture','Guardia')]),mode:'solo'};})));"],cwd=ROOT,text=True))
proc=subprocess.Popen(['node','--input-type=module','-e',"import {createGameServer} from './server.js';const a=createGameServer();a.server.listen(0,'127.0.0.1',()=>console.log(a.server.address().port));"],cwd=ROOT,stdout=subprocess.PIPE,text=True)
url='http://127.0.0.1:'+proc.stdout.readline().strip()
report={'clock':'Normal gameplay clock; near-dawn saves accelerate test setup.','platform':'Linux Chromium / SwiftShader, not Windows hardware','nights':[]};errors=[]
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-background-timer-throttling','--disable-renderer-backgrounding'])
  p=browser.new_page(viewport={'width':1440,'height':1000});p.on('pageerror',lambda e:errors.append(str(e)));p.goto(url,wait_until='networkidle')
  def low(page):page.evaluate("()=>{const q=document.querySelector('#quality');q.value='low';q.dispatchEvent(new Event('change'));}")
  low(p);assert p.locator('#night-buttons button:disabled').count()==4
  p.screenshot(path=str(SHOTS/'v0.4-campana.png'),full_page=True)
  for n,save in enumerate(fixtures,1):
   p.evaluate('(save)=>localStorage.setItem("turno-cero.save",JSON.stringify(save))',save);p.reload(wait_until='networkidle');low(p)
   p.click('#continue');p.wait_for_selector('#ready',state='visible');assert f'NOCHE {n} / 5' in p.locator('#ready-night').text_content()
   p.click('#start');p.wait_for_selector('#ending',state='visible');p.wait_for_function('(n)=>JSON.parse(localStorage.getItem("turno-cero.campaign")).completed.includes(n)',arg=n)
   assert ('contrato' if n==5 else f'Noche {n}') in p.locator('#ending-title').text_content()
   if n==5:p.screenshot(path=str(SHOTS/'v0.4-final.png'))
   else:
    p.click('#next-night');p.wait_for_selector('#menu',state='visible');assert str(n+1).zfill(2) in p.locator('#night-title').text_content()
    # New shift starts with reset resources instead of carrying old progress.
    p.click('#solo');p.wait_for_selector('#ready',state='visible');assert f'NOCHE {n+1} / 5' in p.locator('#ready-night').text_content();assert '100%' in p.locator('#battery').text_content();assert '3 / 3' in p.locator('#lures').text_content();p.locator('#ready [data-leave]').click()
   report['nights'].append({'night':n,'victory_unlock_persisted':True});print(f'Noche {n}: victoria, desbloqueo y persistencia correctos',flush=True)
  p.locator('#ending [data-leave]').click();p.reload(wait_until='networkidle');low(p);assert p.locator('#night-buttons button:disabled').count()==0;assert p.locator('#campaign-count').text_content()=='5 / 5'
  p.screenshot(path=str(SHOTS/'v0.4-campana-completa.png'),full_page=True)
  # Resume in a real cut: overlay, camera loss, then recovery and ordinary save.
  save=fixtures[2];save['world']['elapsed']=300;save['world']['doors']['security']['closed']=True
  p.evaluate('(save)=>localStorage.setItem("turno-cero.save",JSON.stringify(save))',save);p.reload(wait_until='networkidle');low(p);p.click('#continue');p.wait_for_selector('#ready',state='visible');p.click('#start');p.wait_for_selector('#ready',state='hidden');p.wait_for_selector('#power-warning',state='visible');p.keyboard.press('Tab');p.wait_for_selector('#phone',state='visible');p.wait_for_selector('#signal-lost',state='visible');p.screenshot(path=str(SHOTS/'v0.4-corte-electrico.png'))
  p.wait_for_selector('#signal-lost',state='hidden',timeout=25000);p.keyboard.press('Tab');p.wait_for_selector('#phone',state='hidden');p.keyboard.press('Escape');p.wait_for_selector('#pause',state='visible');p.click('#save');p.wait_for_function('()=>{const w=JSON.parse(localStorage.getItem("turno-cero.save")).world;return w.night===3&&w.elapsed>=316;}');p.locator('#pause [data-leave]').click()
  report['blackout_and_recovery']=True;p.close()
  # The host chooses night four; a fresh guest joins that night, not night one.
  host=browser.new_page(viewport={'width':1200,'height':900});guest=browser.new_page(viewport={'width':1200,'height':900})
  for page in [host,guest]:page.on('pageerror',lambda e:errors.append(str(e)))
  host.goto(url);host.evaluate('()=>localStorage.setItem("turno-cero.campaign",JSON.stringify({completed:[1,2,3]}))');host.reload(wait_until='networkidle');low(host);host.click('#create');host.wait_for_selector('#ready',state='visible');code=host.locator('#room-code').text_content().split()[1]
  guest.goto(url,wait_until='networkidle');low(guest);guest.locator('details summary').first.click();guest.select_option('#link-mode','relay');guest.locator('details summary').first.click();guest.fill('#code',code);guest.click('#join');guest.wait_for_selector('#ready',state='visible');assert 'NOCHE 4 / 5' in guest.locator('#ready-night').text_content();host.wait_for_function('()=>!document.querySelector("#start").disabled');host.click('#start');guest.wait_for_selector('#ready',state='hidden');assert 'NOCHE 04' in guest.locator('#night-hud').text_content();host.keyboard.press('Escape');host.click('#save');host.wait_for_function('()=>JSON.parse(localStorage.getItem("turno-cero.save"))?.world?.night===4');report['host_night_shared_with_guest']=True
  host.close();guest.close();browser.close()
  assert not errors,errors;report['page_errors']=errors
  (SHOTS/'campaign-verification.json').write_text(json.dumps(report,indent=2),encoding='utf8');print(json.dumps(report))
finally:proc.terminate();proc.wait(timeout=5)
