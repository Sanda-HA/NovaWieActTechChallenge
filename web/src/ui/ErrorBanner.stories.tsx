import type {Meta, StoryObj} from '@storybook/react-vite';
import {ErrorBanner} from './ErrorBanner';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/ErrorBanner', component: ErrorBanner, parameters: padded} satisfies Meta<typeof ErrorBanner>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithRetry: Story = {args: {message: 'Chargement indisponible. Réessaie.', onRetry: () => {}}};
export const WithoutRetry: Story = {args: {message: 'Cette action n’est pas disponible pour ton compte.'}};
