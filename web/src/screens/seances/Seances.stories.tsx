import type {Meta, StoryObj} from '@storybook/react-vite';
import {ScreenStage} from '../../stories/ScreenStage';

const meta = {title: 'Review/Seances', component: ScreenStage, parameters: {layout: 'fullscreen'}} satisfies Meta<typeof ScreenStage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const TimerIdle: Story = {name: 'timer-idle', args: {route: '/seances', scenario: 'timer-idle'}};
export const TimerRunning: Story = {name: 'timer-running', args: {route: '/seances', scenario: 'timer-running'}};
export const TimerStopped: Story = {name: 'timer-stopped', args: {route: '/seances', scenario: 'timer-stopped'}};
export const TimerError: Story = {name: 'timer-error', args: {route: '/seances', scenario: 'timer-error'}};
