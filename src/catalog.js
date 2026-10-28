// Alternative prompts per named door, alongside its original question.
const questionChoices={
 en:[
 ['Is there a story behind your name?','What nickname did you have growing up?'],
 ['What was your favourite place as a child?','What does home mean to you today?'],
 ['What was your favourite toy?','What did you collect as a child?'],
 ['What was your first pet like?','Which person from childhood do you remember especially clearly?'],
 ['What was your favourite childhood meal?','Which family tradition would you like to keep?'],
 ['What music did you listen to as a teenager?','What did you want to be when you grew up?'],
 ['What small moment captures a friendship?','Who did you most enjoy spending time with after school?'],
 ['What was your favourite subject at school?','What skill have you taught yourself?'],
 ['What was the first country you visited abroad?','Which trip turned out differently than you expected?'],
 ['What hobby makes you lose track of time?','What instrument or sport have you enjoyed trying?'],
 ['Who was an early role model?','What unexpected encounter has stayed with you?'],
 ['Which decision changed more than you expected?','What opportunity would you like to try again?'],
 ['What was your first paid job?','What did you buy with your first earnings?'],
 ['Where have you felt especially at ease, and why?','Which family holiday do you remember fondly?'],
 ['How do you like your coffee or tea?','What everyday ritual would you not want to give up?'],
 ['Which song can you listen to again and again?','Which possession would you hate to be without?'],
 ['What was your first attempt at a new hobby like?','What skill are you pleased to have learned?'],
 ['What do you like to watch, read or listen to when you relax?','Where do you go when you want a little peace and quiet?'],
 ['What do you think people underestimate in life?','What have you changed your mind about?','What gives your life meaning?'],
 ['What would your ideal free day look like?','What would you love to experience for the first time again?'],
 ['What did you think the future would look like when you were young?','What everyday thing has changed most since your childhood?'],
 ['Which skill would you like to learn next?','Which adventure have you been putting off?'],
 ['What everyday object would you put in a time capsule?','What makes a good life, in your view?']
 ],
 de:[
 ['Gibt es eine Geschichte hinter deinem Namen?','Welchen Spitznamen hattest du früher?'],
 ['Was war dein Lieblingsort als Kind?','Was bedeutet Zuhause heute für dich?'],
 ['Was war dein liebstes Spielzeug?','Was hast du als Kind gesammelt?'],
 ['Wie war dein erstes Haustier?','Welche Person aus deiner Kindheit ist dir besonders in Erinnerung geblieben?'],
 ['Was war dein Lieblingsessen als Kind?','Welche Familientradition möchtest du bewahren?'],
 ['Welche Musik hast du als Teenager gehört?','Welchen Beruf wolltest du als Kind haben?'],
 ['Welcher kleine Moment beschreibt eine Freundschaft?','Mit wem hast du nach der Schule am liebsten Zeit verbracht?'],
 ['Was war dein Lieblingsfach in der Schule?','Welche Fähigkeit hast du dir selbst beigebracht?'],
 ['In welchem Land außerhalb deines Heimatlandes warst du zuerst?','Welche Reise verlief anders als geplant?'],
 ['Bei welchem Hobby vergisst du die Zeit?','Welches Instrument oder welche Sportart hast du gerne ausprobiert?'],
 ['Wer war dein erstes großes Vorbild?','Welche unerwartete Begegnung ist dir in Erinnerung geblieben?'],
 ['Welche Entscheidung hat mehr verändert, als du dachtest?','Welche Gelegenheit würdest du gerne noch einmal ergreifen?'],
 ['Was war dein erster bezahlter Job?','Was hast du von deinem ersten selbst verdienten Geld gekauft?'],
 ['An welchem Ort fühlst du dich besonders wohl, und warum?','An welchen Familienurlaub denkst du gerne zurück?'],
 ['Wie trinkst du deinen Kaffee oder Tee am liebsten?','Welches alltägliche Ritual möchtest du nicht aufgeben?'],
 ['Welches Lied kannst du immer wieder hören?','Welchen Gegenstand möchtest du nicht missen?'],
 ['Wie war dein erster Versuch mit einem neuen Hobby?','Welche erlernte Fähigkeit macht dich stolz?'],
 ['Was schaust, liest oder hörst du gerne zum Entspannen?','Wohin gehst du, wenn du etwas Ruhe möchtest?'],
 ['Was wird im Leben deiner Meinung nach unterschätzt?','Worüber hast du deine Meinung geändert?','Was gibt deinem Leben Sinn?'],
 ['Was wäre dein idealer freier Tag?','Was würdest du gerne noch einmal zum ersten Mal erleben?'],
 ['Wie hast du dir als Kind die Zukunft vorgestellt?','Was hat sich im Alltag seit deiner Kindheit besonders verändert?'],
 ['Welche Fähigkeit würdest du als Nächstes gerne lernen?','Welches Abenteuer schiebst du schon länger auf?'],
 ['Welchen Alltagsgegenstand würdest du in eine Zeitkapsel legen?','Was macht für dich ein gutes Leben aus?']
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
