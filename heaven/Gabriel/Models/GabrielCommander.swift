// Gabriel — Commander (State + Logic)
// Swift 6 @Observable — no ObservableObject/Published boilerplate
// Actor-isolated network operations for thread safety

import SwiftUI
import Observation

@Observable
@MainActor
final class GabrielCommander {
    // ── Identity ─────────────────────────────────────────────
    let name = "Gabriel"
    let role = "Release Commander & Swarm Leader"
    let primaryColor = Color(hex: "00E5FF")    // Electric cyan
    let accentColor = Color(hex: "76FF03")     // Neon green
    let dangerColor = Color(hex: "FF1744")     // Alert red
    let gradientColors: [Color] = [Color(hex: "00E5FF"), Color(hex: "2979FF")]
    let backgroundGradient: [Color] = [Color(hex: "000A12"), Color(hex: "01141F"), Color(hex: "0A192F")]

    // ── Connection ───────────────────────────────────────────
    var status: GabrielStatus = .offline
    var serverURL = "https://gabriel.dreamchamber.noizy.ai"
    var useTunnel = true
    var effectiveURL: String { useTunnel ? serverURL : "http://localhost:7777" }

    // ── UI State ─────────────────────────────────────────────
    var activeTab: GabrielTab = .command
    var showingDeploy = false
    var notifications: [GabrielNotification] = []

    // ── Agents ───────────────────────────────────────────────
    var agents: [AgentStatus] = AgentStatus.defaults

    // ── Messages ─────────────────────────────────────────────
    var messages: [GabrielMessage] = []
    var isProcessing = false

    // ── Dispatch Log ─────────────────────────────────────────
    var dispatches: [DispatchRecord] = []

    // ── Network Actor ────────────────────────────────────────
    private let network = GabrielNetwork()

    func boot() async {
        status = .connecting
        do {
            let health = try await network.checkHealth(effectiveURL)
            status = health.status == "healthy" ? .online : .degraded
            notifications.insert(
                GabrielNotification(type: .info, message: "Connected to \(health.service ?? "DreamChamber")"),
                at: 0
            )
        } catch {
            status = .offline
            // Auto-fallback to localhost
            if useTunnel {
                useTunnel = false
                await boot()
                return
            }
            notifications.insert(
                GabrielNotification(type: .error, message: "Cannot reach GOD: \(error.localizedDescription)"),
                at: 0
            )
        }

        // Load agent status
        await refreshAgents()
    }

    func send(_ text: String) async {
        let userMsg = GabrielMessage(role: .user, content: text)
        messages.append(userMsg)
        isProcessing = true

        do {
            let reply = try await network.chat(effectiveURL, text: text, history: messages)
            messages.append(GabrielMessage(role: .assistant, content: reply))
        } catch {
            messages.append(GabrielMessage(role: .assistant, content: "⚠️ \(error.localizedDescription)"))
        }
        isProcessing = false
    }

    func dispatch(agent: String, signal: String) async {
        let record = DispatchRecord(agent: agent, signal: signal)
        dispatches.insert(record, at: 0)
        notifications.insert(
            GabrielNotification(type: .dispatch, message: "→ \(agent).\(signal)"),
            at: 0
        )

        do {
            try await network.dispatch(effectiveURL, agent: agent, signal: signal)
            if let idx = dispatches.firstIndex(where: { $0.id == record.id }) {
                dispatches[idx].status = .completed
            }
        } catch {
            if let idx = dispatches.firstIndex(where: { $0.id == record.id }) {
                dispatches[idx].status = .failed
            }
        }
    }

    func refreshAgents() async {
        do {
            let agentList = try await network.fetchAgents(effectiveURL)
            agents = agentList
        } catch {
            // Keep defaults
        }
    }
}

// ─── Network Actor (thread-safe, off main) ───────────────────

