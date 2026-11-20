import {expect, test} from '@playwright/test';
import {deleteAccount, navItem, newLearner, signUp, type Learner} from './helpers';

const learners: Learner[] = [];

test.afterAll(async ({request}) => {
  for (const learner of learners) await deleteAccount(request, learner);
});

test('opens with starters and a composer', async ({page}) => {
  const learner = newLearner();
  learners.push(learner);
  await signUp(page, learner);

  const modelCalls: string[] = [];
  page.on('request', request => {
    if (/\/api\/tutor\/sessions\/[^/]+\/messages/.test(request.url())) modelCalls.push(request.url());
  });

  await navItem(page, /^Tuteur/).click();
  await expect(page.getByRole('heading', {name: 'Tuteur', exact: true})).toBeVisible();
  await expect(page.getByRole('heading', {name: 'Que veux-tu apprendre aujourd’hui ?'})).toBeVisible();
  for (const starter of [/^Aide-moi à préparer une fiche de révision\./, /^Propose un exercice pour m’entraîner\./]) {
    await expect(page.getByRole('button', {name: starter})).toBeVisible();
  }
  const composer = page.getByRole('textbox', {name: 'Ta question'});
  await expect(composer).toBeVisible();
  await composer.fill('Une question que je n’envoie pas.');
  const draft = () => composer.evaluate(element => element.textContent);
  await expect.poll(draft).toBe('Une question que je n’envoie pas.');
  expect(modelCalls).toStrictEqual([]);
});
