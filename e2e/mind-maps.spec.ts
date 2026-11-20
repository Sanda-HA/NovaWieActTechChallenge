import {expect, test} from '@playwright/test';
import {deleteAccount, newLearner, setStudentPlan} from './helpers';

const chapters = [
  {subject: 'math', topic: 'derivabilite', title: 'Dérivabilité', branch: 'Tangente', child: 'Pente'},
  {subject: 'svt', topic: 'immunite', title: 'Immunité', branch: 'Immunité innée', child: 'Barrières naturelles'},
];

for (const {subject, topic, title, branch, child} of chapters) {
  test(`explores and reopens the full-width ${title} mind map`, async ({page, request}) => {
    const learner = newLearner();
    const registered = await request.post('/api/auth/register', {data: learner});
    expect(registered.ok()).toBeTruthy();
    try {
      const login = await request.post('/api/auth/login', {form: {username: learner.pseudo, password: learner.password}});
      const {access_token: token} = await login.json();
      expect((await request.put('/api/me/profile', {
        headers: {Authorization: `Bearer ${token}`},
        data: {section: 'sciences_experimentales', reply_language: 'fr', presentation: 'visual'},
      })).ok()).toBeTruthy();
      setStudentPlan(learner, 'pro');

      const result = {update_available: false, map: {
        subject, reply_language: 'fr', source_revision: 1,
        root: {id: 'root', label: title, children: [
          {id: 'b1', label: branch, children: [{id: 'b1-1', label: child, children: []}]},
          {id: 'b2', label: 'Définitions', children: []},
          {id: 'b3', label: 'Applications', children: []},
        ]},
      }};
      let saved = false;
      await page.route(`**/api/learning/mind-maps/${topic}`, route => {
        if (route.request().method() === 'POST') saved = true;
        return route.fulfill({json: saved ? result : {map: null, update_available: false}});
      });
      await page.addInitScript(sessionToken => sessionStorage.setItem('ednova-token', sessionToken), token);
      await page.goto(`/carte?subject=${subject}`);
      const maps = page.getByRole('region', {name: 'Cartes mentales'});
      await maps.getByRole('combobox', {name: 'Chapitre'}).selectOption(topic);
      await maps.getByRole('button', {name: 'Générer la carte'}).click();
      await expect(maps.getByRole('region', {name: 'Carte des notions'})).toBeVisible();
      await maps.getByRole('button', {name: `Développer ${branch}`}).click();
      await expect(maps.getByRole('button', {name: child})).toBeVisible();
      await expect(maps.getByText('Passages du cours')).toHaveCount(0);

      await page.setViewportSize({width: 360, height: 800});
      await expect(maps.getByRole('button', {name: 'Plan', exact: true})).toHaveAttribute('aria-pressed', 'true');
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(360);
      await page.reload();
      await expect(maps.getByRole('button', {name: title, exact: true})).toBeVisible();
    } finally {
      await deleteAccount(request, learner);
    }
  });
}
