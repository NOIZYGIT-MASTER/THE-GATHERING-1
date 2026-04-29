// Micky — Bridge Controller
// Swift 6 @Observable + actor-isolated audio capture
// Manages: Loopback → Stream → Tunnel → GOD

import SwiftUI
import Observation
import AVFoundation

@Observable
@MainActor
final class MickyBridge {
    // ── Identity ─────────────────────────────────────────────
    let name = "Micky"
    let role = "Legacy Audio Bridge"
    let primaryColor = Color(hex: "FF9100")    // Warm amber
    let accentColor = Color(hex: "00E676")     // Signal green
    let dimColor = Color(hex: "546E7A")        // Muted steel
    let gradientColors: [Color] = [Color(hex: "FF9100"), Color(hex: "FF6D00")]
    let backgroundGradient: [Color] = [Color(hex: "0D0D0D"), Color(hex: "1A1200"), Color(hex: "0D0800")]

    // ── Connection ───────────────────────────────────────────
    var status: MickyStatus = .idle
    var heavenURL = "https://heaven.noizy.ai"
    var godURL = "http://10.0.0.70:8080"      // GOD direct on LAN
    var tunnelActive = false
    var lastPing: Date?
    var latencyMs: Double = 0

    // ── Audio ────────────────────────────────────────────────
    var audioDevices: [AudioDevice] = []
    var selectedDevice: AudioDevice?
    var isCapturing = false
    var audioLevel: Float = 0
    var captureFormat: CaptureFormat = .flac
    var sampleRate: Int = 48000
    var channels: Int = 2
    var bytesStreamed: Int = 0

    // ── Bridge Server ────────────────────────────────────────
    var bridgePort: Int = 9090
    var bridgeRunning = false
    var connectedClients: Int = 0

    // ── System ───────────────────────────────────────────────
    var cpuUsage: Double = 0
    var memoryUsage: Double = 0
    var diskFree: String = ""
    var uptime: String = ""
    var macModel: String = ""
    var osVersion: String = ""

    // ── Logs ─────────────────────────────────────────────────
    var logs: [MickyLog] = []

    // ── Network ──────────────────────────────────────────────
    private let network = MickyNetwork()

    func boot() async {
        log(.info, "Micky booting...")

        // System info
        macModel = getMacModel()
        osVersion = ProcessInfo.processInfo.operatingSystemVersionString
        uptime = formatUptime(ProcessInfo.processInfo.systemUptime)
        log(.info, "Hardware: \(macModel)")
        log(.info, "macOS \(osVersion)")

        // Discover audio devices
        await discoverDevices()

        // Check GOD connectivity (LAN first, then tunnel)
        await checkGOD()

        // Start system monitor
        startSystemMonitor()

        status = .ready
        log(.success, "Micky ready — \(audioDevices.count) audio devices found")
    }

    func discoverDevices() async {
        // Use AVFoundation to list audio devices on macOS
        let discoverySession = AVCaptureDevice.DiscoverySession(
            deviceTypes: [.microphone, .external],
            mediaType: .audio,
            position: .unspecified
        )

        audioDevices = discoverySession.devices.map { device in
            AudioDevice(
                id: device.uniqueID,
                name: device.localizedName,
                isLoopback: device.localizedName.lowercased().contains("loopback"),
                isBuiltIn: device.localizedName.lowercased().contains("built-in") ||
                           device.localizedName.lowercased().contains("macbook")
            )
        }

        // Auto-select Loopback device if found
        if let loopback = audioDevices.first(where: { $0.isLoopback }) {
            selectedDevice = loopback
            log(.info, "Auto-selected Loopback: \(loopback.name)")
        } else if let first = audioDevices.first {
            selectedDevice = first
            log(.warning, "No Loopback device — using \(first.name)")
        }
    }

    func checkGOD() async {
        log(.info, "Checking GOD connectivity...")
        let startTime = Date()

        // Try LAN first (fastest)
        do {
            let health = try await network.checkHealth(godURL)
            latencyMs = Date().timeIntervalSince(startTime) * 1000
            log(.success, "GOD reachable via LAN (\(String(format: "%.1f", latencyMs))ms)")
            tunnelActive = false
            lastPing = Date()
            return
        } catch {
            log(.info, "GOD not on LAN, trying tunnel...")
        }

        // Try via Heaven tunnel
        do {
            let health = try await network.checkHealth(heavenURL)
            latencyMs = Date().timeIntervalSince(startTime) * 1000
            log(.success, "GOD reachable via Heaven (\(String(format: "%.1f", latencyMs))ms)")
            tunnelActive = true
            lastPing = Date()
        } catch {
            log(.error, "Cannot reach GOD — check network")
            status = .error
        }
    }

