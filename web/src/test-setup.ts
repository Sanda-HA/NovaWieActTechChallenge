import {cleanup, configure} from '@testing-library/react';
import {afterEach} from 'vitest';

// Lazy routes transform their first Astryx imports inside the test, which can take seconds on a cold cache.
configure({asyncUtilTimeout: 10_000});

afterEach(cleanup);
