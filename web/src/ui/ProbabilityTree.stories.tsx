import type {Meta, StoryObj} from '@storybook/react-vite';
import {ProbabilityTree} from './ProbabilityTree';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/ProbabilityTree', component: ProbabilityTree, parameters: padded} satisfies Meta<typeof ProbabilityTree>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {render: () => <div style={{maxInlineSize: 420}}><ProbabilityTree /></div>};
export const Small: Story = {render: () => <div style={{maxInlineSize: 200}}><ProbabilityTree small /></div>};