actor GabrielNetwork {
    private let session: URLSession

    init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 60
        self.session = URLSession(configuration: config)
    }

    func checkHealth(_ baseURL: String) async throws -> HealthPayload {
        let url = URL(string: "\(baseURL)/health")!
        let (data, _) = try await session.data(from: url)
        return try JSONDecoder().decode(HealthPayload.self, from: data)
    }

    func chat(_ baseURL: String, text: String, history: [GabrielMessage]) async throws -> String {
        let url = URL(string: "\(baseURL)/api/chat")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload = ChatPayload(
            messages: history.map { .init(role: $0.role.rawValue, content: $0.content) }
                + [.init(role: "user", content: text)],
            identity: "gabriel"
        )
        request.httpBody = try JSONEncoder().encode(payload)

        let (data, _) = try await session.data(for: request)
        let response = try JSONDecoder().decode(ChatReply.self, from: data)
        return response.reply
    }

    func dispatch(_ baseURL: String, agent: String, signal: String) async throws {
        let url = URL(string: "\(baseURL)/api/dispatch")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let payload: [String: String] = ["agent": agent, "signal": signal]
        request.httpBody = try JSONEncoder().encode(payload)

        let (_, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, http.statusCode == 200 else {
            throw GabrielError.dispatchFailed
        }
    }

    func fetchAgents(_ baseURL: String) async throws -> [AgentStatus] {
        let url = URL(string: "\(baseURL)/api/agents")!
        let (data, _) = try await session.data(from: url)

        struct AgentListResponse: Codable {
            let agents: [AgentItem]
            struct AgentItem: Codable {
                let id: String
                let role: String
                let status: String
            }
        }
        let response = try JSONDecoder().decode(AgentListResponse.self, from: data)
        return response.agents.map { item in
            AgentStatus(id: item.id, role: item.role, isOnline: item.status == "active")
        }
    }
}

// ─── Models ──────────────────────────────────────────────────

enum GabrielStatus: String {
    case online, connecting, degraded, offline
    var color: Color {
        switch self {
        case .online:     return .green
        case .connecting: return .yellow
        case .degraded:   return .orange
        case .offline:    return .gray
        }
    }
    var label: String { rawValue.capitalized }
    var icon: String {
        switch self {
        case .online:     return "bolt.fill"
        case .connecting: return "arrow.triangle.2.circlepath"
        case .degraded:   return "exclamationmark.triangle.fill"
        case .offline:    return "wifi.slash"
        }
    }
}

enum GabrielTab: String, CaseIterable {
    case command  = "Command"
    case agents   = "Agents"
    case dispatch = "Dispatch"
    case settings = "Config"

    var icon: String {
        switch self {
        case .command:  return "terminal.fill"
        case .agents:   return "person.3.fill"
        case .dispatch: return "arrow.up.right.square.fill"
        case .settings: return "gearshape.fill"
        }
    }
}

struct GabrielMessage: Identifiable, Equatable {
    let id = UUID()
    let role: GabrielRole
    let content: String
    let timestamp = Date()
}

enum GabrielRole: String, Codable {
    case user, assistant, system
}

struct GabrielNotification: Identifiable {
    let id = UUID()
    let type: NotificationType
    let message: String
    let timestamp = Date()

    enum NotificationType {
        case info, error, dispatch, deploy
        var icon: String {
            switch self {
            case .info:     return "info.circle.fill"
            case .error:    return "xmark.octagon.fill"
            case .dispatch: return "arrow.right.circle.fill"
            case .deploy:   return "rocket.fill"
            }
        }
        var color: Color {
            switch self {
            case .info:     return .blue
            case .error:    return .red
            case .dispatch: return .cyan
            case .deploy:   return .green
            }
        }
    }
}

struct AgentStatus: Identifiable {
    let id: String
    let role: String
    var isOnline: Bool

    static let defaults: [AgentStatus] = [
        .init(id: "gabriel", role: "Release Commander", isOnline: false),
        .init(id: "heaven", role: "DNS & Edge", isOnline: false),
        .init(id: "lucy", role: "Voice Guardian", isOnline: false),
        .init(id: "keith", role: "Infrastructure", isOnline: false),
        .init(id: "claude", role: "Strategist", isOnline: false),
        .init(id: "shirl", role: "Sample Intel", isOnline: false),
        .init(id: "dream", role: "DAW Whisperer", isOnline: false),
        .init(id: "pops", role: "Orchestrator", isOnline: false),
        .init(id: "cb01", role: "Contracts", isOnline: false),
    ]
}

struct DispatchRecord: Identifiable {
    let id = UUID()
    let agent: String
    let signal: String
    let timestamp = Date()
    var status: DispatchStatus = .pending

    enum DispatchStatus {
        case pending, completed, failed
        var icon: String {
            switch self {
            case .pending:   return "clock.fill"
            case .completed: return "checkmark.circle.fill"
            case .failed:    return "xmark.circle.fill"
            }
        }
        var color: Color {
            switch self {
            case .pending:   return .yellow
            case .completed: return .green
            case .failed:    return .red
            }
        }
    }
}

// Network DTOs
struct HealthPayload: Codable { let status: String; let service: String? }
struct ChatPayload: Codable { let messages: [Msg]; let identity: String; struct Msg: Codable { let role: String; let content: String } }
struct ChatReply: Codable { let reply: String }
enum GabrielError: LocalizedError { case dispatchFailed; var errorDescription: String? { "Dispatch failed" } }

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
