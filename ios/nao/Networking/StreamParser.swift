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

/// Parses the UI message stream format from the Vercel AI SDK.
final class AsyncStreamParser: @unchecked Sendable {
	private let bytes: URLSession.AsyncBytes

	init(bytes: URLSession.AsyncBytes) {
		self.bytes = bytes
	}

	func events() -> AsyncStream<StreamEvent> {
		AsyncStream { continuation in
			Task {
				do {
					var buffer = ""
					for try await byte in bytes {
						let char = Character(UnicodeScalar(byte))
						buffer.append(char)

						while let newlineRange = buffer.range(of: "\n") {
							let line = String(buffer[buffer.startIndex..<newlineRange.lowerBound])
							buffer.removeSubrange(buffer.startIndex...newlineRange.lowerBound)

							if !line.isEmpty {
								for event in parseLine(line) {
									continuation.yield(event)
								}
							}
						}
					}

					if !buffer.isEmpty {
						for event in parseLine(buffer) {
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
		guard line.count >= 2 else { return [] }

		let prefix = String(line.prefix(2))
		let payload = String(line.dropFirst(2))

		switch prefix {
		case "0:":
			return parseTextPart(payload)
		case "g:":
			return parseReasoningPart(payload)
		case "a:":
			return parseDataPart(payload)
		case "9:":
			return parseToolCallStreamStart(payload)
		case "b:":
			return parseToolCallDelta(payload)
		case "c:":
			return parseToolResult(payload)
		case "e:":
			return [.finishMessage(messageId: nil)]
		case "d:":
			return parseFinish(payload)
		case "3:":
			return [.error(payload)]
		default:
			return []
		}
	}

	private func parseTextPart(_ payload: String) -> [StreamEvent] {
		let cleaned = payload
			.trimmingCharacters(in: .whitespaces)
			.trimmingCharacters(in: CharacterSet(charactersIn: "\""))
		let unescaped = cleaned
			.replacingOccurrences(of: "\\n", with: "\n")
			.replacingOccurrences(of: "\\\"", with: "\"")
			.replacingOccurrences(of: "\\\\", with: "\\")
		return [.textDelta(unescaped)]
	}

	private func parseReasoningPart(_ payload: String) -> [StreamEvent] {
		let cleaned = payload
			.trimmingCharacters(in: .whitespaces)
			.trimmingCharacters(in: CharacterSet(charactersIn: "\""))
		let unescaped = cleaned
			.replacingOccurrences(of: "\\n", with: "\n")
			.replacingOccurrences(of: "\\\"", with: "\"")
			.replacingOccurrences(of: "\\\\", with: "\\")
		return [.reasoningDelta(unescaped)]
	}

	private func parseDataPart(_ payload: String) -> [StreamEvent] {
		guard let data = payload.data(using: .utf8),
			  let array = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
			return []
		}

		var events: [StreamEvent] = []
		for item in array {
			guard let type = item["type"] as? String else { continue }

			switch type {
			case "data-newChat":
				if let chatData = item["data"] as? [String: Any],
				   let id = chatData["id"] as? String,
				   let title = chatData["title"] as? String {
					let chat = ChatListItem(
						id: id,
						title: title,
						isStarred: chatData["isStarred"] as? Bool ?? false,
						createdAt: chatData["createdAt"] as? TimeInterval ?? Date().timeIntervalSince1970 * 1000,
						updatedAt: chatData["updatedAt"] as? TimeInterval ?? Date().timeIntervalSince1970 * 1000
					)
					events.append(.newChat(chat))
				}
			case "data-newUserMessage":
				if let messageData = item["data"] as? [String: Any],
				   let newId = messageData["newId"] as? String {
					events.append(.newUserMessageId(newId))
				}
			case "data-chatTitleUpdate":
				if let titleData = item["data"] as? [String: Any],
				   let title = titleData["title"] as? String {
					events.append(.chatTitleUpdate(title))
				}
			default:
				break
			}
		}
		return events
	}

	private func parseToolCallStreamStart(_ payload: String) -> [StreamEvent] {
		guard let data = payload.data(using: .utf8),
			  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
			  let toolName = json["toolName"] as? String,
			  let toolCallId = json["toolCallId"] as? String else {
			return []
		}
		return [.toolCallStarted(name: toolName, callId: toolCallId)]
	}

	private func parseToolCallDelta(_ payload: String) -> [StreamEvent] {
		return []
	}

	private func parseToolResult(_ payload: String) -> [StreamEvent] {
		guard let data = payload.data(using: .utf8),
			  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
			  let toolCallId = json["toolCallId"] as? String else {
			return []
		}
		let result = json["result"] as? String
		return [.toolCallCompleted(callId: toolCallId, result: result)]
	}

	private func parseFinish(_ payload: String) -> [StreamEvent] {
		guard let data = payload.data(using: .utf8),
			  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
			return [.finishMessage(messageId: nil)]
		}
		let messageId = json["messageId"] as? String
		return [.finishMessage(messageId: messageId)]
	}
}
