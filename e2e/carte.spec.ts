import {expect, test} from '@playwright/test';
import {deleteAccount, navItem, newLearner, signUp, type Learner} from './helpers';

const learners: Learner[] = [];

test.afterAll(async ({request}) => {
  for (const learner of learners) await deleteAccount(request, learner);
});

// The quiz itself is written by the model: stub it in the browser so the spec spends no quota.
const quiz = {
  quiz_id: '00000000-0000-4000-8000-000000000001',
  topic: 'stub',
  questions: [{id: 'q1', question: 'Question de test sur ce chapitre', choices: ['Choix A', 'Choix B', 'Choix C', 'Choix D']}],
};

test('opens the chapter map and a chapter quiz', async ({page}) => {
  const learner = newLearner();
  learners.push(learner);
  await page.route(/\/api\/learning\/quiz\/[a-z0-9_]+$/, route => route.fulfill({json: quiz}));
  // The profile is faked as Pro in the browser only, so the Pro-only group review must be faked too or the server's 403 flips the plan back to Free in a loop.
  await page.route(/\/api\/learning\/group-review$/, route => route.fulfill({json: {items: []}}));
  // The chapter quiz is Pro; a new account is Free, so the spec shows the plan the operator would activate.
  await page.route(/\/api\/me\/profile$/, async route => {
    if (route.request().method() !== 'GET') return route.continue();
    const response = await route.fetch();
    return route.fulfill({response, json: {...(await response.json()), student_plan: 'pro'}});
  });

  await signUp(page, learner, {section: 'mathematiques'});

  await navItem(page, /^Carte des chapitres/).click();
  await expect(page.getByRole('heading', {name: 'Carte des chapitres'}).first()).toBeVisible();

  // The map is a mosaic of chapter tiles; a tile opens the chapter beside it.
  const map = page.getByRole('group', {name: 'Carte des chapitres'});
  await map.getByRole('button').first().click();
  await expect(page.getByRole('complementary', {name: 'Chapitre'})).toBeVisible();

  await page.getByRole('button', {name: 'Quiz du chapitre'}).first().click();
  const panel = page.getByRole('region', {name: 'Quiz du chapitre'});
  await expect(panel).toBeVisible();
  await expect(panel.getByText('Question de test sur ce chapitre').first()).toBeVisible();
  await expect(panel.getByText('Choix B').first()).toBeVisible();
});
