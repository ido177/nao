import SwiftUI

struct ChatListView: View {
	@EnvironmentObject var authViewModel: AuthViewModel
	@StateObject private var viewModel = ChatListViewModel()
	@State private var showNewChat = false
	@State private var selectedChatId: String?
	@State private var searchText = ""
	@State private var showUserMenu = false

	var body: some View {
		NavigationStack {
			ZStack {
				NaoTheme.Colors.backgroundFallback
					.ignoresSafeArea()

				VStack(spacing: 0) {
					chatList
				}
			}
			.navigationTitle("nao")
			.navigationBarTitleDisplayMode(.large)
			.toolbar {
				ToolbarItem(placement: .topBarLeading) {
					userMenuButton
				}
				ToolbarItem(placement: .topBarTrailing) {
					newChatButton
				}
			}
			.searchable(text: $searchText, prompt: "Search chats...")
			.onChange(of: searchText) { _, newValue in
				viewModel.search(query: newValue)
			}
			.navigationDestination(item: $selectedChatId) { chatId in
				ChatDetailView(
					chatId: chatId,
					chatListViewModel: viewModel
				)
			}
			.sheet(isPresented: $showNewChat) {
				NewChatView(chatListViewModel: viewModel) { chatId in
					showNewChat = false
					selectedChatId = chatId
				}
			}
			.confirmationDialog("Account", isPresented: $showUserMenu) {
				Button("Sign Out", role: .destructive) {
					Task { await authViewModel.signOut() }
				}
				Button("Cancel", role: .cancel) {}
			} message: {
				if let user = authViewModel.user {
					Text(user.email)
				}
			}
		}
		.task {
			await viewModel.loadChats()
		}
	}

	private var userMenuButton: some View {
		Button {
			showUserMenu = true
		} label: {
			UserAvatar(user: authViewModel.user, size: 32)
		}
	}

	private var newChatButton: some View {
		Button {
			showNewChat = true
		} label: {
			Image(systemName: "square.and.pencil")
				.font(.system(size: 18, weight: .medium))
				.foregroundColor(NaoTheme.Colors.foregroundFallback)
		}
	}

	@ViewBuilder
	private var chatList: some View {
		if viewModel.isLoading {
			VStack {
				Spacer()
				ProgressView()
				Spacer()
			}
		} else if !searchText.isEmpty {
			searchResultsList
		} else if viewModel.chats.isEmpty && viewModel.starredChats.isEmpty {
			emptyChatList
		} else {
			List {
				if !viewModel.starredChats.isEmpty {
					Section("Starred") {
						ForEach(viewModel.starredChats) { chat in
							chatRow(chat)
						}
					}
				}

				if !viewModel.chats.isEmpty {
					Section("Chats") {
						ForEach(viewModel.chats) { chat in
							chatRow(chat)
						}
					}
				}
			}
			.listStyle(.insetGrouped)
			.refreshable {
				await viewModel.loadChats()
			}
		}
	}

	private var searchResultsList: some View {
		List {
			ForEach(viewModel.searchResults) { result in
				Button {
					selectedChatId = result.id
				} label: {
					VStack(alignment: .leading, spacing: 4) {
						Text(result.title)
							.font(.body)
							.foregroundColor(NaoTheme.Colors.foregroundFallback)
							.lineLimit(1)
						if let matchingText = result.matchingText {
							Text(matchingText)
								.font(.caption)
								.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
								.lineLimit(2)
						}
					}
				}
			}
		}
		.listStyle(.insetGrouped)
	}

	private var emptyChatList: some View {
		VStack(spacing: 16) {
			Spacer()
			Image(systemName: "bubble.left.and.bubble.right")
				.font(.system(size: 48))
				.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
			Text("No conversations yet")
				.font(.headline)
				.foregroundColor(NaoTheme.Colors.foregroundFallback)
			Text("Start a new chat to analyze your data")
				.font(.subheadline)
				.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
			Spacer()
		}
	}

	private func chatRow(_ chat: ChatListItem) -> some View {
		Button {
			selectedChatId = chat.id
		} label: {
			HStack(spacing: 12) {
				VStack(alignment: .leading, spacing: 4) {
					Text(chat.title)
						.font(.body)
						.foregroundColor(NaoTheme.Colors.foregroundFallback)
						.lineLimit(1)

					Text(formatDate(chat.updatedAt))
						.font(.caption)
						.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
				}

				Spacer()

				if chat.isStarred {
					Image(systemName: "star.fill")
						.font(.caption)
						.foregroundColor(.orange)
				}
			}
		}
		.swipeActions(edge: .trailing) {
			Button(role: .destructive) {
				Task { await viewModel.deleteChat(chat) }
			} label: {
				Label("Delete", systemImage: "trash")
			}
		}
		.swipeActions(edge: .leading) {
			Button {
				Task { await viewModel.toggleStarred(chat) }
			} label: {
				Label(
					chat.isStarred ? "Unstar" : "Star",
					systemImage: chat.isStarred ? "star.slash" : "star.fill"
				)
			}
			.tint(.orange)
		}
	}

	private func formatDate(_ timestamp: TimeInterval) -> String {
		let date = Date(timeIntervalSince1970: timestamp / 1000)
		let calendar = Calendar.current
		if calendar.isDateInToday(date) {
			let formatter = DateFormatter()
			formatter.dateFormat = "h:mm a"
			return formatter.string(from: date)
		} else if calendar.isDateInYesterday(date) {
			return "Yesterday"
		} else {
			let formatter = DateFormatter()
			formatter.dateFormat = "MMM d"
			return formatter.string(from: date)
		}
	}
}
