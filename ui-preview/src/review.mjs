import {scenarioNames} from './fixtures.mjs';
const nav=document.getElementById('links');
for(const screen of ['accueil','tuteur','carte','seances','salle','reglages']){
 const section=document.createElement('section');section.className='grid gap-3';
 const title=document.createElement('h2');title.className='heading';title.textContent=screen;section.append(title);
 for(const scenario of scenarioNames){const link=document.createElement('a');link.className='label';link.href=`./index.html?screen=${screen}&scenario=${scenario}#accueil`;link.textContent=scenario;section.append(link)}nav.append(section);
}
for(const step of ['bienvenue','compte','bac','style','outils','diagnostic','plan']){const link=document.createElement('a');link.href=`./index.html#${step}`;link.textContent=step;nav.prepend(link)}
