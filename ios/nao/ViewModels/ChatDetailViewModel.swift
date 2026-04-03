import Foundation
import SwiftUI

@MainActor
final class ChatDetailViewModel: ObservableObject {
	@Published var messages: [UIMessage] = []
	@Published var isLoading = false
	@Published var isStreaming = false
	@Published var error: String?
	@Published var chatTitle: String = ""
	@Published var currentToolName: String?

	var chatId: String?
	private let chatService = ChatService()
	private var streamTask: Task<Void, Never>?

	/// Called when a new chat is created during streaming
	var onNewChat: ((ChatListItem) -> Void)?
	/// Called when the chat title is updated
	var onTitleUpdate: ((String) -> Void)?

	func loadChat(id: String) async {
		isLoading = true
		chatId = id

		do {
			let chat = try await chatService.getChat(id: id)
			messages = chat.messages
			chatTitle = chat.title
		} catch {
			self.error = error.localizedDescription
		}

		isLoading = false
	}

	func sendMessage(text: String) async {
		let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
		guard !trimmed.isEmpty, !isStreaming else { return }

		let userMessage = UIMessage(
			id: UUID().uuidString,
			role: .user,
			parts: [.text(trimmed)],
			createdAt: Date(),
			source: nil
		)
		messages.append(userMessage)

		isStreaming = true
		error = nil
		currentToolName = nil

		let assistantId = UUID().uuidString
		let assistantMessage = UIMessage(
			id: assistantId,
			role: .assistant,
			parts: [],
			createdAt: Date(),
			source: nil
		)
		messages.append(assistantMessage)

		let request = AgentRequest(text: trimmed, chatId: chatId)

		streamTask = Task {
			do {
				let parser = try await chatService.sendMessage(request: request)
				var accumulatedText = ""
				var accumulatedReasoning = ""

				for await event in parser.events() {
					guard !Task.isCancelled else { break }

					switch event {
					case .textDelta(let delta):
						accumulatedText += delta
						updateAssistantMessage(
							id: assistantId,
							text: accumulatedText,
							reasoning: accumulatedReasoning
						)

					case .reasoningDelta(let delta):
						accumulatedReasoning += delta
						updateAssistantMessage(
							id: assistantId,
							text: accumulatedText,
							reasoning: accumulatedReasoning
						)

					case .toolCallStarted(let name, _):
						currentToolName = name

					case .toolCallCompleted:
						currentToolName = nil

					case .newChat(let chat):
						chatId = chat.id
						onNewChat?(chat)

					case .newUserMessageId(let newId):
						updateUserMessageId(newId)

					case .chatTitleUpdate(let title):
						chatTitle = title
						onTitleUpdate?(title)

					case .finishMessage:
						break

					case .error(let msg):
						error = msg
					}
				}
			} catch {
				self.error = error.localizedDescription
			}

			isStreaming = false
			currentToolName = nil
		}
	}

	func stopStreaming() {
		streamTask?.cancel()
		streamTask = nil
		isStreaming = false
		currentToolName = nil

		if let chatId = chatId {
			Task {
				try? await chatService.stopAgent(chatId: chatId)
			}
		}
	}

	func editMessage(messageId: String, newText: String) async {
		guard let index = messages.firstIndex(where: { $0.id == messageId }) else { return }

		messages = Array(messages.prefix(index))
		await sendMessageWithEdit(text: newText, editId: messageId)
	}

	private func sendMessageWithEdit(text: String, editId: String) async {
		let userMessage = UIMessage(
			id: UUID().uuidString,
			role: .user,
			parts: [.text(text)],
			createdAt: Date(),
			source: nil
		)
		messages.append(userMessage)

		isStreaming = true
		error = nil

		let assistantId = UUID().uuidString
		let assistantMessage = UIMessage(
			id: assistantId,
			role: .assistant,
			parts: [],
			createdAt: Date(),
			source: nil
		)
		messages.append(assistantMessage)

		let request = AgentRequest(text: text, chatId: chatId, messageToEditId: editId)

		streamTask = Task {
			do {
				let parser = try await chatService.sendMessage(request: request)
				var accumulatedText = ""
				var accumulatedReasoning = ""

				for await event in parser.events() {
					guard !Task.isCancelled else { break }

					switch event {
					case .textDelta(let delta):
						accumulatedText += delta
						updateAssistantMessage(
							id: assistantId,
							text: accumulatedText,
							reasoning: accumulatedReasoning
						)

					case .reasoningDelta(let delta):
						accumulatedReasoning += delta
						updateAssistantMessage(
							id: assistantId,
							text: accumulatedText,
							reasoning: accumulatedReasoning
						)

					case .toolCallStarted(let name, _):
						currentToolName = name

					case .toolCallCompleted:
						currentToolName = nil

					case .newUserMessageId(let newId):
						updateUserMessageId(newId)

					case .chatTitleUpdate(let title):
						chatTitle = title
						onTitleUpdate?(title)

					case .newChat, .finishMessage:
						break

					case .error(let msg):
						error = msg
					}
				}
			} catch {
				self.error = error.localizedDescription
			}

			isStreaming = false
			currentToolName = nil
		}
	}

	private func updateAssistantMessage(id: String, text: String, reasoning: String) {
		guard let index = messages.firstIndex(where: { $0.id == id }) else { return }

		var parts: [UIMessagePart] = []
		if !reasoning.isEmpty {
			parts.append(.reasoning(reasoning))
		}
		if !text.isEmpty {
			parts.append(.text(text))
		}

		messages[index] = UIMessage(
			id: id,
			role: .assistant,
			parts: parts,
			createdAt: messages[index].createdAt,
			source: nil
		)
	}

	private func updateUserMessageId(_ newId: String) {
		guard let lastUserIdx = messages.lastIndex(where: { $0.role == .user }) else { return }
		let old = messages[lastUserIdx]
		messages[lastUserIdx] = UIMessage(
			id: newId,
			role: old.role,
			parts: old.parts,
			createdAt: old.createdAt,
			source: old.source
		)
	}
}
