import {execFileSync} from 'node:child_process';
import {python} from './python';
import {expect, type APIRequestContext, type Page} from '@playwright/test';

export type Learner = {pseudo: string; password: string};
export type BacSection = 'mathematiques' | 'sciences_experimentales' | 'autre';
export const e2eDatabaseUrl = 'postgresql+psycopg://ednova:ednova@127.0.0.1:55432/ednova_e2e';

export function setStudentPlan(learner: Learner, plan: 'free' | 'pro'): void {
  execFileSync(python, ['-m', 'src.manage', 'set-plan', learner.pseudo, plan], {
    cwd: '../Backend',
    env: {...process.env, DATABASE_URL: e2eDatabaseUrl, SECRET_KEY: 'e2e-only'},
  });
}

const sectionLabels: Record<BacSection, string> = {
  mathematiques: 'Mathématiques',
  sciences_experimentales: 'Sciences expérimentales',
  autre: 'Autre section',
};

/** A navigation destination: a link in the app's rail or bottom bar, or a button. */
export const navItem = (page: Page, name: RegExp) =>
  page.getByRole('button', {name}).or(page.getByRole('link', {name})).first();

export const appEntry = (): string => '/';

export function newLearner(): Learner {
  const digits = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  return {pseudo: `e2e${digits}`, password: crypto.randomUUID()};
}

export async function signUp(page: Page, learner: Learner, opts: {section?: BacSection} = {}): Promise<void> {
  const section = opts.section ?? 'sciences_experimentales';
  await page.goto(appEntry());
  await page.getByRole('button', {name: 'C’est parti'}).click();
  await page.getByRole('textbox', {name: 'Pseudo'}).fill(learner.pseudo);
  await page.getByRole('textbox', {name: 'Mot de passe'}).fill(learner.password);
  await page.getByRole('button', {name: 'Créer mon compte'}).click();
  await page.getByRole('radio', {name: new RegExp(`^${sectionLabels[section]}`)}).check();
  await page.getByRole('button', {name: 'C’est bien ça'}).click();
  await page.getByRole('radio', {name: /^Visuel/}).check();
  await page.getByRole('button', {name: 'Continuer'}).click();
  await expect(page.getByRole('heading', {name: 'Qu’est-ce que tu veux avoir sous la main ?'})).toBeVisible();
  await page.getByRole('button', {name: 'Continuer'}).click();
  await expect(page.getByRole('heading', {name: 'Six questions rapides pour savoir par où commencer.'})).toBeVisible();
  await page.getByRole('button', {name: 'Passer les questions'}).click();
  await page.getByRole('button', {name: /^Commencer/}).click();
  await expect(page.getByRole('heading', {name: `Bonjour, ${learner.pseudo}`})).toBeVisible();
}

export async function deleteAccount(request: APIRequestContext, learner: Learner): Promise<void> {
  const login = await request.post('/api/auth/login', {form: {username: learner.pseudo, password: learner.password}});
  if (!login.ok()) return;
  const {access_token: token} = await login.json();
  await request.delete('/api/auth/me', {headers: {Authorization: `Bearer ${token}`}});
}
