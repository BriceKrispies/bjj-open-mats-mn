import type { JSX } from 'solid-js';
import { createSignal } from 'solid-js';
import { settingsService } from '../../core/settings';
import { storeActions } from '../../core/actions';
import { showToast } from '../../core/toast';
import { Button } from '../../ui/components/Button';
import { Modal } from '../../ui/components/Modal';
import { SunIcon, MoonIcon, TrashIcon, RefreshIcon, MatIcon } from '../../ui/icons';

export function SettingsView(): JSX.Element {
  const isDark = () => settingsService.getTheme() === 'dark';
  const [showResetModal, setShowResetModal] = createSignal(false);

  const toggleTheme = () => {
    storeActions.setTheme(isDark() ? 'light' : 'dark');
  };

  const handleReset = () => {
    storeActions.resetData({ reSeed: true });
    setShowResetModal(false);
    showToast('Data has been reset with fresh sample events.', 'info');
  };

  return (
    <div>
      {/* Header */}
      <div
        style={{
          padding: 'var(--sp-5) var(--sp-4) var(--sp-3)',
          'border-bottom': '1px solid var(--color-border)',
          background: 'var(--color-bg-elevated)',
        }}
      >
        <div style={{ 'font-size': 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
          Preferences
        </div>
        <div
          style={{
            'font-size': 'var(--text-xl)',
            'font-weight': 'var(--weight-bold)',
            'margin-top': '2px',
          }}
        >
          Settings
        </div>
      </div>

      <div style={{ display: 'flex', 'flex-direction': 'column', gap: 'var(--sp-5)', padding: 'var(--sp-5) 0' }}>

        {/* Appearance */}
        <section>
          <div class="section-header">
            <span class="section-title">Appearance</span>
          </div>
          <div class="settings-group">
            <div class="settings-row">
              <div>
                <div class="settings-row__label">Dark Mode</div>
                <div class="settings-row__sub">
                  {isDark() ? 'Currently using dark theme' : 'Currently using light theme'}
                </div>
              </div>
              <label class="toggle" aria-label="Toggle dark mode">
                <input
                  type="checkbox"
                  checked={isDark()}
                  onChange={toggleTheme}
                />
                <div class="toggle-track" />
                <div class="toggle-thumb" />
              </label>
            </div>
            <div class="settings-row" style={{ 'justify-content': 'center', padding: 'var(--sp-3)', gap: 'var(--sp-4)' }}>
              <Button
                variant={!isDark() ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => storeActions.setTheme('light')}
                style={{ flex: 1 }}
              >
                <SunIcon size={16} />
                Light
              </Button>
              <Button
                variant={isDark() ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => storeActions.setTheme('dark')}
                style={{ flex: 1 }}
              >
                <MoonIcon size={16} />
                Dark
              </Button>
            </div>
          </div>
        </section>

        {/* Data */}
        <section>
          <div class="section-header">
            <span class="section-title">Data</span>
          </div>
          <div class="settings-group">
            <div class="settings-row">
              <div>
                <div class="settings-row__label">Reset App Data</div>
                <div class="settings-row__sub">
                  Clears RSVPs and messages, reloads sample open mats.
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowResetModal(true)}
                style={{ 'flex-shrink': '0' }}
              >
                <RefreshIcon size={14} />
                Reset
              </Button>
            </div>
            <div class="settings-row">
              <div>
                <div class="settings-row__label">Clear All Data</div>
                <div class="settings-row__sub">
                  Permanently removes all local data (no undo).
                </div>
              </div>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  storeActions.resetData({ reSeed: false });
                  showToast('All data cleared.', 'warning');
                }}
                style={{ 'flex-shrink': '0' }}
              >
                <TrashIcon size={14} />
                Clear
              </Button>
            </div>
          </div>
        </section>

        {/* About */}
        <section>
          <div class="section-header">
            <span class="section-title">About</span>
          </div>
          <div class="settings-group">
            <div class="settings-row">
              <div class="settings-row__label" style={{ display: 'flex', 'align-items': 'center', gap: 'var(--sp-2)' }}>
                <MatIcon size={20} style={{ color: 'var(--color-accent)' }} />
                BJJ Open Mats
              </div>
              <span style={{ 'font-size': 'var(--text-sm)', color: 'var(--color-text-muted)' }}>
                v0.1.0
              </span>
            </div>
            <div class="settings-row" style={{ 'flex-direction': 'column', 'align-items': 'flex-start', gap: 'var(--sp-1)' }}>
              <div class="settings-row__label">Architecture</div>
              <div class="settings-row__sub">
                SolidJS · TypeScript · Vite · PWA · Modular plugin system
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Reset confirmation modal */}
      <Modal
        open={showResetModal()}
        title="Reset App Data?"
        onClose={() => setShowResetModal(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowResetModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleReset}>
              <RefreshIcon size={16} />
              Reset
            </Button>
          </>
        }
      >
        This will clear all your RSVPs and messages, and reload a fresh set of
        sample open mats. This action cannot be undone.
      </Modal>
    </div>
  );
}
