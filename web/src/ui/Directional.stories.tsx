import type {Meta, StoryObj} from '@storybook/react-vite';
import {Directional} from './Directional';
import {Icon} from './icons';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/Directional', component: Directional, parameters: padded} satisfies Meta<typeof Directional>;
export default meta;
type Story = StoryObj<typeof meta>;

export const ArrowFlipsInRtl: Story = {
  args: {children: <Icon name="arrow-right" size={24} />},
};
