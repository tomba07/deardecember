import Database from 'better-sqlite3';
import {mkdir,cp} from 'node:fs/promises';
const directory=process.argv[2];if(!directory?.startsWith('/data/backups/'))throw Error('Backup directory required.');
await mkdir(directory,{recursive:true,mode:0o700});const db=new Database('/data/dear-december.sqlite');await db.backup(directory+'/dear-december.sqlite');db.close();await cp('/data/media',directory+'/media',{recursive:true});
