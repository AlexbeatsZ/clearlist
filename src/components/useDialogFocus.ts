import { useEffect, useRef } from 'react';

export function useDialogFocus() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const elements = () =>
      [
        ...(ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
        ) ?? []),
      ].filter((el) => el.getClientRects().length > 0 && !el.classList.contains('visually-hidden'));
    const frame = requestAnimationFrame(() => {
      if (ref.current?.contains(document.activeElement)) return;
      const first = ref.current?.querySelector<HTMLElement>('[autofocus]') ?? elements()[0];
      first?.focus();
    });
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = elements();
      const first = focusable[0],
        last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', trap);
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return ref;
}
