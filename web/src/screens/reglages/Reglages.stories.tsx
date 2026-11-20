import type {Meta, StoryObj} from '@storybook/react-vite';
import {userEvent, within} from 'storybook/test';
import {ScreenStage} from '../../stories/ScreenStage';

const meta = {title: 'Review/Reglages', component: ScreenStage, parameters: {layout: 'fullscreen'}} satisfies Meta<typeof ScreenStage>;
export default meta;
type Story = StoryObj<typeof meta>;

type Play = NonNullable<Story['play']>;

const deleteAccount: Play = async ({canvasElement}) => {
  const canvas = within(canvasElement);
  await userEvent.type(await canvas.findByLabelText('Confirme ton pseudo'), 'eleve01');
  await userEvent.click(await canvas.findByRole('button', {name: 'Supprimer mon compte'}));
  await userEvent.click(await within(document.body).findByRole('button', {name: 'Supprimer définitivement'}));
};

const save: Play = async ({canvasElement}) => {
  await userEvent.click(await within(canvasElement).findByRole('button', {name: 'Enregistrer'}));
};

export const Success: Story = {name: 'success', args: {route: '/reglages', scenario: 'success'}};
export const Error: Story = {name: 'error', args: {route: '/reglages', scenario: 'error'}};
export const Permission: Story = {name: 'permission', args: {route: '/reglages', scenario: 'permission'}, play: save};
export const DeleteError: Story = {name: 'delete-error', args: {route: '/reglages', scenario: 'delete-error'}, play: deleteAccount};
export const DeleteSuccess: Story = {name: 'delete-success', args: {route: '/reglages', scenario: 'delete-success'}, play: deleteAccount};
export const SaveSuccess: Story = {name: 'save-success', args: {route: '/reglages', scenario: 'save-success'}, play: save};
