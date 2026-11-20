import type {Meta, StoryObj} from '@storybook/react-vite';
import {ScreenStage} from '../../stories/ScreenStage';

const meta = {title: 'Review/Onboarding', component: ScreenStage, parameters: {layout: 'fullscreen'}} satisfies Meta<typeof ScreenStage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Bienvenue: Story = {name: 'bienvenue', args: {route: '/bienvenue', signedOut: true}};
export const Compte: Story = {name: 'compte', args: {route: '/compte', signedOut: true}};
export const Bac: Story = {name: 'bac', args: {route: '/bac', onboarding: true}};
export const Style: Story = {name: 'style', args: {route: '/style', onboarding: true}};
export const Outils: Story = {name: 'outils', args: {route: '/outils', onboarding: true}};
export const Diagnostic: Story = {name: 'diagnostic', args: {route: '/diagnostic', onboarding: true}};
export const Plan: Story = {name: 'plan', args: {route: '/plan', onboarding: true}};
