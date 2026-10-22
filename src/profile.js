let profileReturnDoor=null;
function openProfile(door=null){
 profileReturnDoor=door;
 $('name').value=state.profile.name;$('birthday').value=state.profile.dateOfBirth||'';$('birthplace').value=state.profile.placeOfBirth||'';
 $('birthday').max=new Date().toLocaleDateString('en-CA');
 $('legacyBirth').textContent='';
 $('profileError').textContent='';renderResidences();if(! $('profileDialog').open)$('profileDialog').showModal();
}
function renderResidences(){
 $('residences').value=state.profile.placesLived||'';
 $('residencesLabel').textContent=lang==='de'?'Wohnorte (freiwillig)':'Places you’ve lived (optional)';
 $('residencesHint').textContent=lang==='de'?'Erzähle von den Orten, die du Zuhause genannt hast. Ungefähre Jahre reichen, und du kannst das Feld auch leer lassen.':'List the places you’ve called home, with approximate years if you like. You can leave this blank.';
 $('residences').placeholder=lang==='de'?'Orte, die du Zuhause genannt hast. Ergänze ungefähre Jahre, wenn du möchtest.':'Places you’ve called home. Add approximate years if you like.';
}
function validBirthday(){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(state.profile.dateOfBirth||''))return false;
 const date=new Date(state.profile.dateOfBirth+'T00:00:00');if(Number.isNaN(+date)||date.getFullYear()<1900)return false;
 const [year,month,day]=state.profile.dateOfBirth.split('-').map(Number);if(date.getFullYear()!==year||date.getMonth()+1!==month||date.getDate()!==day)return false;
 return date<=new Date();
}
function profileComplete(){return Boolean(state.profile.name.trim()&&validBirthday()&&state.profile.placeOfBirth?.trim())}
function finishProfile(){
 if(!profileComplete()){$('profileError').textContent=lang==='de'?'Bitte ergänze deinen Namen, dein gültiges Geburtsdatum und deinen Geburtsort.':'Please add your name, a valid birthday and birthplace.';return}
 save();$('profileDialog').close();const door=profileReturnDoor;profileReturnDoor=null;if(door!==null)openDoor(door);
}
$('name').oninput=()=>{state.profile.name=$('name').value;save()};
$('birthday').oninput=()=>{state.profile.dateOfBirth=$('birthday').value;save()};
$('birthplace').oninput=()=>{state.profile.placeOfBirth=$('birthplace').value;save()};
$('residences').oninput=()=>{state.profile.placesLived=$('residences').value;save()};
function profileDate(){return state.profile.dateOfBirth?new Intl.DateTimeFormat(lang==='de'?'de-DE':'en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(state.profile.dateOfBirth+'T12:00:00')):''}
