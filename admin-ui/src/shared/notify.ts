export type NotifySeverity = 'success' | 'info' | 'warning' | 'error';

export function notify(message: string, severity: NotifySeverity = 'info') {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(
      new CustomEvent('app:notify', { detail: { message, severity } })
    );
  }
}

