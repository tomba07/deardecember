// Two alternative prompts per named door, alongside its original question.
const questionChoices={
 en:[
 ['Is there a story behind your name?','What nickname did you have growing up?'],
 ['What was your favourite place as a child?','What does home mean to you today?'],
 ['What was your favourite toy?','What did you collect as a child?'],
 ['What was your first pet like?','Which person from childhood do you remember especially clearly?'],
 ['What was your favourite childhood meal?','Which family tradition would you like to keep?'],
 ['What fashion or hairstyle did you once love?','What did you want to be when you grew up?'],
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
 ['What challenge did you manage to overcome?','What skill are you pleased to have learned?'],
 ['When did an unexpected kindness help you?','What gives you hope during an uncertain time?'],
 ['What do you think people underestimate in life?','What have you changed your mind about?'],
 ['What would your ideal free day look like?','What would you love to experience for the first time again?'],
 ['What advice would you give your 18-year-old self?','What would you like to tell yourself as a child?'],
 ['Which skill would you like to learn next?','Which adventure have you been putting off?'],
 ['What sentence would you leave your descendants in 500 years?','What makes a good life, in your view?']
 ],
 de:[
 ['Gibt es eine Geschichte hinter deinem Namen?','Welchen Spitznamen hattest du früher?'],
 ['Was war dein Lieblingsort als Kind?','Was bedeutet Zuhause heute für dich?'],
 ['Was war dein liebstes Spielzeug?','Was hast du als Kind gesammelt?'],
 ['Wie war dein erstes Haustier?','Welche Person aus deiner Kindheit ist dir besonders in Erinnerung geblieben?'],
 ['Was war dein Lieblingsessen als Kind?','Welche Familientradition möchtest du bewahren?'],
 ['Welche Mode oder Frisur fandest du damals großartig?','Welchen Beruf wolltest du als Kind haben?'],
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
 ['Welche Herausforderung hast du geschafft?','Welche erlernte Fähigkeit macht dich stolz?'],
 ['Wann hat dir eine unerwartete Freundlichkeit geholfen?','Was gibt dir in unsicheren Zeiten Hoffnung?'],
 ['Was wird im Leben deiner Meinung nach unterschätzt?','Worüber hast du deine Meinung geändert?'],
 ['Was wäre dein idealer freier Tag?','Was würdest du gerne noch einmal zum ersten Mal erleben?'],
 ['Welchen Rat würdest du deinem 18-jährigen Ich geben?','Was möchtest du deinem kindlichen Ich sagen?'],
 ['Welche Fähigkeit würdest du als Nächstes gerne lernen?','Welches Abenteuer schiebst du schon länger auf?'],
 ['Welchen Satz möchtest du deinen Nachfahren in 500 Jahren mitgeben?','Was macht für dich ein gutes Leben aus?']
 ]
};
let selectedQuestion=null;
let choosingQuestion=true;
function choicePrompt(day,index){
 if(typeof index==='string'&&index.startsWith('legacy-'))return followupQuestions[lang][day][Number(index.slice(7))];
 return index===0?question(day):index===3?(lang==='de'?'Eine eigene Erinnerung':'A memory of your own'):questionChoices[lang][day][index-1];
}
function questionAnswer(day,index){
 if(typeof index==='string'&&index.startsWith('legacy-'))return state.followupAnswers[day]?.[Number(index.slice(7))]||'';
 return index===0?(state.answers[day]||''):(state.choiceAnswers?.[day]?.[index]||'');
}
function writeQuestionAnswer(value){
 if(selectedQuestion===null)return;
 if(typeof selectedQuestion==='string')((state.followupAnswers??={})[current]??={})[Number(selectedQuestion.slice(7))]=value;
 else if(selectedQuestion===0)state.answers[current]=value;
 else ((state.choiceAnswers??={})[current]??={})[selectedQuestion]=value;
 save();
}
function pickMoreQuestions(){choosingQuestion=true;renderQuestionChoices();$('questionChoices').querySelector('button')?.focus();editor.scrollTop=0}
function renderQuestionChoices(){
 $('saveClose').textContent=lang==='de'?'Speichern & schließen':'Save & close';
 $('questionChoiceHint').textContent=lang==='de'?'Wähle eine Frage, die eine Erinnerung weckt. Du kannst danach weitere beantworten.':'Pick a question that sparks a memory. You can answer more afterward.';
 $('questionPicker').hidden=!choosingQuestion;
 $('questionResponse').hidden=choosingQuestion;
 $('questionChoices').replaceChildren();
 const choices=[0,1,2,3];
 // Keep previously saved follow-up answers accessible through the same picker.
 for(const [index,answer]of Object.entries(state.followupAnswers[current]||{})){if(answer.trim())choices.push(`legacy-${index}`)}
 for(const index of choices){
  const button=document.createElement('button');button.type='button';
  const answered=Boolean(questionAnswer(current,index).trim());
  button.textContent=choicePrompt(current,index);
  button.setAttribute('aria-pressed',String(index===selectedQuestion));
  if(answered){button.classList.add('answered');button.setAttribute('aria-label',button.textContent+(lang==='de'?' – Antwort bearbeiten':' – Edit answer'))}
  button.onclick=()=>{selectedQuestion=index;choosingQuestion=false;renderQuestionChoices();$('answer').focus();editor.scrollTop=0};$('questionChoices').append(button);
 }
 if(selectedQuestion!==null){$('question').textContent=choicePrompt(current,selectedQuestion);$('answer').value=questionAnswer(current,selectedQuestion)}
 $('moreQuestions').textContent=lang==='de'?'Ein wenig mehr von deiner Geschichte · Weitere Frage wählen':'A little more of your story · Pick another question';
}
