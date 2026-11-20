import {expect, test} from '@playwright/test';
import {appEntry, deleteAccount, newLearner, signUp} from './helpers';

const [reaching, picky, existing] = [newLearner(), newLearner(), newLearner()];

test.afterAll(async ({request}) => {
  for (const learner of [reaching, picky, existing]) await deleteAccount(request, learner);
});

async function openAccountStep(page: import('@playwright/test').Page, pseudo: string, password: string) {
  await page.goto(appEntry());
  await page.getByRole('button', {name: 'C’est parti'}).click();
  await page.getByRole('textbox', {name: 'Pseudo'}).fill(pseudo);
  await page.getByRole('textbox', {name: 'Mot de passe'}).fill(password);
  await page.getByRole('button', {name: 'Créer mon compte'}).click();
}

test('new learner reaches Home', async ({page}) => {
  await signUp(page, reaching);
  await expect(page.getByRole('heading', {name: `Bonjour, ${reaching.pseudo}`})).toBeVisible();
});

test('bac section is required', async ({page}) => {
  await openAccountStep(page, picky.pseudo, picky.password);
  await page.waitForURL('**/bac');
  const next = page.getByRole('button', {name: 'C’est bien ça'});
  await expect(next).toBeDisabled();
  await page.getByRole('radio', {name: /^Mathématiques/}).check();
  await expect(next).toBeEnabled();
});

test('taken pseudo shows the error', async ({page, request}) => {
  const created = await request.post('/api/auth/register', {data: {pseudo: existing.pseudo, password: existing.password}});
  expect(created.ok()).toBe(true);
  await openAccountStep(page, existing.pseudo, existing.password);
  // web also repeats field errors in a screen-reader live region; the first match is the field's own message.
  await expect(page.getByText('Ce pseudo est déjà pris.').first()).toBeVisible();
});
