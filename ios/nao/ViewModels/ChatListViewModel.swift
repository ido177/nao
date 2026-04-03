import Foundation
import SwiftUI

@MainActor
final class ChatListViewModel: ObservableObject {
	@Published var chats: [ChatListItem] = []
	@Published var starredChats: [ChatListItem] = []
	@Published var isLoading = false
	@Published var error: String?
	@Published var searchQuery = ""
	@Published var searchResults: [ChatSearchResult] = []

	private let chatService = ChatService()
	private var searchTask: Task<Void, Never>?

	func loadChats() async {
		isLoading = chats.isEmpty
		error = nil

		do {
			let allChats = try await chatService.listChats()
			chats = allChats.filter { !$0.isStarred }.sorted { $0.createdAt > $1.createdAt }
			starredChats = allChats.filter { $0.isStarred }.sorted { $0.createdAt > $1.createdAt }
		} catch {
			self.error = error.localizedDescription
		}

		isLoading = false
	}

	func deleteChat(_ chat: ChatListItem) async {
		do {
			try await chatService.deleteChat(id: chat.id)
			chats.removeAll { $0.id == chat.id }
			starredChats.removeAll { $0.id == chat.id }
		} catch {
			self.error = error.localizedDescription
		}
	}

	func toggleStarred(_ chat: ChatListItem) async {
		let newStarred = !chat.isStarred
		do {
			try await chatService.toggleStarred(chatId: chat.id, isStarred: newStarred)
			if newStarred {
				chats.removeAll { $0.id == chat.id }
				var updated = chat
				updated.isStarred = true
				starredChats.insert(updated, at: 0)
			} else {
				starredChats.removeAll { $0.id == chat.id }
				var updated = chat
				updated.isStarred = false
				chats.insert(updated, at: 0)
			}
		} catch {
			self.error = error.localizedDescription
		}
	}

	func addChat(_ chat: ChatListItem) {
		if chat.isStarred {
			starredChats.insert(chat, at: 0)
		} else {
			chats.insert(chat, at: 0)
		}
	}

	func updateChatTitle(id: String, title: String) {
		if let idx = chats.firstIndex(where: { $0.id == id }) {
			chats[idx].title = title
		}
		if let idx = starredChats.firstIndex(where: { $0.id == id }) {
			starredChats[idx].title = title
		}
	}

	func search(query: String) {
		searchTask?.cancel()

		guard query.count >= 2 else {
			searchResults = []
			return
		}

		searchTask = Task {
			try? await Task.sleep(nanoseconds: 300_000_000)
			guard !Task.isCancelled else { return }

			do {
				searchResults = try await chatService.searchChats(query: query)
			} catch {
				if !Task.isCancelled {
					searchResults = []
				}
			}
		}
	}
}
