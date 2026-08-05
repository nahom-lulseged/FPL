import { useUiStore } from '@/store/uiStore';

describe('admin UI preferences', () => {
  beforeEach(() => {
    document.documentElement.dataset.theme = 'dark';
    useUiStore.setState({
      sidebarCollapsed: false,
      isMobileNavOpen: false,
      isUserMenuOpen: false,
      theme: 'dark',
    });
  });

  it('persists theme changes and updates the document', () => {
    useUiStore.getState().toggleTheme();

    expect(useUiStore.getState().theme).toBe('light');
    expect(document.documentElement.dataset.theme).toBe('light');
  });

  it('keeps navigation panels mutually usable on mobile', () => {
    useUiStore.setState({ isUserMenuOpen: true });
    useUiStore.getState().setMobileNavOpen(true);

    expect(useUiStore.getState().isMobileNavOpen).toBe(true);
    expect(useUiStore.getState().isUserMenuOpen).toBe(false);
  });
});
