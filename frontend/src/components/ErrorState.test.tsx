import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AxiosError } from "axios";
import { ErrorState } from "./ErrorState";

/** Build an AxiosError with a given response (or none, for a network error). */
function axiosError(status?: number, detail?: string): AxiosError {
  const response =
    status === undefined
      ? undefined
      : ({ status, data: detail ? { detail } : {} } as never);
  return new AxiosError("boom", "ERR", undefined, {}, response);
}

describe("ErrorState", () => {
  it("shows a connectivity message when there is no response", () => {
    render(<ErrorState error={axiosError(undefined)} />);
    expect(screen.getByText("Can't reach the server")).toBeInTheDocument();
  });

  it("shows a server-error message (and the API detail) on 5xx", () => {
    render(<ErrorState error={axiosError(503, "Service is down")} />);
    expect(screen.getByText("Server error")).toBeInTheDocument();
    expect(screen.getByText("Service is down")).toBeInTheDocument();
  });

  it("maps 403 to access denied and 404 to not found", () => {
    const { rerender } = render(<ErrorState error={axiosError(403)} />);
    expect(screen.getByText("Access denied")).toBeInTheDocument();
    rerender(<ErrorState error={axiosError(404)} />);
    expect(screen.getByText("Not found")).toBeInTheDocument();
  });

  it("falls back to a generic message for non-Axios errors", () => {
    render(<ErrorState error={new Error("kaboom")} />);
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("renders a retry button that fires onRetry", () => {
    const onRetry = vi.fn();
    render(<ErrorState error={axiosError(500)} onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("omits the retry button when no handler is given", () => {
    render(<ErrorState error={axiosError(500)} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("honors explicit title/detail overrides", () => {
    render(<ErrorState title="Nope" detail="Custom detail" />);
    expect(screen.getByText("Nope")).toBeInTheDocument();
    expect(screen.getByText("Custom detail")).toBeInTheDocument();
  });
});
