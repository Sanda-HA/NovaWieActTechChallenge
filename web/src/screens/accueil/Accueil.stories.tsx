import type {Meta, StoryObj} from '@storybook/react-vite';
import {ScreenStage} from '../../stories/ScreenStage';

const meta = {title: 'Review/Accueil', component: ScreenStage, parameters: {layout: 'fullscreen'}} satisfies Meta<typeof ScreenStage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {name: 'success', args: {route: '/accueil', scenario: 'success'}};
export const Empty: Story = {name: 'empty', args: {route: '/accueil', scenario: 'empty'}};
export const MasteryNull: Story = {name: 'mastery-null', args: {route: '/accueil', scenario: 'mastery-null'}};
export const MasteryZero: Story = {name: 'mastery-zero', args: {route: '/accueil', scenario: 'mastery-zero'}};
export const Error: Story = {name: 'error', args: {route: '/accueil', scenario: 'error'}};
