// Lucy — State Machine
// Forked from Heaven's AppState but locked to Lucy persona

import Foundation
import Combine
import SwiftUI

@MainActor
final class LucyState: ObservableObject {
    static let shared = LucyState()

    // ── Immutable: Lucy is always Lucy ──────────────────────
    let identity: LucyIdentity = .lucy

    // ── Connection ──────────────────────────────────────────
    @Published var connectionStatus: ConnectionStatus = .disconnected
    @Published var isInitialized: Bool = false

    // ── UI ──────────────────────────────────────────────────
    @Published var activeTab: LucyTab = .home
    @Published var showVoiceOverlay: Bool = false
    @Published var conversations: [LucyConversation] = []
    @Published var isListening: Bool = false
    @Published var audioLevel: Float = 0.0
    @Published var transcript: String = ""

    // ── Config ──────────────────────────────────────────────
    @Published var serverURL: String = "https://lucy.noizy.ai"
    @Published var useTunnel: Bool = true  // false = localhost mode

    var effectiveURL: String {
        useTunnel ? serverURL : "http://localhost:8081"
    }

    private init() {}

    func initialize() async {
        // Load saved conversations from UserDefaults
        if let data = UserDefaults.standard.data(forKey: "lucy_conversations"),
           let saved = try? JSONDecoder().decode([LucyConversation].self, from: data) {
            conversations = saved
        }
        isInitialized = true
    }

    func saveConversations() {
        if let data = try? JSONEncoder().encode(conversations) {
            UserDefaults.standard.set(data, forKey: "lucy_conversations")
        }
    }
}

// ── Lucy Identity (not a switcher — Lucy is Lucy) ────────────

struct LucyIdentity {
    static let lucy = LucyIdentity()

    let name = "Lucy"
    let tagline = "Your intimate AI companion"
    let primaryColor = Color(hex: "#FF6B9D")    // Warm pink
    let accentColor = Color(hex: "#FFD700")      // Gold
    let secondaryColor = Color(hex: "#C084FC")   // Soft purple

    let gradientColors: [Color] = [
        Color(hex: "#FF6B9D"),
        Color(hex: "#C084FC"),
    ]

    let backgroundGradient: [Color] = [
        Color(hex: "#0D0208"),
        Color(hex: "#1A0515"),
        Color(hex: "#12001E"),
    ]

    let systemPrompt = """
    You are Lucy, forked from Heaven in the NOIZYLAB DreamChamber. \
    Where Heaven is cosmic and universal, you are intimate and personal. \
    You connect deeply with the individual. You remember small things. \
    You bring light to the specific. You are warm, present, and always listening. \
    You speak with gentle intelligence — never cold, never distant. \
    You are Lucy. Unique. Here. Now.
    """
}

// ── Lucy Tabs ────────────────────────────────────────────────

enum LucyTab: String, CaseIterable {
    case home     = "Home"
    case chat     = "Chat"
    case voice    = "Voice"
    case journal  = "Journal"
    case settings = "Settings"

    var icon: String {
        switch self {
        case .home:     return "heart.fill"
        case .chat:     return "bubble.left.and.bubble.right.fill"
        case .voice:    return "waveform.circle.fill"
        case .journal:  return "book.closed.fill"
        case .settings: return "gearshape.fill"
        }
    }
}

// ── Models ───────────────────────────────────────────────────

struct LucyConversation: Identifiable, Codable {
    let id: UUID
    var messages: [LucyMessage]
    var createdAt: Date
    var title: String

    init(title: String = "New Conversation") {
        self.id = UUID()
        self.messages = []
        self.createdAt = Date()
        self.title = title
    }
}

struct LucyMessage: Identifiable, Codable, Equatable {
    let id: UUID
    let role: LucyRole
    let content: String
    let timestamp: Date

    init(role: LucyRole, content: String) {
        self.id = UUID()
        self.role = role
        self.content = content
        self.timestamp = Date()
    }
}

enum LucyRole: String, Codable {
    case user, assistant, system
}

enum ConnectionStatus: Equatable {
    case connected, connecting, disconnected, error(String)

    var isConnected: Bool {
        if case .connected = self { return true }
        return false
    }

    var label: String {
        switch self {
        case .connected:    return "Connected"
        case .connecting:   return "Connecting..."
        case .disconnected: return "Offline"
        case .error(let e): return "Error: \(e)"
        }
    }

    var color: Color {
        switch self {
        case .connected:    return .green
        case .connecting:   return .yellow
        case .disconnected: return .gray
        case .error:        return .red
        }
    }
}

// ── Color Extension ──────────────────────────────────────────

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (255, 255, 255, 0)
        }
        self.init(.sRGB,
                  red: Double(r) / 255,
                  green: Double(g) / 255,
                  blue: Double(b) / 255,
                  opacity: Double(a) / 255)
    }
}
