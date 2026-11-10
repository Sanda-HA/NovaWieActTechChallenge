import {bank} from './fixtures.mjs';
import {validatePseudo,diagnosticScore} from './model.mjs';
import {accountTransition} from './account.mjs';
import {Screen} from './screens.mjs';
const params=new URLSearchParams(location.search),scenario=params.get('scenario')||'success';
const accounts=new WeakMap();
function accountSubmit({login,form,onSuccess,onError,onCreated}){
 let state=accounts.get(form)||{status:login?'login_needed':'idle',failed:false};
 state.status=accountTransition(state.status,{type:'SUBMIT'});accounts.set(form,state);
 if(scenario==='pending')return;
 setTimeout(()=>{
  if(state.status==='registering'){
   if(scenario==='duplicate'){state.status=accountTransition(state.status,{type:'DUPLICATE'});onError('Ce pseudo est déjà pris. Choisis un autre pseudo.','pseudo');return;}
   if(scenario==='register-error'){state.status=accountTransition(state.status,{type:'REGISTER_FAILED'});onError('La création a échoué. Réessaie.');return;}
   state.status=accountTransition(state.status,{type:'REGISTER_OK'});
   onCreated();
   state.status=accountTransition(state.status,{type:'SUBMIT'});
  }
  if(['login-failed','expired'].includes(scenario)&&!state.failed){
   state.status=accountTransition(state.status,{type:'LOGIN_FAILED'});state.failed=true;
   onError(login?'Connexion impossible. Vérifie tes identifiants.':'Compte créé. La connexion a échoué : réessaie pour te connecter.');return;
  }
  state.status=accountTransition(state.status,{type:'LOGIN_OK',access_token:'offline-fixture',token_type:'bearer'});
  if(state.status==='signed_in'){form.elements.namedItem('password').value='';onSuccess();}
 },400);
}
function profile(answers){
 const score=diagnosticScore(answers),level=score===null?'Pas encore évalué':['Fragile','Fragile','En route','Solide'][score];
 const styles={step_by_step:'Par étapes',examples:'Par exemples',visual:'Avec des schémas',analogy:'Par analogies'};
 const plan=[{when:'Ce soir',minutes:20,task:'Trois exercices guidés : loi binomiale',tool:'Exercices guidés · Exemple'},{when:'Demain',minutes:15,task:'Revoir le dénombrement',tool:'Tuteur · Exemple'},{when:'Mercredi',minutes:15,task:'Explique la probabilité conditionnelle',tool:'Mode Feynman · Exemple'},{when:'Vendredi',minutes:25,task:'Mini-bilan : cinq questions',tool:'Exercices guidés · Exemple'}];
 return {formatLabel:styles[answers.s1]||'Par exemples',levelLabel:'Méthodes de révision · '+level,score,summary:score===null?'Pas encore évalué.':score+' sur 3 pour les questions sur les méthodes de révision.',weakest:{chapter:'Loi binomiale',level:'unknown',attempts:0,confusions:0},suggestions:['Loi binomiale','Probabilités conditionnelles','Variables aléatoires'].map(chapter=>({chapter,level:'unknown',reason:'Exemple · pas encore évalué.'})),plan,nextStep:{kind:'practise',label:'Un exercice guidé : dérivabilité',message:'Donne-moi un exercice guidé sur la dérivabilité.'}};
}
window.EdNovaPreview={bank,validatePseudo,accountSubmit,profile,Screen,screen:params.get('screen')||'accueil'};
if(params.has('screen')&&!location.hash)history.replaceState(null,'',location.pathname+location.search+'#accueil');
const script=document.createElement('script');script.src='./src/onboarding.js';document.body.append(script);
