import type {Meta, StoryObj} from '@storybook/react-vite';
import {SourceChip} from './SourceChip';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/SourceChip', component: SourceChip, parameters: padded} satisfies Meta<typeof SourceChip>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {args: {page: 147}};
export const LongBookName: Story = {args: {page: 1024, book: 'Manuel de mathématiques, quatrième année secondaire, tome 2, édition révisée'}};
