import type {Meta, StoryObj} from '@storybook/react-vite';
import {Mark} from './Mark';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/Mark', component: Mark, parameters: padded} satisfies Meta<typeof Mark>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Brand: Story = {args: {size: 64}};
export const Mono: Story = {args: {size: 64, tone: 'mono'}};
export const Small: Story = {args: {size: 24}};
