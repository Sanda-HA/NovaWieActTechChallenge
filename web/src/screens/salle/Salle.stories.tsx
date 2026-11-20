import type {Meta, StoryObj} from '@storybook/react-vite';
import {userEvent, within} from 'storybook/test';
import {ScreenStage} from '../../stories/ScreenStage';

const meta = {title: 'Review/Salle', component: ScreenStage, parameters: {layout: 'fullscreen'}} satisfies Meta<typeof ScreenStage>;
export default meta;
type Story = StoryObj<typeof meta>;

type Play = NonNullable<Story['play']>;

const checkExplanation: Play = async ({canvasElement}) => {
  const canvas = within(canvasElement);
  await userEvent.type(await canvas.findByLabelText('Ton explication'), 'La dérivée de x au carré vaut 2x.');
  await userEvent.click(await canvas.findByRole('button', {name: 'Vérifier mon explication'}));
};

export const Success: Story = {name: 'success', args: {route: '/salle', scenario: 'success'}};
export const Empty: Story = {name: 'empty', args: {route: '/salle', scenario: 'empty'}};
export const Error: Story = {name: 'error', args: {route: '/salle', scenario: 'error'}, play: checkExplanation};
export const Permission: Story = {name: 'permission', args: {route: '/salle', scenario: 'permission'}, play: checkExplanation};
export const Unknown: Story = {name: 'unknown', args: {route: '/salle', scenario: 'unknown'}, play: checkExplanation};
export const Correct: Story = {name: 'correct', args: {route: '/salle', scenario: 'correct'}, play: checkExplanation};
export const Incorrect: Story = {name: 'incorrect', args: {route: '/salle', scenario: 'incorrect'}, play: checkExplanation};
export const Incomplete: Story = {name: 'incomplete', args: {route: '/salle', scenario: 'incomplete'}, play: checkExplanation};
