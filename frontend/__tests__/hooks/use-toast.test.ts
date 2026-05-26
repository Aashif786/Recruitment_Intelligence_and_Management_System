import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { useToast, toast } from '@/hooks/use-toast';

// The toast module uses a global singleton memoryState.
// We use fake timers to flush REMOVE_TOAST timeouts and achieve clean isolation.
beforeEach(() => {
  vi.useFakeTimers();
  const { result, unmount } = renderHook(() => useToast());
  act(() => {
    result.current.dismiss(); // mark all open: false
  });
  // Advance timers so REMOVE_TOAST fires for all dismissed toasts
  act(() => {
    vi.advanceTimersByTime(2000);
  });
  unmount();
  vi.useRealTimers();
});

describe('useToast hook', () => {
  it('initializes with empty toast list', () => {
    const { result } = renderHook(() => useToast());
    expect(result.current.toasts).toEqual([]);
  });

  it('adds a toast when toast() is called', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Hello World', duration: Infinity });
    });

    expect(result.current.toasts.length).toBe(1);
    expect(result.current.toasts[0].title).toBe('Hello World');
    expect(result.current.toasts[0].open).toBe(true);
  });

  it('toast has a generated id', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'Test', duration: Infinity });
    });

    expect(result.current.toasts[0].id).toBeDefined();
    expect(typeof result.current.toasts[0].id).toBe('string');
  });

  it('can add multiple toasts', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'First', duration: Infinity });
      toast({ title: 'Second', duration: Infinity });
    });

    // Count only open toasts — previously dismissed toasts remain in state until 1s timeout
    const openToasts = result.current.toasts.filter(t => t.open !== false);
    expect(openToasts.length).toBe(2);
    const titles = openToasts.map(t => t.title);
    expect(titles).toContain('First');
    expect(titles).toContain('Second');
  });

  it('can dismiss a specific toast by id', () => {
    const { result } = renderHook(() => useToast());

    let id: string;
    act(() => {
      const t = toast({ title: 'Dismiss Me', duration: Infinity });
      id = t.id;
    });

    act(() => {
      result.current.dismiss(id!);
    });

    const dismissed = result.current.toasts.find(t => t.id === id!);
    // Toast is dismissed (open: false) but not yet removed (REMOVE_TOAST fires after delay)
    expect(dismissed?.open).toBe(false);
  });

  it('can dismiss all toasts at once', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast({ title: 'T1', duration: Infinity });
      toast({ title: 'T2', duration: Infinity });
    });

    act(() => {
      result.current.dismiss(); // dismiss all
    });

    const openToasts = result.current.toasts.filter(t => t.open);
    expect(openToasts.length).toBe(0);
  });

  it('toast.success sets correct type and variant', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast.success({ title: 'Success!', duration: Infinity });
    });

    expect(result.current.toasts[0].type).toBe('success');
    expect(result.current.toasts[0].variant).toBe('success');
  });

  it('toast.destructive sets type to destructive', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast.destructive({ title: 'Error!', duration: Infinity });
    });

    expect(result.current.toasts[0].type).toBe('destructive');
  });

  it('toast.warning sets type to warning', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast.warning({ title: 'Warning!', duration: Infinity });
    });

    expect(result.current.toasts[0].type).toBe('warning');
  });

  it('toast.info sets type to info', () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      toast.info({ title: 'Info', duration: Infinity });
    });

    expect(result.current.toasts[0].type).toBe('info');
  });

  it('update() modifies existing toast fields', () => {
    const { result } = renderHook(() => useToast());

    let update: (props: any) => string;
    act(() => {
      const t = toast({ title: 'Original', duration: Infinity });
      update = t.update;
    });

    act(() => {
      update({ title: 'Updated' });
    });

    expect(result.current.toasts[0].title).toBe('Updated');
  });

  it('dismiss() on individual toast result marks it closed', () => {
    const { result } = renderHook(() => useToast());

    let dismiss: () => void;
    act(() => {
      const t = toast({ title: 'Auto-dismiss', duration: Infinity });
      dismiss = t.dismiss;
    });

    act(() => {
      dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });
});
