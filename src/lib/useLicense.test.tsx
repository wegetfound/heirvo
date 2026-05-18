/// <reference types="vitest/globals" />
import { render, screen, waitFor } from "@testing-library/react";
import { useLicense } from "./useLicense";

// Stub ipc at the module level — each test overrides as needed
vi.mock("@/lib/ipc", () => ({
  ipc: {
    getLicenseStatus: vi.fn(),
    activateLicense: vi.fn(),
    deactivateLicense: vi.fn(),
  },
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: (p: string) => p,
}));

import { ipc } from "@/lib/ipc";

/** Minimal consumer that exposes license status fields as text nodes */
function LicenseConsumer() {
  const { status, loaded } = useLicense();
  if (!loaded) return <div>loading</div>;
  return (
    <div>
      <span data-testid="plan">{status.plan}</span>
      <span data-testid="can_import_media">{String(status.can_import_media)}</span>
      <span data-testid="can_save">{String(status.can_save)}</span>
    </div>
  );
}

describe("useLicense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to DEFAULT when getLicenseStatus throws, and can_import_media is false", async () => {
    vi.mocked(ipc.getLicenseStatus).mockRejectedValue(new Error("tauri not available"));

    render(<LicenseConsumer />);

    // Initially "loading" while the promise is in-flight
    expect(screen.getByText("loading")).toBeInTheDocument();

    // After the rejection settles, DEFAULT kicks in
    await waitFor(() =>
      expect(screen.getByTestId("plan")).toHaveTextContent("free"),
    );
    expect(screen.getByTestId("can_import_media")).toHaveTextContent("false");
    expect(screen.getByTestId("can_save")).toHaveTextContent("true");
  });

  it("reflects a successful getLicenseStatus response", async () => {
    vi.mocked(ipc.getLicenseStatus).mockResolvedValue({
      plan: "archive",
      holder: "test@example.com",
      can_save: true,
      can_import_media: true,
      exports_used: 0,
    });

    render(<LicenseConsumer />);

    await waitFor(() =>
      expect(screen.getByTestId("plan")).toHaveTextContent("archive"),
    );
    expect(screen.getByTestId("can_import_media")).toHaveTextContent("true");
  });

  it("loaded flag becomes true after IPC resolves (even on error)", async () => {
    vi.mocked(ipc.getLicenseStatus).mockRejectedValue(new Error("no bridge"));
    render(<LicenseConsumer />);
    // "loading" disappears once loaded=true
    await waitFor(() =>
      expect(screen.queryByText("loading")).not.toBeInTheDocument(),
    );
  });
});
