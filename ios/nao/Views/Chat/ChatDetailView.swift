import SwiftUI

struct ChatDetailView: View {
	let chatId: String
	let chatListViewModel: ChatListViewModel

	@StateObject private var viewModel = ChatDetailViewModel()
	@State private var inputText = ""
	@FocusState private var isInputFocused: Bool

	var body: some View {
		ZStack {
			NaoTheme.Colors.panelFallback
				.ignoresSafeArea()

			VStack(spacing: 0) {
				if viewModel.isLoading {
					Spacer()
					ProgressView()
					Spacer()
				} else {
					MessageListView(
						messages: viewModel.messages,
						isStreaming: viewModel.isStreaming
					)

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
		}
		.navigationTitle(viewModel.chatTitle)
		.navigationBarTitleDisplayMode(.inline)
		.task {
			viewModel.onTitleUpdate = { title in
				chatListViewModel.updateChatTitle(id: chatId, title: title)
			}
			await viewModel.loadChat(id: chatId)
		}
	}

	private func sendMessage() {
		let text = inputText
		inputText = ""
		Task { await viewModel.sendMessage(text: text) }
	}
}
