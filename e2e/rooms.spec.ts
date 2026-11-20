import {expect, test, type Browser, type BrowserContext, type Page} from '@playwright/test';
import {deleteAccount, navItem, newLearner, setStudentPlan, signUp, type Learner} from './helpers';

test.use({permissions: ['clipboard-read', 'clipboard-write']});
test.setTimeout(120_000);

const learners: Learner[] = [];
const extraContexts: BrowserContext[] = [];

test.afterAll(async ({request}) => {
  for (const context of extraContexts) await context.close();
  for (const learner of learners) await deleteAccount(request, learner);
});

const openRooms = (page: Page) => navItem(page, /^Salle d’étude/).click();
const members = (page: Page) => page.getByRole('region', {name: 'Membres'});

async function learnerPage(browser: Browser, baseURL: string | undefined, existing?: Page): Promise<{page: Page; learner: Learner}> {
  const learner = newLearner();
  learners.push(learner);
  let page = existing;
  if (!page) {
    const context = await browser.newContext({baseURL});
    extraContexts.push(context);
    page = await context.newPage();
  }
  await signUp(page, learner);
  return {page, learner};
}

async function createRoom(page: Page, learner: Learner): Promise<string> {
  await openRooms(page);
  await page.getByRole('button', {name: 'Créer la salle'}).click();
  await expect(page.getByRole('heading', {name: `Salle de ${learner.pseudo}`})).toBeVisible();
  await page.getByRole('button', {name: 'Copier le lien'}).click();
  await expect(page.getByText(/^Lien copié/)).toBeVisible();
  return page.evaluate(() => navigator.clipboard.readText());
}

async function openInvite(page: Page, link: string): Promise<void> {
  await page.goto(link);
  await page.reload();
}

test('invite link joins and both see two members', async ({page, browser, baseURL}) => {
  const {learner: owner} = await learnerPage(browser, baseURL, page);
  const link = await createRoom(page, owner);
  const {page: guestPage, learner: guest} = await learnerPage(browser, baseURL);

  await openInvite(guestPage, link);
  await expect(guestPage.getByRole('heading', {name: `Salle de ${owner.pseudo}`})).toBeVisible({timeout: 15_000});

  for (const view of [page, guestPage]) {
    await expect(members(view).getByText(owner.pseudo)).toBeVisible({timeout: 15_000});
    await expect(members(view).getByText(guest.pseudo)).toBeVisible({timeout: 15_000});
  }
});

test('invalid code shows the hint', async ({page, browser, baseURL}) => {
  await learnerPage(browser, baseURL, page);
  await openRooms(page);
  await expect(page.getByText('6 caractères : lettres A à Z sans I ni O, chiffres 2 à 9.')).toBeVisible();
  await page.getByRole('textbox', {name: 'Code d’invitation'}).fill('ABC');
  await page.getByRole('button', {name: 'Rejoindre'}).click();
  // web also repeats field errors in a screen-reader live region; the first match is the field's own message.
  await expect(page.getByText(/Ce code n’a pas le bon format/).first()).toBeVisible();
});

test('member leaves and owner closes the room', async ({page, browser, baseURL}) => {
  const {learner: owner} = await learnerPage(browser, baseURL, page);
  const link = await createRoom(page, owner);
  const {page: guestPage, learner: guest} = await learnerPage(browser, baseURL);
  await openInvite(guestPage, link);
  await expect(members(page).getByText(guest.pseudo)).toBeVisible({timeout: 15_000});

  await guestPage.getByRole('button', {name: 'Quitter la salle'}).click();
  await guestPage.getByRole('button', {name: 'Confirmer le départ'}).click();
  await expect(guestPage.getByText('Tu ne fais encore partie d’aucune salle.')).toBeVisible();
  await expect(members(page).getByText(guest.pseudo)).toBeHidden({timeout: 15_000});

  await page.getByRole('button', {name: 'Fermer la salle'}).click();
  await page.getByRole('button', {name: 'Confirmer la fermeture'}).click();
  await expect(page.getByText('Tu ne fais encore partie d’aucune salle.')).toBeVisible();
});


test('keeps an issued room quiz after the round ends and resets it for a new session', async ({page, browser, baseURL}) => {
  const {learner} = await learnerPage(browser, baseURL, page);
  setStudentPlan(learner, 'pro');
  await createRoom(page, learner);
  const roomId = new URL(page.url()).pathname.split('/').at(-1);
  const token = await page.evaluate(() => sessionStorage.getItem('ednova-token'));
  expect(token).toBeTruthy();
  const headers = {Authorization: `Bearer ${token}`};
  const session = `/api/groups/rooms/${roomId}/session`;
  const start = () => page.request.post(session, {headers, data: {topic: 'derivabilite'}});
  const next = () => page.request.post(session + '/next', {headers});

  const first = await start();
  expect(first.status()).toBe(201);
  const firstId = (await first.json()).session_id;
  expect((await next()).ok()).toBe(true);
  expect((await next()).ok()).toBe(true);

  const quiz = page.getByRole('region', {name: 'Quiz de la séance', exact: true});
  const answer = quiz.getByRole('radio').first();
  await answer.click();
  await expect(answer).toHaveAttribute('aria-checked', 'true');

  expect((await page.request.post(session + '/end', {headers})).ok()).toBe(true);
  await expect(page.getByRole('heading', {name: 'Notes de la séance'})).toBeVisible({timeout: 15_000});
  await expect(answer).toHaveAttribute('aria-checked', 'true');
  while (await quiz.getByRole('button', {name: 'Suivant'}).count()) {
    await quiz.getByRole('button', {name: 'Suivant'}).click();
    await answer.click();
  }
  await quiz.getByRole('button', {name: 'Voir mon résultat'}).click();
  await expect(quiz.getByText(/Score/)).toBeVisible();

  const second = await start();
  expect(second.status()).toBe(201);
  expect((await second.json()).session_id).not.toBe(firstId);
  await expect(quiz).toHaveCount(0, {timeout: 15_000});
  expect((await next()).ok()).toBe(true);
  expect((await next()).ok()).toBe(true);
  await expect(answer).toHaveAttribute('aria-checked', 'false', {timeout: 15_000});
});
