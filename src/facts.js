function renderCalendarFacts(){
 $('calendarFacts').hidden=current!==0;if(current!==0)return;
 $('factsTitle').textContent=lang==='de'?'Ein paar Fakten zum Anfang':'A few facts to begin';
 $('factsHint').textContent=lang==='de'?'Hier gehören die Grundlagen deiner Geschichte hin. Du kannst dieses Türchen jederzeit wieder öffnen und etwas ergänzen oder ändern.':'Keep the basics of your story here. You can come back to this door to add or change them.';
 $('factNameLabel').textContent=lang==='de'?'Dein Name':'Your name';$('factBirthdayLabel').textContent=lang==='de'?'Geburtsdatum':'Birthday';$('factBirthplaceLabel').textContent=lang==='de'?'Geburtsort':'Birthplace';$('birthplace').placeholder=lang==='de'?'Stadt / Region, Land':'City / region, country';
 $('name').value=state.profile.name;$('birthday').type=lang==='de'?'text':'date';$('birthday').placeholder=lang==='de'?'TT/MM/JJJJ':'';$('birthday').inputMode=lang==='de'?'numeric':'';$('birthday').value=lang==='de'?numericBirthday(state.profile.dateOfBirth):state.profile.dateOfBirth||'';$('birthplace').value=state.profile.placeOfBirth||'';$('birthday').max=new Date().toLocaleDateString('en-CA');renderResidences();renderFactsError();
}
function renderFactsError(){$('factsError').textContent=($('birthday').value||state.profile.dateOfBirth)&&!validBirthday()?(lang==='de'?'Bitte gib ein gültiges Geburtsdatum ein, das nicht in der Zukunft liegt.':'Please use a valid birthday that is not in the future.'):''}
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
function factsComplete(){return Boolean(state.profile.name.trim()&&validBirthday()&&state.profile.placeOfBirth?.trim())}
$('name').oninput=()=>{state.profile.name=$('name').value;save()};
function numericBirthday(value){const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(value||'');return match?`${match[3]}/${match[2]}/${match[1]}`:''}
function parseGermanBirthday(value){
 const match=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
 if(!match)return '';
 const [,day,month,year]=match,date=new Date(Number(year),Number(month)-1,Number(day));
 return date.getFullYear()===Number(year)&&date.getMonth()+1===Number(month)&&date.getDate()===Number(day)?`${year}-${month.padStart(2,'0')}-${day.padStart(2,'0')}`:'';
}
$('birthday').oninput=()=>{state.profile.dateOfBirth=lang==='de'?parseGermanBirthday($('birthday').value):$('birthday').value;renderFactsError();save()};
$('birthday').onblur=()=>{if(lang==='de'&&validBirthday())$('birthday').value=numericBirthday(state.profile.dateOfBirth)};
$('birthplace').oninput=()=>{state.profile.placeOfBirth=$('birthplace').value;save()};
$('residences').oninput=()=>{state.profile.placesLived=$('residences').value;save()};
function profileDate(profile=state.profile){return lang==='de'?numericBirthday(profile.dateOfBirth):profile.dateOfBirth?new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(profile.dateOfBirth+'T12:00:00')):''}
