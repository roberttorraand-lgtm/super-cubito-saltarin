"""Optional real-browser regression check. Start npm start first.
Requires Python Playwright and Chromium; no browser dependencies are shipped to players.
CUBITO_URL and CHROMIUM_PATH override the local defaults.
"""
import json
import os
from playwright.sync_api import sync_playwright

URL = os.environ.get('CUBITO_URL', 'http://127.0.0.1:3000')
CHROMIUM = os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium')
SNAPSHOTS = """const Base=WebSocket;window.__seen=new Set();window.WebSocket=class extends Base{constructor(...a){super(...a);this.addEventListener('message',e=>{const m=JSON.parse(e.data);if(m.type==='welcome')window.__welcome=m;if(m.type==='state'){window.__state=m;for(const p of m.world.projectiles??[])__seen.add(p.kind);if(m.world.puddles?.length)__seen.add('puddle');}})}};"""
NO_WEBGL = """const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl2'?null:get.call(this,type,...args)};"""

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=CHROMIUM, args=['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    errors = []
    def page(context=None, compatible=False):
        p = (context or browser).new_page()
        p.on('pageerror', lambda error: errors.append(str(error)))
        p.add_init_script(SNAPSHOTS)
        if compatible:
            p.add_init_script(NO_WEBGL)
        p.goto(URL, wait_until='networkidle')
        return p
    main = page()
    assert main.evaluate('cubitoGraphics().mode') == '2.5D'
    main.fill('#name', 'Tres dimensiones')
    main.click('#create')
    main.wait_for_function('window.__welcome')
    code = main.evaluate('__welcome.room')
    for label in ['LIGERO', 'ALTO', 'AUTO']:
        main.click('#graphics')
        assert label in main.locator('#graphics').text_content()
    # A 3D player and a compatible 2D player must share one authoritative room.
    other = page(compatible=True)
    assert other.evaluate('cubitoGraphics().mode') == '2D'
    other.fill('#name', 'Compatible')
    other.fill('#code', code)
    other.click('#join')
    main.wait_for_function('__state.players.length===2')
    other.wait_for_function('__state.players.length===2')
    main.keyboard.press('e')
    main.wait_for_function("__state.players.find(p=>p.id===__welcome.id).zone?.startsWith('home-')")
    assert not other.evaluate('__state.players.find(p=>p.id===__welcome.id).zone ?? null')
    other.keyboard.press('e')
    other.wait_for_function("__state.players.every(p=>p.zone?.startsWith('home-'))")
    room_x = main.evaluate('__welcome.level.houses[0].room.x')
    main.keyboard.down('ArrowRight')
    main.wait_for_function('x=>__state.players.find(p=>p.id===__welcome.id).x>x+640', arg=room_x)
    main.keyboard.up('ArrowRight')
    main.keyboard.press('e')
    main.wait_for_function("!document.querySelector('#dialogue').hidden")
    # A GPU context loss must recover the current room without disconnecting it.
    main.evaluate("document.querySelector('#game').getContext('webgl2').getExtension('WEBGL_lose_context').loseContext()")
    main.wait_for_function("cubitoGraphics().mode==='2D'")
    assert main.locator('#lobby').is_hidden()
    assert main.evaluate('__state.players.length') == 2
    main.close(); other.close()
    mobile_context = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=2, has_touch=True, is_mobile=True, reduced_motion='reduce')
    mobile = page(mobile_context)
    mobile.fill('#name', 'Móvil')
    mobile.locator('#solo').tap()
    mobile.wait_for_function('window.__state')
    assert mobile.evaluate('cubitoGraphics().mode') == '2.5D'
    assert mobile.evaluate('cubitoGraphics().quality') == 'ligera'
    assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
    mobile.locator('#game').scroll_into_view_if_needed()
    mobile.locator('[data-power="2"]').tap()
    mobile.wait_for_function('__state.players[0].power===2')
    button = mobile.locator('[data-key="KeyR"]')
    button.scroll_into_view_if_needed()
    box = button.bounding_box()
    mobile.mouse.move(box['x']+box['width']/2, box['y']+box['height']/2)
    mobile.mouse.down()
    mobile.wait_for_function('__state.players[0].fuel<150')
    mobile.mouse.up()
    mobile_context.close()
    # Inspect all worlds in isolation; switching maps must release old geometry.
    preview = browser.new_page(viewport={'width':1280,'height':720})
    preview.on('pageerror', lambda error: errors.append(str(error)))
    preview.route('**/app.js', lambda route: route.fulfill(status=200, body='', content_type='text/javascript'))
    preview.goto(URL, wait_until='networkidle')
    preview.evaluate("""async()=>{document.body.innerHTML='<canvas style="position:fixed;inset:0;width:100%;height:100%"></canvas>';const{Renderer3D}=await import('/renderer3d.js');const{soloLevels,newPlayer,createWorld}=await import('/game.js');window.s={r:new Renderer3D(document.querySelector('canvas')),levels:soloLevels,newPlayer,createWorld};s.r.setQuality('low');} """)
    memory = []
    for cycle in range(3):
        for index in range(4):
            metrics = preview.evaluate("""i=>{const m=s.levels[i];s.r.setLevel(m);const p=s.newPlayer('p','Cubito','#b4f669',m),w=s.createWorld();w.frame=90;s.r.draw([p],'p',1,1/60,w);p.x=m.boss.x+300;p.y=568;p.zone='boss';w.boss={hp:3,started:true,tick:125,open:0};s.r.draw([p],'p',1,1/60,w);return {...s.r.stats,geometry:s.r.gpu.info.memory.geometries,finite:s.r.camera.projectionMatrix.elements.every(Number.isFinite)};}""", index)
            assert metrics['mode'] == '2.5D' and metrics['calls'] > 0 and metrics['finite']
            if index == 0:
                memory.append(metrics['geometry'])
    assert max(memory)-min(memory) < 5, memory
    preview.close()
    assert not errors, errors
    print(json.dumps({'mixed_2D_3D_coop':True, 'houses_and_dialogue':True, 'quality_settings':True, 'context_recovery':True, 'mobile_jetpack':True, 'four_worlds_and_bosses':True, 'stable_geometry':memory, 'errors':errors}))
    browser.close()
