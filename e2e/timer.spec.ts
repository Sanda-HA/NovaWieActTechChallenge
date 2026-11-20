import {expect, test, type Page} from '@playwright/test';
import {deleteAccount, navItem, newLearner, signUp, type Learner} from './helpers';

const learners: Learner[] = [];
let learner: Learner;

test.beforeEach(async ({page}) => {
  learner = newLearner();
  learners.push(learner);
  await signUp(page, learner);
});

test.afterAll(async ({request}) => {
  for (const created of learners) await deleteAccount(request, created);
});

const toggle = (page: Page) => page.getByRole('button', {name: /^Minuteur d’étude/});
const chip = (page: Page) => toggle(page).getByText(/^\d\d:\d\d$/);
const goTo = (page: Page, name: RegExp) => navItem(page, name).click();

async function startTwentyFiveMinutes(page: Page) {
  await toggle(page).click();
  await page.getByRole('button', {name: '25 min'}).click();
  await page.getByRole('button', {name: 'Démarrer'}).click();
}

test('25-minute timer runs across pages', async ({page}) => {
  await startTwentyFiveMinutes(page);
  await expect(chip(page)).toHaveText(/^24:5\d$/, {timeout: 10_000});

  await goTo(page, /^Tuteur/);
  await expect(page.getByRole('heading', {name: 'Tuteur'})).toBeVisible();
  const afterTutor = await chip(page).innerText();
  await expect.poll(() => chip(page).innerText(), {timeout: 10_000}).not.toBe(afterTutor);

  await goTo(page, /^Salle d’étude/);
  await expect(page.getByRole('heading', {name: 'Salle d’étude'})).toBeVisible();
  const afterRooms = await chip(page).innerText();
  await expect.poll(() => chip(page).innerText(), {timeout: 10_000}).not.toBe(afterRooms);
});

test('timer keeps running after a refresh', async ({page}) => {
  await startTwentyFiveMinutes(page);
  await expect(chip(page)).toHaveText(/^24:5\d$/, {timeout: 10_000});
  await page.reload();
  await expect(page.getByRole('heading', {name: `Bonjour, ${learner.pseudo}`})).toBeVisible();
  await expect(chip(page)).toHaveText(/^24:[0-5]\d$/, {timeout: 10_000});
});

test('pause shows En pause and is listed in history', async ({page}) => {
  await startTwentyFiveMinutes(page);
  await expect(chip(page)).toHaveText(/^24:5\d$/, {timeout: 10_000});
  await page.getByRole('button', {name: 'Mettre la séance en pause'}).click();
  await expect(page.getByRole('group', {name: 'Commandes du minuteur'}).getByText('En pause')).toBeVisible();

  await goTo(page, /^Temps/);
  const history = page.getByRole('region', {name: 'Séances récentes'}).getByRole('listitem');
  await expect(history).toHaveCount(1);
});

test('escape collapses the panel and returns focus to the toggle', async ({page}) => {
  await toggle(page).click();
  const panel = page.getByRole('group', {name: 'Commandes du minuteur'});
  await expect(panel).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle(page)).toBeFocused();
});
