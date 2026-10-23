"""Optional developer check; needs Python Playwright and an installed Chromium."""
import os
from playwright.sync_api import sync_playwright
URL=os.environ.get('TURNO_URL','http://127.0.0.1:3000')
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(URL,wait_until='networkidle')
    page.click('#solo');page.wait_for_selector('#ready',state='visible');page.click('#start');page.wait_for_selector('#ready',state='hidden')
    page.keyboard.press('Tab');page.wait_for_selector('#phone',state='visible');page.click('[data-camera="1"]')
    page.wait_for_function("()=>document.querySelector('#camera-label').textContent.startsWith('02')")
    page.keyboard.press('Tab');page.wait_for_selector('#phone',state='hidden');page.keyboard.press('Escape');page.wait_for_selector('#pause',state='visible')
    page.click('#save');page.wait_for_function("()=>document.querySelector('#save-status').textContent.includes('guardada')")
    page.locator('#pause [data-leave]').click();page.wait_for_selector('#menu',state='visible');assert page.locator('#continue').is_enabled()
    page.click('#continue');page.wait_for_selector('#ready',state='visible');page.click('#start');page.wait_for_selector('#ready',state='hidden')
    page.keyboard.press('Escape');page.locator('#pause [data-leave]').click()
    # Two rendered clients join a real room; only its host can start the turn.
    page.click('#create');page.wait_for_selector('#ready',state='visible')
    code=page.locator('#room-code').text_content().split()[1]
    assert page.locator('#start').is_disabled()
    second=browser.new_page(viewport={'width':1280,'height':800});second.on('pageerror',lambda e:errors.append(str(e)));second.goto(URL,wait_until='networkidle')
    second.fill('#code',code);second.click('#join');second.wait_for_selector('#ready',state='visible');page.wait_for_function("()=>!document.querySelector('#start').disabled")
    assert second.locator('#start').is_disabled();page.click('#start');page.wait_for_selector('#ready',state='hidden');second.wait_for_selector('#ready',state='hidden')
    page.keyboard.press('Escape');assert 'continúa' in page.locator('#pause-note').text_content()
    assert not errors,errors
    print('OK: renderer, phone cameras, local save/resume, two-client co-op and pause semantics; no page errors.')
    browser.close()
