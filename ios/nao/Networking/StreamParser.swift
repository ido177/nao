import Foundation

enum StreamEvent: Sendable {
	case textDelta(String)
	case reasoningDelta(String)
	case toolCallStarted(name: String, callId: String)
	case toolCallCompleted(callId: String, result: String?)
	case newChat(ChatListItem)
	case newUserMessageId(String)
	case chatTitleUpdate(String)
	case finishMessage(messageId: String?)
	case error(String)
}

/// Parses the SSE-based UI Message Stream format from the Vercel AI SDK.
/// Each line is `data: <JSON>\n\n` where the JSON has a `type` field.
final class AsyncStreamParser: @unchecked Sendable {
	private let bytes: URLSession.AsyncBytes
	private static let dataPrefix = "data: "

	init(bytes: URLSession.AsyncBytes) {
		self.bytes = bytes
	}

	func events() -> AsyncStream<StreamEvent> {
		AsyncStream { continuation in
			Task {
				do {
					for try await line in bytes.lines {
						for event in parseLine(line) {
							continuation.yield(event)
						}
					}
					continuation.finish()
				} catch {
					continuation.yield(.error(error.localizedDescription))
					continuation.finish()
				}
			}
		}
	}

	private func parseLine(_ line: String) -> [StreamEvent] {
		guard line.hasPrefix(Self.dataPrefix) else { return [] }
		let payload = String(line.dropFirst(Self.dataPrefix.count))

		if payload == "[DONE]" { return [] }

		guard let data = payload.data(using: .utf8),
			  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
			  let type = json["type"] as? String else {
			return []
		}

		switch type {
		case "text-delta":
			if let text = json["delta"] as? String {
				return [.textDelta(text)]
			}
		case "reasoning-delta":
			if let text = json["delta"] as? String {
				return [.reasoningDelta(text)]
			}
		case "tool-input-start", "tool-input-available":
			if let toolName = json["toolName"] as? String,
			   let toolCallId = json["toolCallId"] as? String {
				return [.toolCallStarted(name: toolName, callId: toolCallId)]
			}
		case "tool-output-available":
			if let toolCallId = json["toolCallId"] as? String {
				return [.toolCallCompleted(callId: toolCallId, result: nil)]
			}
		case "finish":
			return [.finishMessage(messageId: nil)]
		case "start", "start-step", "finish-step", "text-start", "text-end",
			 "reasoning-start", "reasoning-end", "tool-input-delta", "abort":
			return []
		case "error":
			let errorMsg = json["errorText"] as? String ?? "Unknown error"
			return [.error(errorMsg)]
		case "data-newChat":
			return parseNewChat(json)
		case "data-newUserMessage":
			return parseNewUserMessage(json)
		case "data-chatTitleUpdate":
			return parseChatTitleUpdate(json)
		default:
			return []
		}

		return []
	}

	private func parseNewChat(_ json: [String: Any]) -> [StreamEvent] {
		guard let chatData = json["data"] as? [String: Any],
			  let id = chatData["id"] as? String,
			  let title = chatData["title"] as? String else {
			return []
		}
		let chat = ChatListItem(
			id: id,
			title: title,
			isStarred: chatData["isStarred"] as? Bool ?? false,
			createdAt: chatData["createdAt"] as? TimeInterval ?? Date().timeIntervalSince1970 * 1000,
			updatedAt: chatData["updatedAt"] as? TimeInterval ?? Date().timeIntervalSince1970 * 1000
		)
		return [.newChat(chat)]
	}

	private func parseNewUserMessage(_ json: [String: Any]) -> [StreamEvent] {
		guard let messageData = json["data"] as? [String: Any],
			  let newId = messageData["newId"] as? String else {
			return []
		}
		return [.newUserMessageId(newId)]
	}

	private func parseChatTitleUpdate(_ json: [String: Any]) -> [StreamEvent] {
		guard let titleData = json["data"] as? [String: Any],
			  let title = titleData["title"] as? String else {
			return []
		}
		return [.chatTitleUpdate(title)]
	}
}
