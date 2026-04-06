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

		let request = AgentRequest(text: trimmed, chatId: chatId)
		await streamResponse(request: request, handleNewChat: true)
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

		let userMessage = UIMessage(
			id: UUID().uuidString,
			role: .user,
			parts: [.text(newText)],
			createdAt: Date(),
			source: nil
		)
		messages.append(userMessage)

		let request = AgentRequest(text: newText, chatId: chatId, messageToEditId: messageId)
		await streamResponse(request: request, handleNewChat: false)
	}

	private func streamResponse(request: AgentRequest, handleNewChat: Bool) async {
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

		streamTask = Task {
			var accumulatedText = ""
			var accumulatedReasoning = ""
			var toolInvocations: [ToolInvocation] = []

			do {
				let parser = try await chatService.sendMessage(request: request)

				for await event in parser.events() {
					guard !Task.isCancelled else { break }

					switch event {
					case .textDelta(let delta):
						accumulatedText += delta
						updateAssistantMessage(
							id: assistantId,
							text: accumulatedText,
							reasoning: accumulatedReasoning,
							tools: toolInvocations
						)

					case .reasoningDelta(let delta):
						accumulatedReasoning += delta
						updateAssistantMessage(
							id: assistantId,
							text: accumulatedText,
							reasoning: accumulatedReasoning,
							tools: toolInvocations
						)

					case .toolCallStarted(let name, let callId):
						currentToolName = name
						if !toolInvocations.contains(where: { $0.toolCallId == callId }) {
							toolInvocations.append(ToolInvocation(
								toolName: name,
								toolCallId: callId,
								state: "partial",
								args: nil,
								result: nil
							))
						}
						updateAssistantMessage(
							id: assistantId,
							text: accumulatedText,
							reasoning: accumulatedReasoning,
							tools: toolInvocations
						)

					case .toolCallCompleted(let callId, _):
						currentToolName = nil
						markToolComplete(&toolInvocations, callId: callId)
						updateAssistantMessage(
							id: assistantId,
							text: accumulatedText,
							reasoning: accumulatedReasoning,
							tools: toolInvocations
						)

					case .newChat(let chat):
						if handleNewChat {
							chatId = chat.id
							onNewChat?(chat)
						}

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

			markAllToolsComplete(&toolInvocations)
			updateAssistantMessage(
				id: assistantId,
				text: accumulatedText,
				reasoning: accumulatedReasoning,
				tools: toolInvocations
			)

			isStreaming = false
			currentToolName = nil
		}
	}

	private func markToolComplete(_ tools: inout [ToolInvocation], callId: String) {
		guard let idx = tools.firstIndex(where: { $0.toolCallId == callId }) else { return }
		let old = tools[idx]
		tools[idx] = ToolInvocation(
			toolName: old.toolName,
			toolCallId: old.toolCallId,
			state: "result",
			args: old.args,
			result: old.result
		)
	}

	private func markAllToolsComplete(_ tools: inout [ToolInvocation]) {
		for i in tools.indices where tools[i].state != "result" {
			let old = tools[i]
			tools[i] = ToolInvocation(
				toolName: old.toolName,
				toolCallId: old.toolCallId,
				state: "result",
				args: old.args,
				result: old.result
			)
		}
	}

	private func updateAssistantMessage(id: String, text: String, reasoning: String, tools: [ToolInvocation] = []) {
		guard let index = messages.firstIndex(where: { $0.id == id }) else { return }

		var parts: [UIMessagePart] = []
		if !reasoning.isEmpty {
			parts.append(.reasoning(reasoning))
		}
		for tool in tools {
			parts.append(.toolInvocation(tool))
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
