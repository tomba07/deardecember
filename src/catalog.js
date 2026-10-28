// Alternative prompts per named door, alongside its original question.
const questionChoices={
 "en": [
  [
   "What is one of your earliest memories?",
   "What have you heard about the place where you were born?"
  ],
  [
   "What could you see from your window?",
   "What shops or landmarks were near your home?"
  ],
  [
   "Did you collect anything?",
   "Which childhood book, film or game do you remember?"
  ],
  [
   "Where did you play outside?",
   "What did a usual afternoon look like when you were a child?"
  ],
  [
   "Was there something that turned out to be less scary than expected?",
   "What made your room feel cosy at bedtime?"
  ],
  [
   "What do you like eating now?",
   "What food reminds you of a particular person?"
  ],
  [
   "What did you usually do during the holidays?",
   "Is there a little tradition you still enjoy?"
  ],
  [
   "What subject did you enjoy?",
   "What do you remember about your journey to school?"
  ],
  [
   "What did you and your friends do together?",
   "Where did you usually meet?"
  ],
  [
   "What music did you listen to?",
   "What clothes or hairstyle did you like?"
  ],
  [
   "What did you buy with your own money?",
   "What did you enjoy doing on your own for the first time?"
  ],
  [
   "What do you remember about a trip somewhere unfamiliar?",
   "What was something new you tried close to home?"
  ],
  [
   "What was everyday life like in one of those places?",
   "Which place would you like to visit again?"
  ],
  [
   "What do you usually do when you meet friends?",
   "How do you keep in touch with people who live elsewhere?"
  ],
  [
   "What hobby have you spent a lot of time on?",
   "What’s something you learned to do that took practice?"
  ],
  [
   "What music do you enjoy listening to?",
   "What meal could you happily eat every week?"
  ],
  [
   "What do you usually do first in the morning?",
   "What does a typical evening at home look like?"
  ],
  [
   "What would your ideal Saturday look like?",
   "What helps you unwind when you have some time off?"
  ],
  [
   "What are you reading, watching or playing?",
   "What are you making, growing or learning?"
  ],
  [
   "How do you take your coffee or tea?",
   "What do you always take with you when leaving home?"
  ],
  [
   "What’s a small moment that still makes you laugh?",
   "What’s a recent day you’d like to remember?"
  ],
  [
   "What’s something you’ve changed your mind about?",
   "What gives your life meaning?"
  ],
  [
   "Is there a place you’d like to visit?",
   "What are you looking forward to?"
  ]
 ],
 "de": [
  [
   "Was ist eine deiner frühesten Erinnerungen?",
   "Was wurde dir über deinen Geburtsort erzählt?"
  ],
  [
   "Was konntest du aus deinem Fenster sehen?",
   "Welche Geschäfte oder besonderen Orte waren in der Nähe?"
  ],
  [
   "Hast du etwas gesammelt?",
   "An welches Buch, welchen Film oder welches Spiel aus deiner Kindheit erinnerst du dich?"
  ],
  [
   "Wo hast du draußen gespielt?",
   "Wie sah ein gewöhnlicher Nachmittag als Kind aus?"
  ],
  [
   "War etwas am Ende weniger unheimlich als gedacht?",
   "Was hat dein Zimmer abends gemütlich gemacht?"
  ],
  [
   "Was isst du heute gerne?",
   "Welches Essen erinnert dich an einen bestimmten Menschen?"
  ],
  [
   "Was habt ihr an Feiertagen meistens gemacht?",
   "Welche kleine Tradition magst du bis heute?"
  ],
  [
   "Welches Schulfach mochtest du?",
   "Woran erinnerst du dich bei deinem Schulweg?"
  ],
  [
   "Was habt ihr im Freundeskreis zusammen gemacht?",
   "Wo habt ihr euch meistens getroffen?"
  ],
  [
   "Welche Musik hast du gehört?",
   "Welche Kleidung oder Frisur mochtest du?"
  ],
  [
   "Was hast du dir von deinem eigenen Geld gekauft?",
   "Was hast du zum ersten Mal gerne allein gemacht?"
  ],
  [
   "Woran erinnerst du dich bei einer Reise an einen unbekannten Ort?",
   "Was hast du in deiner Nähe Neues ausprobiert?"
  ],
  [
   "Wie sah der Alltag an einem dieser Orte aus?",
   "Welchen Ort würdest du gerne wieder besuchen?"
  ],
  [
   "Was macht ihr meistens, wenn ihr euch im Freundeskreis trefft?",
   "Wie hältst du Kontakt zu Menschen, die weiter weg wohnen?"
  ],
  [
   "Mit welchem Hobby hast du viel Zeit verbracht?",
   "Was hast du gelernt, wofür du üben musstest?"
  ],
  [
   "Welche Musik hörst du gerne?",
   "Welches Gericht könntest du jede Woche essen?"
  ],
  [
   "Was machst du morgens meistens als Erstes?",
   "Wie sieht ein typischer Abend zu Hause aus?"
  ],
  [
   "Wie sähe dein idealer Samstag aus?",
   "Wie entspannst du dich, wenn du frei hast?"
  ],
  [
   "Was liest, schaust oder spielst du im Moment?",
   "Was machst, pflanzt oder lernst du gerade?"
  ],
  [
   "Wie trinkst du deinen Kaffee oder Tee?",
   "Was nimmst du immer mit, wenn du das Haus verlässt?"
  ],
  [
   "Welche kleine Erinnerung bringt dich noch immer zum Lachen?",
   "Welchen Tag aus letzter Zeit möchtest du dir merken?"
  ],
  [
   "Worüber hast du deine Meinung geändert?",
   "Was gibt deinem Leben Sinn?"
  ],
  [
   "Welchen Ort würdest du gerne besuchen?",
   "Worauf freust du dich?"
  ]
 ]
};
let selectedQuestion=null;
let choosingQuestion=true;
function choicePrompt(day,index,language=lang){
 return index===0?question(day,language):index===3?(language==='de'?'Eine eigene Erinnerung':'A memory of your own'):questionChoices[language][day][index>3?index-2:index-1];
}
function questionAnswer(day,index){return entryForChoice(day,index)?.text||''}
function writeQuestionAnswer(value){
 if(selectedQuestion===null)return;
 let entry=entryForChoice(current,selectedQuestion);
 if(!entry&&value.trim()){
  if(state.entries.length>=ARCHIVE_LIMITS.entries){toast('The collection has reached its 2,000-entry limit.');return}
  entry=addTextEntry(value,{topic:(lang==='de'?deThemes:themes)[current],question:selectedQuestion===3?null:choicePrompt(current,selectedQuestion),binding:{day:current,choice:selectedQuestion}});insertForDoor(entry,current);
 }else if(entry)updateEntry(entry,{text:value});
 save();
}
function renderQuestionChoices(){
 $('saveClose').textContent=lang==='de'?'Speichern & schließen':'Save & close';
 $('questionChoiceHint').textContent=lang==='de'?'Wähle eine Frage, die eine Erinnerung weckt. Auch kleine Alltagsdetails sind es wert, bewahrt zu werden.':'Pick a question that sparks a memory. Small, everyday details are worth keeping.';
 $('questionPicker').hidden=!choosingQuestion;
 $('questionResponse').hidden=choosingQuestion;
 $('questionChoices').replaceChildren();
 renderAvailableQuestions();
 if(selectedQuestion!==null){$('question').textContent=entryForChoice(current,selectedQuestion)?.question||(typeof selectedQuestion==='object'?choicePrompt(current,3):choicePrompt(current,selectedQuestion));$('answer').value=questionAnswer(current,selectedQuestion)}
}

function renderAvailableQuestions(){
 const container=$('questionChoices');
 const choices=choosingQuestion?[0,...questionChoices[lang][current].map((_,index)=>index<2?index+1:index+2),3]:[];
 for(const button of [...container.children])if(!choices.includes(Number(button.dataset.choice)))button.remove();
 for(const index of choices){
  if(container.querySelector(`[data-choice="${index}"]`))continue;
  const button=document.createElement('button');button.type='button';button.dataset.choice=index;
  button.textContent=choicePrompt(current,index);
  button.onclick=()=>{commitAndSave();selectedQuestion=index;choosingQuestion=false;renderQuestionChoices();renderPhotos();$('answer').focus();editor.scrollTop=0};const next=[...container.children].find(item=>choices.indexOf(Number(item.dataset.choice))>choices.indexOf(index));container.insertBefore(button,next||null);
 }
}
