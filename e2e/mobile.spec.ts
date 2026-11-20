import {expect, test, type Page} from '@playwright/test';
import {deleteAccount, navItem, newLearner, signUp, type Learner} from './helpers';

const learners: Learner[] = [];

test.beforeEach(async ({page}) => {
  const learner = newLearner();
  learners.push(learner);
  await signUp(page, learner);
});

test.afterAll(async ({request}) => {
  for (const learner of learners) await deleteAccount(request, learner);
});

const goTo = (page: Page, name: RegExp) => navItem(page, name).click();
const scrollsHorizontally = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);

test('timer panel collapses when the composer gets focus', async ({page}) => {
  await goTo(page, /^Tuteur/);
  await page.getByRole('button', {name: /^Minuteur d’étude/}).click();
  const panel = page.getByRole('group', {name: 'Commandes du minuteur'});
  await expect(panel).toBeVisible();

  const composer = page.getByRole('textbox', {name: 'Ta question'});
  await expect(async () => {
    await composer.blur();
    await composer.focus();
    await expect(panel).toBeHidden({timeout: 1000});
  }).toPass({timeout: 10_000});
});

test('no horizontal scroll on Home, Tutor, Study time, Rooms', async ({page}) => {
  const screens: [string, RegExp, RegExp][] = [
    ['Home', /^Accueil/, /^Bonjour,/],
    ['Tutor', /^Tuteur/, /^Tuteur$/],
    ['Study time', /^Temps/, /^Temps d’étude$/],
    ['Rooms', /^Salle/, /^Salle d’étude$/],
  ];
  for (const [label, name, heading] of screens) {
    await goTo(page, name);
    await expect(page.getByRole('heading', {name: heading})).toBeVisible();
    expect(await scrollsHorizontally(page), `${label} scrolls horizontally`).toBe(false);
  }
});
