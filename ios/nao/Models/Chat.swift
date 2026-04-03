import Foundation

struct ChatListItem: Identifiable, Codable, Equatable {
	let id: String
	var title: String
	var isStarred: Bool
	let createdAt: TimeInterval
	var updatedAt: TimeInterval
}

struct ChatListResponse: Codable {
	let chats: [ChatListItem]
}

struct UIChat: Codable {
	let id: String
	var title: String
	var isStarred: Bool
	let createdAt: TimeInterval
	var updatedAt: TimeInterval
	var messages: [UIMessage]
}

struct UIMessage: Identifiable, Codable, Equatable {
	let id: String
	let role: MessageRole
	var parts: [UIMessagePart]
	let createdAt: Date?
	let source: String?

	var textContent: String {
		parts.compactMap { part in
			if case .text(let text) = part { return text }
			return nil
		}.joined()
	}

	var reasoningContent: String? {
		let reasoning = parts.compactMap { part -> String? in
			if case .reasoning(let text) = part { return text }
			return nil
		}.joined()
		return reasoning.isEmpty ? nil : reasoning
	}

	var toolInvocations: [ToolInvocation] {
		parts.compactMap { part in
			if case .toolInvocation(let tool) = part { return tool }
			return nil
		}
	}
}

enum MessageRole: String, Codable {
	case user
	case assistant
	case system
}

enum UIMessagePart: Codable, Equatable {
	case text(String)
	case reasoning(String)
	case toolInvocation(ToolInvocation)
	case data(String, AnyCodable)
	case unknown

	private enum CodingKeys: String, CodingKey {
		case type, text, toolName, toolCallId, state, args, result, data
	}

	init(from decoder: Decoder) throws {
		let container = try decoder.container(keyedBy: CodingKeys.self)
		let type = try container.decode(String.self, forKey: .type)

		switch type {
		case "text":
			let text = try container.decode(String.self, forKey: .text)
			self = .text(text)
		case "reasoning":
			let text = try container.decodeIfPresent(String.self, forKey: .text) ?? ""
			self = .reasoning(text)
		default:
			if type.hasPrefix("tool-") {
				let toolName = type.replacingOccurrences(of: "tool-", with: "")
				let toolCallId = try container.decodeIfPresent(String.self, forKey: .toolCallId) ?? UUID().uuidString
				let state = try container.decodeIfPresent(String.self, forKey: .state) ?? "result"
				let args = try container.decodeIfPresent(AnyCodable.self, forKey: .args)
				let result = try container.decodeIfPresent(AnyCodable.self, forKey: .result)
				self = .toolInvocation(ToolInvocation(
					toolName: toolName,
					toolCallId: toolCallId,
					state: state,
					args: args,
					result: result
				))
			} else if type.hasPrefix("data-") {
				let dataType = type
				let data = try container.decodeIfPresent(AnyCodable.self, forKey: .data) ?? AnyCodable(nil as String?)
				self = .data(dataType, data)
			} else {
				self = .unknown
			}
		}
	}

	func encode(to encoder: Encoder) throws {
		var container = encoder.container(keyedBy: CodingKeys.self)
		switch self {
		case .text(let text):
			try container.encode("text", forKey: .type)
			try container.encode(text, forKey: .text)
		case .reasoning(let text):
			try container.encode("reasoning", forKey: .type)
			try container.encode(text, forKey: .text)
		case .toolInvocation(let tool):
			try container.encode("tool-\(tool.toolName)", forKey: .type)
			try container.encode(tool.toolCallId, forKey: .toolCallId)
			try container.encode(tool.state, forKey: .state)
		case .data(let type, _):
			try container.encode(type, forKey: .type)
		case .unknown:
			try container.encode("unknown", forKey: .type)
		}
	}
}

struct ToolInvocation: Codable, Equatable, Identifiable {
	var id: String { toolCallId }
	let toolName: String
	let toolCallId: String
	let state: String
	let args: AnyCodable?
	let result: AnyCodable?

	var displayName: String {
		toolName
			.replacingOccurrences(of: "_", with: " ")
			.capitalized
	}

	var isComplete: Bool {
		state == "result"
	}
}
