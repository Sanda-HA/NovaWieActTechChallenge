import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {ChoiceCard} from './ChoiceCard';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/ChoiceCard', component: ChoiceCard, parameters: padded} satisfies Meta<typeof ChoiceCard>;
export default meta;
type Story = StoryObj<typeof meta>;

function Group({type}: {type: 'radio' | 'checkbox'}): React.JSX.Element {
  const [picked, setPicked] = useState<string[]>(['examples']);
  const toggle = (id: string, checked: boolean) =>
    setPicked(current => (type === 'radio' ? (checked ? [id] : current) : checked ? [...current, id] : current.filter(item => item !== id)));
  return (
    <div style={{display: 'grid', gap: 12, maxInlineSize: 480}}>
      {[
        ['steps', 'Par étapes', 'Un pas après l’autre.'],
        ['examples', 'Par exemples', 'Un exemple résolu d’abord.'],
        ['visual', 'Avec des schémas', undefined],
      ].map(([id, title, description]) => (
        <ChoiceCard key={id} type={type} name="style" title={title ?? ''} description={description} checked={picked.includes(id ?? '')} onChange={checked => toggle(id ?? '', checked)} />
      ))}
    </div>
  );
}

export const Radio: Story = {args: {type: 'radio', title: '', checked: false, onChange: () => {}}, render: () => <Group type="radio" />};
export const Checkbox: Story = {args: {type: 'checkbox', title: '', checked: false, onChange: () => {}}, render: () => <Group type="checkbox" />};
export const Disabled: Story = {args: {type: 'radio', title: 'Bientôt', description: 'Pas encore disponible.', tag: 'Bientôt', icon: 'users', checked: false, disabled: true, onChange: () => {}}};
