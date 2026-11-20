import {expect, test} from '@playwright/test';
import {deleteAccount, newLearner, signUp, type Learner} from './helpers';

const learners: Learner[] = [];

test.beforeEach(async ({page}) => {
  const learner = newLearner();
  learners.push(learner);
  await signUp(page, learner);
});

test.afterAll(async ({request}) => {
  for (const learner of learners) await deleteAccount(request, learner);
});

test('refresh keeps me signed in', async ({page}) => {
  await page.reload();
  await expect(page.getByRole('heading', {name: `Bonjour, ${learners.at(-1)!.pseudo}`})).toBeVisible();
});

test('expired token signs me out once', async ({page}) => {
  await page.evaluate(() => sessionStorage.setItem('ednova-token', 'invalid'));

  const navigations: string[] = [];
  page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
  await page.reload();

  await expect(page.getByRole('textbox', {name: 'Pseudo'})).toBeVisible();
  const settled = navigations.length;
  await page.waitForTimeout(2000);
  expect(navigations.length).toBe(settled);
});
