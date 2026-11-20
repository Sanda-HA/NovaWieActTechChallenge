import type {Meta, StoryObj} from '@storybook/react-vite';
import {userEvent, within} from 'storybook/test';
import {ScreenStage} from '../../stories/ScreenStage';

const meta = {title: 'Review/Compte', component: ScreenStage, parameters: {layout: 'fullscreen'}} satisfies Meta<typeof ScreenStage>;
export default meta;
type Story = StoryObj<typeof meta>;
type Play = NonNullable<Story['play']>;

const submitAccount =
  (login: boolean): Play =>
  async ({canvasElement}) => {
    const canvas = within(canvasElement);
    if (login) await userEvent.click(await canvas.findByRole('button', {name: 'J’ai déjà un compte'}));
    await userEvent.type(await canvas.findByLabelText('Pseudo'), 'eleve01');
    await userEvent.type(await canvas.findByLabelText('Mot de passe', {selector: 'input'}), 'motdepasse1');
    await userEvent.click(await canvas.findByRole('button', {name: login ? 'Me connecter' : 'Créer mon compte'}));
  };

export const LoginFailed: Story = {name: 'login-failed', args: {route: '/compte', scenario: 'login-failed', signedOut: true}, play: submitAccount(true)};
export const Duplicate: Story = {name: 'duplicate', args: {route: '/compte', scenario: 'duplicate', signedOut: true}, play: submitAccount(false)};
export const Expired: Story = {name: 'expired', args: {route: '/compte', scenario: 'expired', signedOut: true}, play: submitAccount(true)};
export const RegisterError: Story = {name: 'register-error', args: {route: '/compte', scenario: 'register-error', signedOut: true}, play: submitAccount(false)};
export const Pending: Story = {name: 'pending', args: {route: '/compte', scenario: 'pending', signedOut: true}, play: submitAccount(false)};
