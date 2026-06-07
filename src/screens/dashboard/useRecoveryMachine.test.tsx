/// <reference types="vitest/globals" />
import { renderHook, waitFor } from "@testing-library/react";
import { useRecoveryMachine } from "./useRecoveryMachine";
import { ipc, events } from "@/lib/ipc";

// Mock the IPC layer
vi.mock("@/lib/ipc", () => ({
  ipc: {
    listDrives: vi.fn(),
    checkDisc: vi.fn(),
    startRecovery: vi.fn(),
    pauseRecovery: vi.fn(),
    cancelRecovery: vi.fn(),
    createSession: vi.fn(),
    listSessions: vi.fn(),
    getDrivePath: vi.fn(),
    probeDisc: vi.fn(),
    changeDrive: vi.fn(),
    dvdRuntimeSecs: vi.fn(),
    getPreflightStatus: vi.fn(),
    getPendingDisc: vi.fn(),
    autoplayGetEnabled: vi.fn(),
    autoplaySetEnabled: vi.fn(),
  },
  events: {
    onDrivesChanged: vi.fn(),
    onProgress: vi.fn(),
    onComplete: vi.fn(),
    onAutoplayOpenDisc: vi.fn(),
  },
}));

// Mock router
vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
}));

// Mock audio
vi.mock("@/lib/audio", () => ({
  audio: {
    play: vi.fn(),
  },
}));

// Mock Tauri path utilities
vi.mock("@tauri-apps/api/path", () => ({
  documentDir: vi.fn(() => Promise.resolve("/home/user/Documents")),
  join: vi.fn((...parts) => Promise.resolve(parts.join("/"))),
}));

// Mock dialog
vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
}));

describe("useRecoveryMachine — Basic Initialization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ipc.listDrives).mockResolvedValue([
      {
        path: "/dev/sr0",
        letter: "E",
        vendor: "Samsung",
        model: "DVD Drive",
        firmware: "1.0",
        capabilities: {
          reads_dvd: true,
          reads_cd: true,
          reads_bluray: false,
          supports_speed_control: true,
        },
        has_media: true,
      },
    ]);
    vi.mocked(ipc.listSessions).mockResolvedValue([]);
    vi.mocked(ipc.checkDisc).mockResolvedValue({
      disc_type: "DvdVideo",
      label: "Test Disc",
      total_sectors: 1000,
      sector_size: 2048,
      fingerprint: "disc-uuid-1",
      has_video_ts: true,
      has_audio_ts: false,
    });
    vi.mocked(events.onDrivesChanged).mockResolvedValue(() => Promise.resolve());
    vi.mocked(events.onProgress).mockResolvedValue(() => Promise.resolve());
    vi.mocked(events.onComplete).mockResolvedValue(() => Promise.resolve());
    vi.mocked(events.onAutoplayOpenDisc).mockResolvedValue(() => Promise.resolve());
  });

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useRecoveryMachine());
    expect(result.current.state).toBeDefined();
    expect(result.current.actions).toBeDefined();
    expect(result.current.drives).toStrictEqual([]);
  });

  it("provides all required actions", () => {
    const { result } = renderHook(() => useRecoveryMachine());
    expect(result.current.actions.start).toBeInstanceOf(Function);
    expect(result.current.actions.pause).toBeInstanceOf(Function);
    expect(result.current.actions.resume).toBeInstanceOf(Function);
    expect(result.current.actions.cancel).toBeInstanceOf(Function);
    expect(result.current.actions.recoverAnother).toBeInstanceOf(Function);
  });

  it("initializes with null resumeError", () => {
    const { result } = renderHook(() => useRecoveryMachine());
    expect(result.current.resumeError).toBeNull();
  });
});

describe("useRecoveryMachine — Drive Detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ipc.listDrives).mockResolvedValue([
      {
        path: "/dev/sr0",
        letter: "E",
        vendor: "Samsung",
        model: "DVD Drive",
        firmware: "1.0",
        capabilities: {
          reads_dvd: true,
          reads_cd: true,
          reads_bluray: false,
          supports_speed_control: true,
        },
        has_media: true,
      },
    ]);
    vi.mocked(ipc.listSessions).mockResolvedValue([]);
    vi.mocked(ipc.checkDisc).mockResolvedValue({
      disc_type: "DvdVideo",
      label: "Test Disc",
      total_sectors: 1000,
      sector_size: 2048,
      fingerprint: "disc-uuid-1",
      has_video_ts: true,
      has_audio_ts: false,
    });
    vi.mocked(events.onDrivesChanged).mockResolvedValue(() => Promise.resolve());
    vi.mocked(events.onProgress).mockResolvedValue(() => Promise.resolve());
    vi.mocked(events.onComplete).mockResolvedValue(() => Promise.resolve());
    vi.mocked(events.onAutoplayOpenDisc).mockResolvedValue(() => Promise.resolve());
  });

  it("registers drive change listener on mount", () => {
    renderHook(() => useRecoveryMachine());
    expect(events.onDrivesChanged).toHaveBeenCalled();
  });

  it("handles empty drive list", async () => {
    vi.mocked(ipc.listDrives).mockResolvedValue([]);
    const { result } = renderHook(() => useRecoveryMachine());

    await waitFor(
      () => {
        expect(result.current.drives).toStrictEqual([]);
      },
      { timeout: 1000 }
    );
  });
});

describe("useRecoveryMachine — Error Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ipc.listDrives).mockResolvedValue([
      {
        path: "/dev/sr0",
        letter: "E",
        vendor: "Samsung",
        model: "DVD Drive",
        firmware: "1.0",
        capabilities: {
          reads_dvd: true,
          reads_cd: true,
          reads_bluray: false,
          supports_speed_control: true,
        },
        has_media: true,
      },
    ]);
    vi.mocked(ipc.listSessions).mockResolvedValue([]);
    vi.mocked(ipc.checkDisc).mockRejectedValue(new Error("Disc unreadable"));
    vi.mocked(events.onDrivesChanged).mockResolvedValue(() => Promise.resolve());
    vi.mocked(events.onProgress).mockResolvedValue(() => Promise.resolve());
    vi.mocked(events.onComplete).mockResolvedValue(() => Promise.resolve());
    vi.mocked(events.onAutoplayOpenDisc).mockResolvedValue(() => Promise.resolve());
  });

  it("handles IPC errors gracefully", async () => {
    const { result } = renderHook(() => useRecoveryMachine());

    // Hook should initialize despite errors
    expect(result.current.state).toBeDefined();
    expect(result.current.actions).toBeDefined();
  });
});
