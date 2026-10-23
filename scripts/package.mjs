import packager from '@electron/packager';
import {readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const platform=process.argv[2]??process.platform;
const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url)));
const result=await packager({dir:new URL('..',import.meta.url).pathname,name:'Turno Cero',executableName:'TurnoCero',platform,arch:'x64',electronVersion:pkg.devDependencies.electron,appVersion:pkg.version,asar:true,prune:true,overwrite:true,out:'dist',win32metadata:{CompanyName:'Brasa Burger',ProductName:'Turno Cero'},ignore:[/^\/docs($|\/)/,/^\/dist($|\/)/,/^\/\.git($|\/)/,/^\/\.github($|\/)/,/^\/test($|\/)/,/^\/scripts($|\/)/,/^\/render\.yaml$/],download:{cacheRoot:path.join(os.tmpdir(),'turno-cero-electron-cache')}});
for(const target of result){await writeFile(path.join(target,'LEEME.txt'),await readFile(new URL('../RELEASE.md',import.meta.url)));console.log(`Aplicación preparada: ${target}`);}
