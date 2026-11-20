import {expect, test} from '@playwright/test';
import {appEntry} from './helpers';

test('welcome screen shows', async ({page}) => {
  await page.goto(appEntry());
  await expect(page.getByRole('heading', {name: 'Salut, moi c’est Nova.'})).toBeVisible();
  await expect(page.getByRole('button', {name: 'C’est parti'})).toBeVisible();
});
