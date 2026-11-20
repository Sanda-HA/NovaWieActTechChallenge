import type {Meta, StoryObj} from '@storybook/react-vite';
import type {Session} from '../../app/session';
import {ScreenStage} from '../../stories/ScreenStage';

const meta = {title: 'Review/Tuteur', component: ScreenStage, parameters: {layout: 'fullscreen'}} satisfies Meta<typeof ScreenStage>;
export default meta;
type Story = StoryObj<typeof meta>;

const ask = (session: Session): void => {
  const tutor = session.tutor;
  void tutor.send(tutor.active().id, 'Comment dériver $3x^2$ ?');
};

const askGuided = (session: Session): void => {
  const tutor = session.tutor;
  void tutor.send(tutor.newThread({subject: 'math', mode: 'guided'}), 'Propose un exercice sur la dérivation.');
};

export const Success: Story = {name: 'success', args: {route: '/tuteur', scenario: 'success', setup: ask}};
export const Empty: Story = {name: 'empty', args: {route: '/tuteur', scenario: 'empty'}};
export const Busy: Story = {name: 'busy', args: {route: '/tuteur', scenario: 'busy', setup: ask}};
export const Degraded: Story = {name: 'degraded', args: {route: '/tuteur', scenario: 'degraded', setup: ask}};
export const Error: Story = {name: 'error', args: {route: '/tuteur', scenario: 'error', setup: ask}};
export const Hint0: Story = {name: 'hint0', args: {route: '/tuteur', scenario: 'hint0', setup: askGuided}};
export const Hint1: Story = {name: 'hint1', args: {route: '/tuteur', scenario: 'hint1', setup: askGuided}};
export const Hint2: Story = {name: 'hint2', args: {route: '/tuteur', scenario: 'hint2', setup: askGuided}};
export const Pending: Story = {name: 'pending', args: {route: '/tuteur', scenario: 'pending', setup: ask}};
