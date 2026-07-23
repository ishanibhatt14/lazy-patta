import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ServiceWorkerRegistrar } from './ServiceWorkerRegistrar';

const pwa = vi.hoisted(() => ({ registerServiceWorker: vi.fn() }));
vi.mock('../../lib/pwa/service-worker', () => ({
  registerServiceWorker: pwa.registerServiceWorker,
}));

describe('ServiceWorkerRegistrar', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it('renders nothing', () => {
    const { container } = render(<ServiceWorkerRegistrar />);
    expect(container).toBeEmptyDOMElement();
  });

  it('registers the worker in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    render(<ServiceWorkerRegistrar />);
    expect(pwa.registerServiceWorker).toHaveBeenCalledTimes(1);
  });

  it('does not register outside production', () => {
    vi.stubEnv('NODE_ENV', 'development');
    render(<ServiceWorkerRegistrar />);
    expect(pwa.registerServiceWorker).not.toHaveBeenCalled();
  });
});
