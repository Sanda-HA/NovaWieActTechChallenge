import type {Meta, StoryObj} from '@storybook/react-vite';
import {MathText} from './MathText';
const padded = {layout: 'padded'} as const;

const meta = {title: 'ui/MathText', component: MathText, parameters: padded} satisfies Meta<typeof MathText>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Inline: Story = {args: {text: "Pour $f(x)=3x^2$, la dérivée est $f'(x)=6x$."}};
export const Display: Story = {args: {text: 'La somme vaut $$\\sum_{k=0}^{n} \\binom{n}{k} p^k (1-p)^{n-k} = 1$$ pour tout $p$.'}};
export const PlainText: Story = {args: {text: 'Aucune formule ici, juste du français avec des accents : élève, dérivée.'}};
