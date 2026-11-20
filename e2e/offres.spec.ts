import {expect, test} from '@playwright/test';
import {deleteAccount, newLearner, setStudentPlan, signUp, type Learner} from './helpers';

const learners: Learner[] = [];

test.afterAll(async ({request}) => {
  for (const learner of learners) await deleteAccount(request, learner);
});

test('a Free learner tries the study demos and keeps a pilot request after reload', async ({page}) => {
  const learner = newLearner();
  learners.push(learner);
  await page.setViewportSize({width: 320, height: 800});
  await signUp(page, learner);
  await page.getByRole('link', {name: 'Comparer les offres'}).click();
  await expect(page.getByText('Tu es sur l’offre gratuite.')).toBeVisible();
  const plans = page.getByRole('region', {name: 'Les offres Nova'});
  await expect(plans.locator('[data-mood] svg')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.getByRole('button', {name: 'Demander l’accès Pro'}).click();
  await expect(page.getByText(/Demande Pro enregistrée/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Demande Pro enregistrée/)).toBeVisible();

  await page.getByRole('button', {name: 'Essayer le quiz d’exemple'}).click();
  const sample = page.getByRole('region', {name: 'Quiz d’exemple', exact: true});
  await sample.getByRole('radio').first().click();
  await sample.getByRole('button', {name: 'Voir mon résultat'}).click();
  await expect(sample.getByText(/Score/)).toBeVisible();

  await page.getByRole('button', {name: 'Essayer une carte'}).click();
  const demo = page.getByRole('region', {name: 'Fiches de révision Nova : Dérivabilité'});
  const completion = page.waitForResponse(response => response.url().endsWith('/api/learning/revision-demo/completion') && response.status() === 204);
  await demo.locator('summary').click();
  await completion;
  await expect(demo.getByText(/La règle des puissances donne/)).toBeVisible();
  await expect(demo.getByRole('button', {name: 'Générer ma fiche'})).toHaveCount(0);
});

test('a Pro learner uses the lab on mobile and finishes timed practice after a downgrade', async ({page}) => {
  const learner = newLearner();
  learners.push(learner);
  await page.setViewportSize({width: 375, height: 812});
  await signUp(page, learner);
  setStudentPlan(learner, 'pro');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await page.getByRole('link', {name: 'Voir mon offre'}).click();
  await expect(page.getByRole('heading', {name: 'Les offres Nova'})).toBeVisible();
  const fitsViewport = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  expect(await fitsViewport()).toBe(true);
  await page.getByRole('link', {name: 'Ouvrir le labo'}).click();
  const lab = page.getByRole('region', {name: 'Labo interactif'});
  const slider = lab.getByRole('slider');
  await expect(slider).toBeVisible();
  const initial = await slider.getAttribute('aria-valuetext');
  await slider.press('ArrowRight');
  await expect(slider).not.toHaveAttribute('aria-valuetext', initial ?? '');
  expect(await fitsViewport()).toBe(true);

  await page.clock.install();
  await page.getByRole('button', {name: 'Commencer l’entraînement'}).click();
  const practice = page.getByRole('region', {name: 'Entraînement Bac chronométré'});
  await expect(practice.getByRole('timer')).toBeVisible();
  await practice.getByRole('radio').first().click();
  setStudentPlan(learner, 'free');
  const refreshed = page.waitForResponse(response => response.url().endsWith('/api/me/profile') && response.ok());
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await refreshed;
  await expect(page.getByRole('button', {name: 'Commencer l’entraînement'})).toHaveCount(0);

  const grading = page.waitForResponse(response => response.url().endsWith('/answers') && response.ok());
  await page.clock.fastForward(601_000);
  const graded = await grading;
  expect(Object.keys(graded.request().postDataJSON().answers)).toHaveLength(1);
  await expect(practice.getByText(/Score/)).toBeVisible();
  await expect(practice.getByRole('button', {name: 'Refaire le quiz'})).toHaveCount(0);
});
