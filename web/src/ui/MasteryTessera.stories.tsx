import type {Meta, StoryObj} from '@storybook/react-vite';
import {MasteryTessera} from './MasteryTessera';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/MasteryTessera', component: MasteryTessera, parameters: padded} satisfies Meta<typeof MasteryTessera>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Unknown: Story = {args: {level: 'unknown', size: 48}};
export const Weak: Story = {args: {level: 'weak', size: 48}};
export const Medium: Story = {args: {level: 'medium', size: 48}};
export const Strong: Story = {args: {level: 'strong', size: 48}};
