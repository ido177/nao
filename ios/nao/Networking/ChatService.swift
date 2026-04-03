import Foundation

final class ChatService {
	private let trpc: TRPCClient
	private let api: APIClient

	init(api: APIClient = .shared) {
		self.api = api
		self.trpc = TRPCClient(api: api)
	}

	func listChats() async throws -> [ChatListItem] {
		let response: ChatListResponse = try await trpc.query("chat.list")
		return response.chats
	}

	func getChat(id: String) async throws -> UIChat {
		struct Input: Encodable { let chatId: String }
		return try await trpc.query("chat.get", input: Input(chatId: id))
	}

	func deleteChat(id: String) async throws {
		struct Input: Encodable { let chatId: String }
		try await trpc.mutationVoid("chat.delete", input: Input(chatId: id))
	}

	func renameChat(id: String, title: String) async throws {
		struct Input: Encodable { let chatId: String; let title: String }
		try await trpc.mutationVoid("chat.rename", input: Input(chatId: id, title: title))
	}

	func toggleStarred(chatId: String, isStarred: Bool) async throws {
		struct Input: Encodable { let chatId: String; let isStarred: Bool }
		try await trpc.mutationVoid("chat.toggleStarred", input: Input(chatId: chatId, isStarred: isStarred))
	}

	func stopAgent(chatId: String) async throws {
		struct Input: Encodable { let chatId: String }
		try await trpc.mutationVoid("chat.stop", input: Input(chatId: chatId))
	}

	func searchChats(query: String) async throws -> [ChatSearchResult] {
		struct Input: Encodable { let query: String }
		return try await trpc.query("chat.search", input: Input(query: query))
	}

	func sendMessage(request: AgentRequest) async throws -> AsyncStreamParser {
		let (bytes, response) = try await api.streamRequest(
			path: "/api/agent",
			body: request
		)

		if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 401 {
			throw APIError.unauthorized
		}

		return AsyncStreamParser(bytes: bytes)
	}
}

struct ChatSearchResult: Codable, Identifiable {
	let id: String
	let title: String
	let matchingText: String?
}
