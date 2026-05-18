/// <reference types="vitest/globals" />
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportPaywallModal } from "./ImportPaywallModal";

// Tauri IPC is unavailable in jsdom — stub everything useLicense touches
vi.mock("@/lib/ipc", () => ({
  ipc: {
    getLicenseStatus: vi.fn().mockResolvedValue({
      plan: "free",
      holder: null,
      can_save: true,
      can_import_media: false,
      exports_used: 0,
    }),
    activateLicense: vi.fn(),
    deactivateLicense: vi.fn(),
  },
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: (p: string) => p,
}));

// Lucide icons import SVG — stub to avoid transform issues
vi.mock("lucide-react", () => ({
  X: () => <span data-testid="icon-x" />,
  FolderHeart: () => <span data-testid="icon-folder-heart" />,
  Loader2: () => <span data-testid="icon-loader" />,
  Check: () => <span data-testid="icon-check" />,
}));

function renderModal(props?: Partial<Parameters<typeof ImportPaywallModal>[0]>) {
  const onClose = vi.fn();
  const onUnlocked = vi.fn();
  render(
    <ImportPaywallModal
      open={true}
      onClose={onClose}
      onUnlocked={onUnlocked}
      fileName="Sunset_hawaii.mp4"
      {...props}
    />,
  );
  return { onClose, onUnlocked };
}

describe("ImportPaywallModal", () => {
  it("renders the modal when open=true and shows the headline with 'vault'", () => {
    renderModal();
    // The component renders: "Build a vault for your memories." when fileName is provided
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(/vault/i);
  });

  it("shows the 'Unlock Heirvo Archive — $99' CTA button", () => {
    renderModal();
    expect(
      screen.getByRole("button", { name: /Unlock Heirvo Archive.*\$99/i }),
    ).toBeInTheDocument();
  });

  it("shows the 'Already have a license key?' toggle", () => {
    renderModal();
    expect(
      screen.getByRole("button", { name: /Already have a license key\?/i }),
    ).toBeInTheDocument();
  });

  it("calls onClose when the X button is clicked", async () => {
    const user = userEvent.setup();
    const { onClose } = renderModal();
    await user.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when open=false", () => {
    renderModal({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
