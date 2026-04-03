import SwiftUI

struct NewChatView: View {
	@EnvironmentObject var authViewModel: AuthViewModel
	@Environment(\.dismiss) private var dismiss
	@StateObject private var viewModel = ChatDetailViewModel()
	@State private var inputText = ""
	@FocusState private var isInputFocused: Bool

	let chatListViewModel: ChatListViewModel
	let onNavigateToChat: (String) -> Void

	var body: some View {
		NavigationStack {
			ZStack {
				NaoTheme.Colors.panelFallback
					.ignoresSafeArea()

				VStack(spacing: 0) {
					if viewModel.messages.isEmpty {
						emptyState
					} else {
						messagesList
					}

					ChatInputBar(
						text: $inputText,
						isStreaming: viewModel.isStreaming,
						currentToolName: viewModel.currentToolName,
						onSend: sendMessage,
						onStop: { viewModel.stopStreaming() }
					)
					.focused($isInputFocused)
				}
			}
			.navigationTitle("New Chat")
			.navigationBarTitleDisplayMode(.inline)
			.toolbar {
				ToolbarItem(placement: .topBarLeading) {
					Button("Cancel") { dismiss() }
				}
			}
		}
		.onAppear {
			viewModel.onNewChat = { chat in
				chatListViewModel.addChat(chat)
			}
			viewModel.onTitleUpdate = { title in
				if let id = viewModel.chatId {
					chatListViewModel.updateChatTitle(id: id, title: title)
				}
			}
			isInputFocused = true
		}
	}

	private var emptyState: some View {
		VStack(spacing: 16) {
			Spacer()

			NaoLogoView(size: 40)
				.opacity(0.6)

			if let user = authViewModel.user {
				Text("\(user.name.components(separatedBy: " ").first ?? user.name), what do you want to analyze?")
					.font(.title3)
					.fontWeight(.medium)
					.foregroundColor(NaoTheme.Colors.foregroundFallback)
					.multilineTextAlignment(.center)
			} else {
				Text("What do you want to analyze?")
					.font(.title3)
					.fontWeight(.medium)
					.foregroundColor(NaoTheme.Colors.foregroundFallback)
			}

			Spacer()
		}
		.padding(.horizontal, 24)
	}

	private var messagesList: some View {
		MessageListView(
			messages: viewModel.messages,
			isStreaming: viewModel.isStreaming
		)
	}

	private func sendMessage() {
		let text = inputText
		inputText = ""
		Task {
			await viewModel.sendMessage(text: text)
			if let chatId = viewModel.chatId {
				onNavigateToChat(chatId)
			}
		}
	}
}