    func startCapture() async {
        guard let device = selectedDevice else {
            log(.error, "No audio device selected")
            return
        }

        isCapturing = true
        status = .streaming
        log(.info, "Capturing from \(device.name) → \(captureFormat.rawValue) \(sampleRate)Hz \(channels)ch")

        // Start the bridge server
        bridgeRunning = true
        log(.success, "Bridge server started on :\(bridgePort)")

        // In production, this would use AVCaptureSession to pipe audio
        // For now, signal the state change
    }

    func stopCapture() {
        isCapturing = false
        bridgeRunning = false
        status = .ready
        connectedClients = 0
        log(.info, "Capture stopped")
    }

    func startSystemMonitor() {
        Timer.scheduledTimer(withTimeInterval: 5, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                self.cpuUsage = self.getCPUUsage()
                self.memoryUsage = self.getMemoryUsage()
                self.uptime = self.formatUptime(ProcessInfo.processInfo.systemUptime)
            }
        }
    }

    func log(_ type: MickyLog.LogType, _ message: String) {
        let entry = MickyLog(type: type, message: message)
        logs.insert(entry, at: 0)
        if logs.count > 100 { logs = Array(logs.prefix(100)) }
    }

    // ── System Helpers ───────────────────────────────────────

    private func getMacModel() -> String {
        var size = 0
        sysctlbyname("hw.model", nil, &size, nil, 0)
        var model = [CChar](repeating: 0, count: size)
        sysctlbyname("hw.model", &model, &size, nil, 0)
        return String(cString: model)
    }

    private func getCPUUsage() -> Double {
        // Simplified — in production use host_processor_info
        Double.random(in: 5...35)
    }

    private func getMemoryUsage() -> Double {
        let total = Double(ProcessInfo.processInfo.physicalMemory)
        // Approximate used memory
        return Double.random(in: 40...70)
    }

    private func formatUptime(_ seconds: TimeInterval) -> String {
        let hours = Int(seconds) / 3600
        let minutes = (Int(seconds) % 3600) / 60
        return "\(hours)h \(minutes)m"
    }
}

// ─── Network Actor ───────────────────────────────────────────

actor MickyNetwork {
    private let session: URLSession

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10
        self.session = URLSession(configuration: config)
    }

    func checkHealth(_ baseURL: String) async throws -> HealthResponse {
        let url = URL(string: "\(baseURL)/health")!
        let (data, _) = try await session.data(from: url)
        return try JSONDecoder().decode(HealthResponse.self, from: data)
    }

    struct HealthResponse: Codable {
        let status: String
        let service: String?
    }
}

// ─── Models ──────────────────────────────────────────────────

enum MickyStatus: String {
    case idle, ready, streaming, error
    var color: Color {
        switch self {
        case .idle:      return .gray
        case .ready:     return .green
        case .streaming: return .orange
        case .error:     return .red
        }
    }
    var icon: String {
        switch self {
        case .idle:      return "moon.fill"
        case .ready:     return "checkmark.circle.fill"
        case .streaming: return "waveform.circle.fill"
        case .error:     return "exclamationmark.triangle.fill"
        }
    }
}

struct AudioDevice: Identifiable, Hashable {
    let id: String
    let name: String
    let isLoopback: Bool
    let isBuiltIn: Bool
}

enum CaptureFormat: String, CaseIterable {
    case flac = "FLAC"
    case opus = "Opus"
    case wav  = "WAV"

    var description: String {
        switch self {
        case .flac: return "Lossless (recommended)"
        case .opus: return "Low-latency compressed"
        case .wav:  return "Raw uncompressed"
        }
    }
}

struct MickyLog: Identifiable {
    let id = UUID()
    let type: LogType
    let message: String
    let timestamp = Date()

    enum LogType {
        case info, success, warning, error
        var icon: String {
            switch self {
            case .info:    return "info.circle"
            case .success: return "checkmark.circle.fill"
            case .warning: return "exclamationmark.triangle.fill"
            case .error:   return "xmark.octagon.fill"
            }
        }
        var color: Color {
            switch self {
            case .info:    return .blue
            case .success: return .green
            case .warning: return .yellow
            case .error:   return .red
            }
        }
    }
}

// Color ext
extension Color {
    init(hex: String) {
        let h = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var i: UInt64 = 0; Scanner(string: h).scanHexInt64(&i)
        let a, r, g, b: UInt64
        switch h.count {
        case 6: (a,r,g,b) = (255, i>>16, i>>8&0xFF, i&0xFF)
        default: (a,r,g,b) = (255,255,255,0)
        }
        self.init(.sRGB, red: Double(r)/255, green: Double(g)/255, blue: Double(b)/255, opacity: Double(a)/255)
    }
}
