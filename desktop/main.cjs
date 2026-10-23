const {app,BrowserWindow,ipcMain,session}=require('electron');
const path=require('node:path');
const fs=require('node:fs/promises');
let win,game;
app.whenReady().then(async()=>{
 const {createGameServer}=await import('../server.js');game=createGameServer();await new Promise(resolve=>game.server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${game.server.address().port}`;
 session.defaultSession.setPermissionRequestHandler((_wc,permission,callback)=>callback(permission==='pointerLock'||permission==='fullscreen'));
 win=new BrowserWindow({width:1366,height:800,minWidth:960,minHeight:600,backgroundColor:'#11100d',title:'Turno Cero',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});
 win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(event,url)=>{if(!url.startsWith(origin+'/'))event.preventDefault();});
 const check=e=>{if(e.sender!==win?.webContents)throw new Error('Emisor no permitido');};
 ipcMain.handle('save',async(e,data)=>{check(e);const text=JSON.stringify(data);if(text.length>150000||data?.version!==1)throw new Error('Partida no válida');const dir=app.getPath('userData');await fs.mkdir(dir,{recursive:true});const target=path.join(dir,'turno-cero.json');await fs.writeFile(target+'.tmp',text,'utf8');await fs.rename(target+'.tmp',target);return true;});
 ipcMain.handle('load',async(e)=>{check(e);try{return JSON.parse(await fs.readFile(path.join(app.getPath('userData'),'turno-cero.json'),'utf8'));}catch{return null;}});
 ipcMain.handle('fullscreen',(e)=>{check(e);win.setFullScreen(!win.isFullScreen());return win.isFullScreen();});
 ipcMain.handle('quit',(e)=>{check(e);app.quit();});
 await win.loadURL(origin);
});
app.on('window-all-closed',()=>app.quit());app.on('before-quit',()=>game?.close());
