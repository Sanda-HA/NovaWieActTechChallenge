import type {Meta, StoryObj} from '@storybook/react-vite';
import {ErrorState} from './ErrorState';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/ErrorState', component: ErrorState, parameters: padded} satisfies Meta<typeof ErrorState>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {args: {message: 'Chargement indisponible. Réessaie.', onRetry: () => {}}};
