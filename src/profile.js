let profileReturnDoor=null;
function openProfile(door=null){
 profileReturnDoor=door;
 $('name').value=state.name;$('birthday').value=state.birthday||'';$('birthplace').value=state.birthplace||'';
 $('birthday').max=new Date().toLocaleDateString('en-CA');
 $('legacyBirth').textContent=state.birth&&!state.birthday?`Previously saved birth year: ${state.birth}. Please add your full birthday.`:'';
 $('profileError').textContent='';renderResidences();if(! $('profileDialog').open)$('profileDialog').showModal();
}
function renderResidences(){
 $('residences').value=state.residences||'';
 $('residencesLabel').textContent=lang==='de'?'Wohnorte (freiwillig)':'Places you’ve lived (optional)';
 $('residencesHint').textContent=lang==='de'?'Erzähle von den Orten, die du Zuhause genannt hast. Ungefähre Jahre reichen, und du kannst das Feld auch leer lassen.':'List the places you’ve called home, with approximate years if you like. You can leave this blank.';
 $('residences').placeholder=lang==='de'?'Zum Beispiel: Brookfield bis 1991, Seabrook 1991–1994, danach Oakridge.':'For example: Brookfield until 1991, Seabrook 1991–1994, then Oakridge.';
}
function validBirthday(){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(state.birthday||''))return false;
 const date=new Date(state.birthday+'T00:00:00');if(Number.isNaN(+date)||date.getFullYear()<1900)return false;
 const [year,month,day]=state.birthday.split('-').map(Number);if(date.getFullYear()!==year||date.getMonth()+1!==month||date.getDate()!==day)return false;
 const today=new Date();let age=today.getFullYear()-year;if(today.getMonth()+1<month||(today.getMonth()+1===month&&today.getDate()<day))age--;return age>=18;
}
function profileComplete(){return Boolean(state.name.trim()&&validBirthday()&&state.birthplace?.trim())}
function finishProfile(){
 if(!profileComplete()){$('profileError').textContent=lang==='de'?'Bitte ergänze deinen Namen, dein vollständiges Geburtsdatum (18+), deinen Geburtsort.':'Please add your name, full birthday (18+), birthplace.';return}
 save();$('profileDialog').close();const door=profileReturnDoor;profileReturnDoor=null;if(door!==null)openDoor(door);
}
$('name').oninput=()=>{state.name=$('name').value;save()};
$('birthday').oninput=()=>{state.birthday=$('birthday').value;state.birth=state.birthday.slice(0,4);save()};
$('birthplace').oninput=()=>{state.birthplace=$('birthplace').value;save()};
$('residences').oninput=()=>{state.residences=$('residences').value;save()};
function profileDate(){return state.birthday?new Intl.DateTimeFormat(lang==='de'?'de-DE':'en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(state.birthday+'T12:00:00')):state.birth}
