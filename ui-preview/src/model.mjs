import {bank,chatFixtures} from './fixtures.mjs';
export const validatePseudo=s=>/^[A-Za-z0-9]{3,30}$/.test(s)?'':'3 à 30 caractères : lettres et chiffres.';
export function diagnosticScore(answers) {
 const keys={l1:'L’expliquer sans notes',l2:'Prévoir plusieurs rappels',l3:'Chercher sa cause puis réessayer'};
 if(Object.keys(keys).some(id=>!bank.find(x=>x.id===id).choices.some(c=>c.id===answers[id]))) return null;
 return Object.entries(keys).filter(([id,key])=>answers[id]===key).length;
}
export const aiLabel=result=>result.ai_generated?'Réponse générée par IA':'sans IA';
export const hintUsed=n=>Math.max(0,Math.min(2,Number.isFinite(n)?Math.floor(n):0));
export const mastery=value=>value===null?{level:'unknown',label:'Pas encore évalué'}:value<.4?{level:'weak',label:`Fragile · ${Math.round(value*100)} %`}:value<.75?{level:'medium',label:`En route · ${Math.round(value*100)} %`}:{level:'strong',label:`Solide · ${Math.round(value*100)} %`};
export const peerPresentation=verdict=>['correct','incorrect','incomplete','wellbeing'].includes(verdict)?{verdict}: {verdict:'incomplete',title:"Je n'ai pas pu vérifier"};
export const feedbackReasons=[{id:'wrong',label:"C'est faux"},{id:'unclear',label:'Pas clair'},{id:'too_long',label:'Trop long'},{id:'not_my_level',label:'Pas à mon niveau'},{id:'other',label:'Autre'}];
export const canDelete=(typed,pseudo,pending)=>typed===pseudo&&!pending;
export const timerTransition=(state,action,now)=>action==='start'&&state.status!=='running'?{status:'running',startedAt:now,baseMinutes:state.minutes??0}:action==='stop'&&state.status==='running'?{status:'stopped',minutes:(state.baseMinutes??0)+elapsedMinutes(state,now)}:state;
export const elapsedMinutes=(state,now)=>Math.floor(Math.max(0,now-(state.startedAt??now))/60000);
export const tutorEntry=(intent,scenario)=>intent==='guided'?chatFixtures.hint0:chatFixtures[scenario]||chatFixtures.success;
export const timerSummary=(state,now)=>{const running=state.status==='running',minutes=running?(state.baseMinutes??0)+elapsedMinutes(state,now):state.minutes??0;return {todayMinutes:minutes,weekMinutes:minutes,streakDays:state.status==='idle'?0:1,running};};
