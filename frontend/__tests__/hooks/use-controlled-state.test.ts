import { renderHook, act } from '@testing-library/react';
import { useControlledState } from '@/hooks/use-controlled-state';

describe('useControlledState', () => {
  it('uses defaultValue when no value is provided', () => {
    const { result } = renderHook(() =>
      useControlledState({ defaultValue: 'hello' })
    );
    expect(result.current[0]).toBe('hello');
  });

  it('uses value prop when provided (controlled mode)', () => {
    const { result } = renderHook(() =>
      useControlledState({ value: 'controlled', defaultValue: 'default' })
    );
    expect(result.current[0]).toBe('controlled');
  });

  it('calls onChange when setState is called', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControlledState({ defaultValue: 'initial', onChange })
    );

    act(() => {
      result.current[1]('updated');
    });

    expect(onChange).toHaveBeenCalledWith('updated');
    expect(result.current[0]).toBe('updated');
  });

  it('does not throw when onChange is not provided', () => {
    const { result } = renderHook(() =>
      useControlledState({ defaultValue: 42 })
    );

    expect(() => {
      act(() => {
        result.current[1](100);
      });
    }).not.toThrow();

    expect(result.current[0]).toBe(100);
  });

  it('syncs with updated controlled value prop', () => {
    let controlledValue = 'first';
    const { result, rerender } = renderHook(
      ({ value }) => useControlledState({ value }),
      { initialProps: { value: controlledValue } }
    );

    expect(result.current[0]).toBe('first');

    rerender({ value: 'second' });
    expect(result.current[0]).toBe('second');
  });

  it('passes additional args to onChange', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useControlledState<string, [number]>({ defaultValue: 'a', onChange })
    );

    act(() => {
      result.current[1]('b', 99);
    });

    expect(onChange).toHaveBeenCalledWith('b', 99);
  });

  it('returns a stable setter function reference (memoized)', () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(() =>
      useControlledState({ defaultValue: 'x', onChange })
    );

    const setter1 = result.current[1];
    rerender();
    const setter2 = result.current[1];

    expect(setter1).toBe(setter2);
  });

  it('works with boolean values', () => {
    const { result } = renderHook(() =>
      useControlledState({ defaultValue: false })
    );

    expect(result.current[0]).toBe(false);

    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });

  it('works with object values', () => {
    const initial = { count: 0 };
    const { result } = renderHook(() =>
      useControlledState({ defaultValue: initial })
    );

    const next = { count: 5 };
    act(() => result.current[1](next));
    expect(result.current[0]).toEqual({ count: 5 });
  });
});
