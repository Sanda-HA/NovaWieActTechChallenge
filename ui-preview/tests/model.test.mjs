import test from 'node:test';
import assert from 'node:assert/strict';
import * as model from '../src/model.mjs';
import {bank,chatFixtures,scenarioNames} from '../src/fixtures.mjs';
test('pseudo matches service schema; yasmine has no special failure',()=>{
 assert.equal(model.validatePseudo('yasmine'),'');
 assert.equal(model.validatePseudo('a'.repeat(30)),'');
 for(const s of ['a','a_b','a.b','a'.repeat(31)]) assert.ok(model.validatePseudo(s));
});
test('six diagnostic items and general study skills scoring',()=>{
 assert.deepEqual(bank.map(x=>x.id),['p1','p2','s1','l1','l2','l3']);
 assert.equal(model.diagnosticScore({l1:'L’expliquer sans notes',l2:'Prévoir plusieurs rappels',l3:'Chercher sa cause puis réessayer'}),3);
 assert.equal(model.diagnosticScore({l1:'Recopier le texte',l2:'Tout relire en une fois',l3:'Effacer la réponse'}),0);
 assert.equal(model.diagnosticScore({l1:'L’expliquer sans notes'}),null);
 assert.equal(model.diagnosticScore({l1:'6x',l2:'Prévoir plusieurs rappels',l3:'Chercher sa cause puis réessayer'}),null);
});
test('AI label follows the field; nullable badges stay absent',()=>{
 assert.equal(model.aiLabel(chatFixtures.degraded),'sans IA');
 assert.equal(model.aiLabel({...chatFixtures.degraded,ai_generated:true}),'Réponse générée par IA');
 assert.equal(chatFixtures.busy.badge,null);
 assert.equal(chatFixtures.busy.retry_after,12);
});
test('only hint rungs 0–2 and null mastery differs from zero',()=>{
 assert.deepEqual([0,1,2,3].map(model.hintUsed),[0,1,2,2]);
 assert.equal(model.mastery(null).label,'Pas encore évalué');
 assert.equal(model.mastery(0).level,'weak');
 assert.notEqual(model.mastery(null).label,model.mastery(0).label);
});
test('unknown verdict is neutral, Other is a reason, exact deletion pseudo',()=>{
 assert.deepEqual(model.peerPresentation('unknown'),{verdict:'incomplete',title:"Je n'ai pas pu vérifier"});
 assert.ok(model.feedbackReasons.some(x=>x.id==='other'&&x.label==='Autre'));
 assert.equal(model.canDelete('Yasmine','yasmine',false),false);
 assert.equal(model.canDelete('yasmine','yasmine',true),false);
 assert.equal(model.canDelete('yasmine','yasmine',false),true);
});
test('timer preserves running start, clamps future times and disallows double start',()=>{
 const running={status:'running',startedAt:1000};
 assert.deepEqual(model.timerTransition(running,'start',3000),running);
 assert.equal(model.elapsedMinutes(running,121000),2);
 assert.equal(model.elapsedMinutes(running,500),0);
 assert.equal(model.timerTransition(running,'stop',121000).status,'stopped');
 assert.equal(model.timerTransition({status:'idle'},'start',1000).startedAt,1000);
});
test('fixture catalogue covers requested failure and timer states',()=>{
 for(const name of ['success','empty','busy','degraded','error','hint0','hint1','hint2','mastery-null','mastery-zero','timer-idle','timer-running','timer-stopped','timer-error','permission','unknown','login-failed','duplicate','delete-error']) assert.ok(scenarioNames.includes(name),name);
});
test('guided CTA enters guided exercise without revealing the solution',()=>{
 const entry=model.tutorEntry('guided','success');
 assert.equal(entry.mode,'guided');
 assert.equal(entry.hint_rung,0);
 assert.ok(entry.answer.includes('Calcule'));
 assert.equal(model.tutorEntry(null,'degraded').ai_generated,false);
});
test('running and stopped timers feed consistent home totals in the same visit',()=>{
 const state={status:'running',startedAt:1000};
 assert.deepEqual(model.timerSummary(state,121000),{todayMinutes:2,weekMinutes:2,streakDays:1,running:true});
 const stopped=model.timerTransition(state,'stop',121000);
 assert.deepEqual(model.timerSummary(stopped,900000),{todayMinutes:2,weekMinutes:2,streakDays:1,running:false});
});
