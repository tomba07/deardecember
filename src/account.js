// Account mode is advertised by the production backend. Static/local previews stay local.
(()=>{
 const el=id=>document.getElementById(id);
 let enabled=null,user=null,ready=false,revision=0,timer=null,dirty=false,saving=null,conflict=false,epoch=0,assetMap=new Map(),localDraft=null,mode='signin';
 const nav=document.createElement('button');nav.id='accountNav';nav.textContent='Sign in';nav.hidden=true;document.querySelector('header nav').append(nav);
 const status=document.createElement('p');status.id='accountSaveStatus';status.className='account-save-status';status.setAttribute('role','status');status.hidden=true;el('calendar').before(status);
 const panel=document.createElement('dialog');panel.id='accountDialog';panel.setAttribute('aria-labelledby','accountTitle');panel.innerHTML=`<button class="close" aria-label="Close account">×</button><h2 id="accountTitle">Sign in</h2><form id="accountForm"><label id="accountNameLabel">Your name<input id="accountName" autocomplete="name" maxlength="100"></label><label>Email<input id="accountEmail" type="email" autocomplete="email" required maxlength="254"></label><label id="accountPasswordLabel">Password<input id="accountPassword" type="password" autocomplete="current-password" minlength="12" maxlength="128" required></label><button class="primary" id="accountSubmit">Sign in</button></form><p id="accountMessage" role="status"></p><div class="account-links"><button id="accountSwitch">Create an account</button><button id="accountForgot">Forgot password?</button><button id="accountResend">Resend verification email</button></div><section id="accountSettings" hidden><p id="accountIdentity"></p><p>Your journal and photos are saved privately on our server. This is not end-to-end encrypted; the service operator can access content. No advertising or unrelated reuse.</p><button id="accountBackup">Download a full backup ↓</button><button id="accountRestore">Restore or import a journal ↑</button><button id="accountMigrate" hidden>Move this browser’s existing journal to my account</button><button id="accountReload" hidden>Load the latest journal from the server</button><button id="accountRetry" hidden>Retry saving my changes</button><button id="accountSignOut">Sign out</button><details><summary>Delete my account</summary><p>This permanently deletes your account, journal and photos from the live service. Backups are retained for up to 30 days. Download a copy first if you want to keep it.</p><label>Confirm your password<input id="accountDeletePassword" type="password" autocomplete="current-password"></label><button id="accountDelete">Delete my account and journal</button></details></section>`;document.body.append(panel);
 const showStatus=message=>{status.hidden=!enabled;status.textContent=message;if(enabled&&el('generationStorage'))el('generationStorage').textContent=message==='Saved to your account'?'':message;el('accountRetry').hidden=!dirty||conflict;el('accountReload').hidden=!conflict};
 const message=text=>el('accountMessage').textContent=text;
 async function api(path,options={}){
  const response=await fetch(path,{credentials:'same-origin',...options,headers:{...(options.body&&typeof options.body==='string'?{'Content-Type':'application/json'}:{}),...(user&&path.startsWith('/api/journal')?{'X-Journal-Account':user.id}:{}),...options.headers}});let result;try{result=await response.json()}catch{throw Error('The server could not be reached. Your edits remain on this page.')}
  if(!response.ok){const error=Error(result.error?.message||result.message||result.error||'The request failed. Please try again.');error.status=response.status;throw error}return result;
 }
 function resetView(){
  ready=false;for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
  state=emptyCollection();media=Object.create(null);generatedDraft=null;keepsakeRevealed=false;openedDoors=[];pendingEdits=new Map();entryBindings=new WeakMap();isSimulation=false;simulationBackup=null;el('simulationNotice').hidden=true;el('printSheet')?.remove();window.refreshSavedGeneration?.();applyLanguage();
 }
 window.requireAccount=()=>{if(enabled===false)return false;if(!ready){showAccount(user?'settings':'signin');if(user)message('Your journal is still loading. Please wait.');return true}return false};
 window.accountPersistence={get enabled(){return enabled===true},get signedIn(){return !!user},queue(){if(!ready||isSimulation)return;dirty=true;showStatus(lang==='de'?'Wird gespeichert…':'Saving…');clearTimeout(timer);timer=setTimeout(()=>flush().catch(()=>{}),700)},replace:async document=>{
  if(!ready||!user)throw Error('Sign in and wait for your journal to load first.');if(conflict)throw Error('Resolve the newer server version before restoring a backup.');
  clearTimeout(timer);if(saving)await saving;const snapshot=structuredClone({...document,collection:taggedManifest(document.collection)});await uploadAndSave(snapshot,epoch);dirty=false;showStatus('Saved to your account');
 }};
 async function uploadAndSave(document,token){
  if(token!==epoch||!user)throw Error('Account changed.');
  const paths=[...new Set(document.collection.entries.filter(entry=>entry.filePath).map(entry=>entry.filePath))];
  const assets={};
  for(const path of paths){
   const source=document.media?.[path];if(!source)throw Error('A photo is missing. Keep a backup before leaving.');
   const match=source.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s);if(!match)throw Error('Invalid photo data.');const blob=new Blob([Uint8Array.from(atob(match[2]),character=>character.charCodeAt(0))],{type:match[1]});
   if(!assetMap.has(path)){
    const asset=await api('/api/journal/assets?path='+encodeURIComponent(path),{method:'POST',headers:{'Content-Type':blob.type},body:blob});if(token!==epoch)throw Error('Account changed.');assetMap.set(path,asset);
   }else{
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(byte=>byte.toString(16).padStart(2,'0')).join('');if(assetMap.get(path).digest!==digest)throw Error('A different photo already uses this filename. Restore it with a new filename.');
   }
   assets[path]=source;
  }
  const {media:ignored,bindings,pending,...payload}=document;
  const result=await api('/api/journal',{method:'PUT',body:JSON.stringify({revision,document:payload})});if(token!==epoch)throw Error('Account changed.');revision=result.revision;assetMap=new Map([...assetMap].filter(([path])=>paths.includes(path)));
 }
 async function flush(){
  if(saving){await saving;if(!dirty)return;return flush()}
  if(!dirty||!ready||!user||conflict)return;
  clearTimeout(timer);commitEdits();const snapshot=structuredClone(storedDocument()),token=epoch;dirty=false;
  saving=uploadAndSave(snapshot,token).then(()=>{if(token===epoch)showStatus(dirty?'Saving…':'Saved to your account')}).catch(error=>{
   if(token!==epoch)return;dirty=true;conflict=error.status===409;showStatus(conflict?'Changed on another device — your edits are kept here. Open Account to resolve.':'Not saved — '+error.message);throw error;
  }).finally(()=>{saving=null});
  try{await saving}finally{if(dirty&&!conflict&&ready&&user){/* Explicit Retry prevents a failed request from looping. */}}
 }
 async function loadJournal(){
  const token=epoch;ready=false;showStatus('Loading your journal…');const result=await api('/api/journal'),assets={};
  const referenced=new Set(result.document.collection.entries.filter(entry=>entry.filePath).map(entry=>entry.filePath));
  for(const asset of result.assets){if(!referenced.has(asset.path))continue;const response=await fetch('/api/journal/assets/'+asset.id,{credentials:'same-origin',headers:{'X-Journal-Account':user.id}});if(!response.ok)throw Error('A photo could not be loaded. Please retry.');assets[asset.path]=await blobDataUrl(await response.blob())}
  if(token!==epoch)return;restoreDocument({...result.document,media:assets});inferBindings();lang=state.language.toLowerCase().startsWith('de')?'de':'en';revision=result.revision;assetMap=new Map(result.assets.map(asset=>[asset.path,asset]));dirty=false;conflict=false;ready=true;applyLanguage();showStatus('Saved to your account');return result;
 }
 async function refreshSession(){
  const session=await api('/api/auth/get-session');const next=session?.user?.emailVerified?session.user:null;
  if(next?.id!==user?.id){epoch++;clearTimeout(timer);dirty=false;conflict=false;assetMap=new Map();resetView();user=next}
  nav.hidden=false;nav.textContent=user?(lang==='de'?'Konto':'Account'):(lang==='de'?'Anmelden':'Sign in');
  if(user){await loadJournal();if(panel.open)panel.close()}else showStatus('Sign in to save your journal and continue on another device.');
 }
 function showAccount(nextMode='signin'){
  mode=user?'settings':nextMode;el('accountSettings').hidden=mode!=='settings';el('accountForm').hidden=mode==='settings';panel.querySelector('.account-links').hidden=mode==='settings';
  el('accountTitle').textContent={signin:'Sign in',signup:'Create your account',forgot:'Reset your password',reset:'Choose a new password',settings:'Your account'}[mode];
  el('accountNameLabel').hidden=mode!=='signup';el('accountName').required=mode==='signup';el('accountPasswordLabel').hidden=mode==='forgot';el('accountPassword').required=mode!=='forgot';el('accountEmail').closest('label').hidden=mode==='reset';el('accountEmail').required=mode!=='reset';el('accountPassword').autocomplete=mode==='signin'?'current-password':'new-password';
  el('accountSubmit').textContent={signin:'Sign in',signup:'Create account',forgot:'Send reset link',reset:'Save new password'}[mode]||'Sign in';el('accountSwitch').textContent=mode==='signin'?'Create an account':'Back to sign in';el('accountIdentity').textContent=user?.email||'';el('accountMigrate').hidden=!localDraft;message('');el('accountPassword').value='';el('accountDeletePassword').value='';if(!panel.open)panel.showModal();
 }
 nav.onclick=()=>showAccount(user?'settings':'signin');panel.querySelector('.close').onclick=()=>panel.close();el('accountSwitch').onclick=()=>showAccount(mode==='signin'?'signup':'signin');el('accountForgot').onclick=()=>showAccount('forgot');
 el('accountForm').onsubmit=async event=>{
  event.preventDefault();const submit=el('accountSubmit');submit.disabled=true;message('Please wait…');
  try{
   const email=el('accountEmail').value.trim(),password=el('accountPassword').value;
   if(mode==='signup'){await api('/api/auth/sign-up/email',{method:'POST',body:JSON.stringify({email,password,name:el('accountName').value.trim(),callbackURL:location.origin+'/'})});message('Check your email to verify your account, then sign in.');el('accountPassword').value=''}
   else if(mode==='forgot'){await api('/api/auth/request-password-reset',{method:'POST',body:JSON.stringify({email,redirectTo:location.origin+'/'})});message('If this email is registered, a reset link is on its way.')}
   else if(mode==='reset'){const token=new URL(location.href).searchParams.get('token');await api('/api/auth/reset-password',{method:'POST',body:JSON.stringify({newPassword:password,token})});history.replaceState(null,'',location.pathname);showAccount('signin');message('Password updated. Sign in to continue.')}
   else{await api('/api/auth/sign-in/email',{method:'POST',body:JSON.stringify({email,password})});await refreshSession()}
  }catch(error){message(error.message)}finally{submit.disabled=false}
 };
 el('accountResend').onclick=async()=>{try{await api('/api/auth/send-verification-email',{method:'POST',body:JSON.stringify({email:el('accountEmail').value.trim(),callbackURL:location.origin+'/'})});message('If eligible, a verification email is on its way.')}catch(error){message(error.message)}};
 el('accountBackup').onclick=()=>exportDraftBackup();el('accountRestore').onclick=()=>{panel.close();el('importFile').click()};el('accountRetry').onclick=()=>flush().catch(error=>message(error.message));
 el('accountReload').onclick=async()=>{if(!confirm('Load the server version and replace edits on this page? Download a backup first if you want to keep them.'))return;try{await loadJournal();message('Loaded the latest version.')}catch(error){message(error.message)}};
 el('accountMigrate').onclick=async()=>{
  if(!localDraft||!confirm('Move the journal saved in this browser into this account? This replaces the account journal. Download a backup first if it has content you want to keep.'))return;
  try{const snapshot=structuredClone(localDraft);snapshot.collection=taggedManifest(calendarCollection(snapshot.collection));await window.accountPersistence.replace(snapshot);const verified=await loadJournal();if(JSON.stringify(verified.document.collection)!==JSON.stringify(snapshot.collection)||Object.entries(snapshot.media||{}).some(([path,source])=>source.split(',')[1]!==media[path]?.split(',')[1]))throw Error('The saved copy could not be verified. Your browser copy has been kept.');localStorage.removeItem(DOCUMENT_KEY);localDraft=null;el('accountMigrate').hidden=true;message('Your existing journal and photos have moved to your account.')}catch(error){message(error.message)}
 };
 async function signOut(){
  if(dirty){try{await flush()}catch{}if(dirty&&!confirm('Some edits have not been saved. Download a backup before signing out. Sign out and discard these unsaved edits?'))return}
  await api('/api/auth/sign-out',{method:'POST',body:'{}'});epoch++;user=null;dirty=false;clearTimeout(timer);assetMap=new Map();resetView();nav.textContent='Sign in';showStatus('Signed out.');
 }
 el('accountSignOut').onclick=()=>signOut().catch(error=>message(error.message));
 el('accountDelete').onclick=async()=>{if(!el('accountDeletePassword').value){message('Enter your password to confirm deletion.');return}if(!confirm('Permanently delete your account, journal and photos?'))return;try{await api('/api/auth/delete-user',{method:'POST',body:JSON.stringify({password:el('accountDeletePassword').value})});epoch++;user=null;dirty=false;clearTimeout(timer);assetMap=new Map();resetView();nav.textContent='Sign in';showStatus('Account deleted.')}catch(error){message(error.message)}};
 window.applyAccountCopy=()=>{
  if(!enabled)return;const de=lang==='de';
  const copy=de?{introStorageTitle:'Dein Tagebuch, auf deinen Geräten.',introStorage:'Melde dich an, um deine Einträge und Fotos privat auf unserem Server zu speichern. Auf einem anderen Gerät kannst du mit deinem Konto weiterschreiben.',introTransfer:'Lade dein Tagebuch mit allen Fotos als ZIP-Backup herunter. Unter „Konto“ kannst du eine Sicherung wiederherstellen.',introOwnership:'Deine Informationen gehören dir. Keine Werbung oder zweckfremde Nutzung. Die Speicherung ist nicht Ende-zu-Ende-verschlüsselt; der Betreiber kann auf Inhalte zugreifen.',storageText:'Dein Tagebuch und deine Fotos werden in deinem Konto auf unserem Server gespeichert. Melde dich auf einem anderen Gerät an, um weiterzuschreiben. Lade regelmäßig ein eigenes Backup herunter.',storageReplace:'Unter „Konto“ kannst du eine ZIP-/JSON-Sicherung wiederherstellen. Das ersetzt nach Bestätigung den aktuellen Inhalt.',welcomePrivacy:'Deine Einträge sind privat deinem Konto zugeordnet. Keine Werbung oder zweckfremde Nutzung. Der Betreiber kann auf gespeicherte Inhalte zugreifen; es gibt keine Ende-zu-Ende-Verschlüsselung. Externe KI-Verarbeitung bleibt eine ausdrückliche Wahl.'}:{introStorageTitle:'Your journal, across your devices.',introStorage:'Sign in to save your entries and photos privately on our server. Use the same account on another device to continue writing.',introTransfer:'Download your journal and all photos as a ZIP backup. You can restore a backup under Account.',introOwnership:'Your information belongs to you. No advertising or unrelated reuse. Storage is not end-to-end encrypted; the service operator can access content.',storageText:'Your journal and photos are saved to your account on our server. Sign in on another device to continue. Keep your own downloaded backup too.',storageReplace:'Use Account to restore a ZIP/JSON backup. This replaces the current journal after confirmation.',welcomePrivacy:'Your entries are private to your account. No advertising or unrelated reuse. The service operator can access stored content; this is not end-to-end encrypted. External AI processing remains your explicit choice.'};
  for(const [id,text]of Object.entries(copy))if(el(id))el(id).textContent=text;
  el('footerOpen').hidden=true;el('devReset').hidden=true;nav.textContent=user?(de?'Konto':'Account'):(de?'Anmelden':'Sign in');
  for(const button of document.querySelectorAll('[onclick="exportDraftBackup()"]'))button.textContent=de?'Vollständiges Backup herunterladen ↓':'Download a full backup ↓';
  const savedHint=document.querySelector('#miniographyDialog>p.hint');if(savedHint)savedHint.textContent='Your text is kept with your account. Read it through before keeping or sharing it; AI can make mistakes.';
  if(el('generationStorage'))el('generationStorage').textContent=dirty?'Changes are waiting to be saved to your account.':'';
 };
 window.addEventListener('beforeunload',event=>{if(enabled&&dirty){event.preventDefault();event.returnValue=''}});
 window.addEventListener('online',()=>{if(enabled&&dirty&&!conflict)flush().catch(()=>{})});
 document.addEventListener('visibilitychange',()=>{if(enabled&&ready&&document.visibilityState==='hidden'&&dirty)flush().catch(()=>{})});
 document.addEventListener('visibilitychange',()=>{if(enabled&&document.visibilityState==='visible'&&user&&!dirty&&!saving)api('/api/auth/get-session').then(session=>{if(session?.user?.id!==user?.id){epoch++;user=null;dirty=false;resetView();nav.textContent='Sign in';showStatus('Your session ended. Sign in again.')}}).catch(()=>{})});
 async function initialize(){
  const calendarHidden=el('calendar').hidden;el('calendar').hidden=true;
  try{const response=await fetch('/api/account/config',{credentials:'same-origin'});if(response.status===404){enabled=false;return}if(!response.ok)throw Error();const config=await response.json();if(!config.accounts){enabled=false;return}
   try{const raw=localStorage.getItem(DOCUMENT_KEY);if(raw)localDraft=JSON.parse(raw)}catch{}
   enabled=true;resetView();window.applyAccountCopy();await refreshSession();
   const params=new URL(location.href).searchParams;if(params.has('token'))showAccount('reset');if(params.has('error')){showAccount('signin');message('The link is invalid or expired. Request a new one.')}
  }catch{enabled=true;ready=false;nav.hidden=false;showStatus('Unable to connect to your account. Please reload to try again. No local journal has been uploaded.')}finally{el('calendar').hidden=calendarHidden}
 }
 initialize();
})();
