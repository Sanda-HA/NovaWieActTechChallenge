import type {Meta, StoryObj} from '@storybook/react-vite';
import {Icon, iconPaths, type IconName} from './icons';

const meta = {title: 'ui/Icon', component: Icon, parameters: {layout: 'padded'}} satisfies Meta<typeof Icon>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {args: {name: 'book', size: 24}};
export const All: Story = {
  args: {name: 'book'},
  render: () => (
    <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 16}}>
      {(Object.keys(iconPaths) as IconName[]).map(name => (
        <div key={name} style={{display: 'flex', alignItems: 'center', gap: 8}}>
          <Icon name={name} size={24} />
          <span>{name}</span>
        </div>
      ))}
    </div>
  ),
};
