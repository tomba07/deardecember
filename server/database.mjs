import Database from 'better-sqlite3';
import {mkdirSync,readFileSync,readdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {createHash} from 'node:crypto';
export function openDatabase(filename){
 mkdirSync(dirname(resolve(filename)),{recursive:true});
 const db=new Database(filename);db.pragma('journal_mode = WAL');db.pragma('foreign_keys = ON');db.pragma('busy_timeout = 5000');
 db.exec('CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TEXT NOT NULL)');
 for(const name of readdirSync(new URL('./migrations/',import.meta.url)).filter(name=>name.endsWith('.sql')).sort()){
  const sql=readFileSync(new URL('./migrations/'+name,import.meta.url),'utf8'),checksum=createHash('sha256').update(sql).digest('hex');
  const old=db.prepare('SELECT checksum FROM app_migrations WHERE name=?').get(name);
  if(old){if(old.checksum!==checksum)throw Error('Applied migration changed: '+name);continue}
  db.transaction(()=>{db.exec(sql);db.prepare('INSERT INTO app_migrations VALUES (?,?,?)').run(name,checksum,new Date().toISOString())})();
 }
 return db;
}
