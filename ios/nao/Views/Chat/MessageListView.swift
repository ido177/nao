import SwiftUI

struct MessageListView: View {
	let messages: [UIMessage]
	let isStreaming: Bool

	var body: some View {
		ScrollViewReader { proxy in
			ScrollView {
				LazyVStack(spacing: 16) {
					ForEach(messages) { message in
						MessageBubble(message: message, isStreaming: isStreaming && message == messages.last)
							.id(message.id)
					}
				}
				.padding(.horizontal, 16)
				.padding(.top, 16)
				.padding(.bottom, 8)
			}
			.onChange(of: messages.count) { _, _ in
				scrollToBottom(proxy: proxy)
			}
			.onChange(of: messages.last?.textContent) { _, _ in
				scrollToBottom(proxy: proxy)
			}
		}
	}

	private func scrollToBottom(proxy: ScrollViewProxy) {
		guard let lastMessage = messages.last else { return }
		withAnimation(.easeOut(duration: 0.2)) {
			proxy.scrollTo(lastMessage.id, anchor: .bottom)
		}
	}
}
