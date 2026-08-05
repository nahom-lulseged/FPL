import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

vi.mock('soccer-jersey-fixed', () => ({
  default: {
    draw: ({ shirtText }: { shirtText: string }) =>
      `data:image/svg+xml;base64,mock-${shirtText}`,
  },
}));
