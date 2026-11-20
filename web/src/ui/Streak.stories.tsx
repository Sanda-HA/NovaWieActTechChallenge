import type {Meta, StoryObj} from '@storybook/react-vite';
import {Streak} from './Streak';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/Streak', component: Streak, parameters: padded} satisfies Meta<typeof Streak>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Seed: Story = {args: {days: 0}};
export const Bud: Story = {args: {days: 1}};
export const Flower: Story = {args: {days: 3}};
export const Bouquet: Story = {args: {days: 7}};
export const Machmoum: Story = {args: {days: 14}};
export const MachmoumGold: Story = {args: {days: 30}};
export const WithoutNext: Story = {args: {days: 3, showNext: false}};
