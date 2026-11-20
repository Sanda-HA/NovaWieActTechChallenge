import type {Meta, StoryObj} from '@storybook/react-vite';
import {ScreenStage} from '../../stories/ScreenStage';

const meta = {title: 'Review/Carte', component: ScreenStage, parameters: {layout: 'fullscreen'}} satisfies Meta<typeof ScreenStage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = {name: 'success', args: {route: '/carte', scenario: 'success'}};
export const Empty: Story = {name: 'empty', args: {route: '/carte', scenario: 'empty'}};
export const MasteryNull: Story = {name: 'mastery-null', args: {route: '/carte', scenario: 'mastery-null'}};
export const MasteryZero: Story = {name: 'mastery-zero', args: {route: '/carte', scenario: 'mastery-zero'}};
export const Error: Story = {name: 'error', args: {route: '/carte', scenario: 'error'}};
