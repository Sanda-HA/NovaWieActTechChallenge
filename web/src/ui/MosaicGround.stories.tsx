import type {Meta, StoryObj} from '@storybook/react-vite';
import {MosaicGround} from './MosaicGround';

const meta = {title: 'ui/MosaicGround', component: MosaicGround, parameters: {layout: 'fullscreen'}} satisfies Meta<typeof MosaicGround>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {render: () => <div style={{minBlockSize: '60vh'}}><MosaicGround /></div>};
