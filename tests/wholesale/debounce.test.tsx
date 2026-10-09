import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDebouncedCallback } from "../../src/utils/useDebouncedCallback";

describe("useDebouncedCallback", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("runs once, with the last value, after typing pauses", () => {
    const search = vi.fn();
    const { result } = renderHook(() => useDebouncedCallback(search, 400));
    for (const value of ["a", "ac", "acm", "acme"]) {
      result.current(value);
      vi.advanceTimersByTime(100);
    }
    expect(search).not.toHaveBeenCalled();
    vi.advanceTimersByTime(400);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith("acme");
  });

  it("drops a pending call on cancel and on unmount", () => {
    const search = vi.fn();
    const { result, unmount } = renderHook(() => useDebouncedCallback(search, 400));
    result.current("stale");
    result.current.cancel();
    vi.advanceTimersByTime(400);
    result.current("left page");
    unmount();
    vi.advanceTimersByTime(400);
    expect(search).not.toHaveBeenCalled();
  });

  it("calls the latest callback, not the one from when it was scheduled", () => {
    const first = vi.fn();
    const second = vi.fn();
    const { result, rerender } = renderHook(({ cb }) => useDebouncedCallback(cb, 400), { initialProps: { cb: first } });
    result.current("x");
    rerender({ cb: second });
    vi.advanceTimersByTime(400);
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("x");
  });
});
