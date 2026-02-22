// ── Home Module Registration ──

export const homeModule = {
  id: 'home',
  order: 0,
  nav: { label: 'Home', href: '/' },
  register() {
    // No event handlers needed for home — it's a pure view
  },
};
