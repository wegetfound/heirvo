/// <reference types="vitest/globals" />
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { DiscCard } from "./DiscCard";

// Stub Tauri IPC — no native bridge in jsdom
vi.mock("@/lib/ipc", () => ({
  ipc: {
    library: {
      ensureDiscThumbnail: vi.fn().mockResolvedValue(null),
    },
  },
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
  convertFileSrc: (p: string) => p,
}));

import { ipc } from "@/lib/ipc";

const baseDisc: {
  id: string;
  title: string;
  year: number;
  source: string;
  gradient: "hawaii";
  durationFormatted: string;
  status: "recovered";
  mediaType: "video" | "audio" | "photo" | "document";
} = {
  id: "disc-001",
  title: "Hawaii 1994",
  year: 1994,
  source: "DVD",
  gradient: "hawaii",
  durationFormatted: "1h 23m",
  status: "recovered",
  mediaType: "video",
};

function renderCard(overrides?: Partial<typeof baseDisc>) {
  render(
    <BrowserRouter>
      <DiscCard disc={{ ...baseDisc, ...overrides }} />
    </BrowserRouter>,
  );
}

describe("DiscCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: thumbnail returns null → gradient fallback
    vi.mocked(ipc.library.ensureDiscThumbnail).mockResolvedValue(null);
  });

  it("shows the 'Photo' badge for a photo disc", () => {
    renderCard({ mediaType: "photo" });
    expect(screen.getByText("Photo")).toBeInTheDocument();
  });

  it("shows durationFormatted in the bottom-right badge for a video disc", () => {
    renderCard({ durationFormatted: "45m 12s" });
    expect(screen.getByText("45m 12s")).toBeInTheDocument();
  });

  it("does not render a thumbnail <img> when ensureDiscThumbnail returns null (gradient fallback)", async () => {
    vi.mocked(ipc.library.ensureDiscThumbnail).mockResolvedValue(null);
    renderCard();
    // Wait for the async useEffect to settle
    await waitFor(() =>
      expect(ipc.library.ensureDiscThumbnail).toHaveBeenCalledWith("disc-001"),
    );
    // img only renders when thumbSrc is non-null; gradient fallback = no img
    expect(document.querySelector("img")).toBeNull();
  });

  it("renders a thumbnail <img> when ensureDiscThumbnail returns a path", async () => {
    vi.mocked(ipc.library.ensureDiscThumbnail).mockResolvedValue("/vault/thumb.jpg");
    renderCard();
    // Wait until the img appears in the DOM after the state update
    await waitFor(() => {
      const img = document.querySelector("img");
      expect(img).not.toBeNull();
      expect(img?.getAttribute("src")).toBe("/vault/thumb.jpg");
    });
  });

  it("calls ensureDiscThumbnail for audio discs (waveform thumbnail support)", async () => {
    vi.mocked(ipc.library.ensureDiscThumbnail).mockResolvedValue(null);
    renderCard({ mediaType: "audio" });
    await waitFor(() =>
      expect(ipc.library.ensureDiscThumbnail).toHaveBeenCalledWith("disc-001"),
    );
  });
});
