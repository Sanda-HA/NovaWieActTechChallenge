import type {Meta, StoryObj} from '@storybook/react-vite';
import {Mascot} from './Mascot';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/Mascot', component: Mascot, parameters: padded} satisfies Meta<typeof Mascot>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Idle: Story = {args: {mood: 'idle', breathe: true}};
export const Thinking: Story = {args: {mood: 'thinking'}};
export const Cheer: Story = {args: {mood: 'cheer'}};
export const Encourage: Story = {args: {mood: 'encourage'}};
export const Calm: Story = {args: {mood: 'calm'}};
export const Small: Story = {args: {mood: 'idle', size: 48}};
export const Wave: Story = {args: {mood: 'wave'}};
export const Peek: Story = {args: {mood: 'peek'}};
export const Sleep: Story = {args: {mood: 'sleep'}};
