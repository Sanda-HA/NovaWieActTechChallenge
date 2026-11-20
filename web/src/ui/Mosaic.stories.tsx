import type {Meta, StoryObj} from '@storybook/react-vite';
import {useState} from 'react';
import {Mosaic, MosaicLegend, Tessera, type MosaicTile} from './Mosaic';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/Mosaic', component: Mosaic, parameters: padded} satisfies Meta<typeof Mosaic>;
export default meta;
type Story = StoryObj<typeof meta>;

const tiles: MosaicTile[] = [
  {id: 'limites', label: 'Limites et continuité', level: 'strong', size: 'large'},
  {id: 'suites', label: 'Suites réelles', level: 'medium', size: 'wide'},
  {id: 'derivabilite', label: 'Dérivabilité', level: 'weak'},
  {id: 'probabilites', label: 'Probabilités', level: 'unknown'},
  {id: 'integrales', label: 'Intégrales', level: 'unknown', size: 'wide'},
];

function Selectable(): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>('derivabilite');
  return <Mosaic tiles={tiles} label="Chapitres" selectedId={selectedId} onSelect={setSelectedId} />;
}

export const Map: Story = {args: {tiles, label: 'Chapitres'}};
export const WithSelection: Story = {args: {tiles, label: 'Chapitres'}, render: () => <Selectable />};
export const Empty: Story = {args: {tiles: [], label: 'Chapitres'}};
export const Legend: Story = {args: {tiles, label: 'Chapitres'}, render: () => <MosaicLegend />};
export const SingleTessera: Story = {args: {tiles, label: 'Chapitres'}, render: () => <Tessera label="Dérivabilité" level="weak" />};
