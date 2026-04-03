import SwiftUI

struct MessageBubble: View {
	let message: UIMessage
	let isStreaming: Bool

	var body: some View {
		switch message.role {
		case .user:
			userBubble
		case .assistant:
			assistantBubble
		case .system:
			EmptyView()
		}
	}

	private var userBubble: some View {
		HStack {
			Spacer(minLength: 60)

			Text(message.textContent)
				.font(.body)
				.foregroundColor(NaoTheme.Colors.cardForegroundFallback)
				.padding(.horizontal, 14)
				.padding(.vertical, 10)
				.background(NaoTheme.Colors.cardFallback)
				.clipShape(RoundedRectangle(cornerRadius: NaoTheme.Radius.xxl))
				.shadow(color: .black.opacity(0.04), radius: 2, y: 1)
		}
	}

	private var assistantBubble: some View {
		VStack(alignment: .leading, spacing: 8) {
			if let reasoning = message.reasoningContent {
				ReasoningView(text: reasoning)
			}

			if !message.toolInvocations.isEmpty {
				ForEach(message.toolInvocations) { tool in
					ToolCallBadge(tool: tool)
				}
			}

			let text = message.textContent
			if !text.isEmpty {
				MarkdownTextView(text: text)
			} else if message.parts.isEmpty && !isStreaming {
				Text("No response")
					.font(.body)
					.italic()
					.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
			}

			if isStreaming && text.isEmpty && message.reasoningContent == nil {
				TypingIndicator()
			}
		}
		.frame(maxWidth: .infinity, alignment: .leading)
		.padding(.trailing, 40)
	}
}

struct ReasoningView: View {
	let text: String
	@State private var isExpanded = false

	var body: some View {
		VStack(alignment: .leading, spacing: 6) {
			Button {
				withAnimation(.easeInOut(duration: 0.2)) {
					isExpanded.toggle()
				}
			} label: {
				HStack(spacing: 6) {
					Image(systemName: "brain")
						.font(.caption)
					Text("Thinking")
						.font(.caption)
						.fontWeight(.medium)
					Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
						.font(.caption2)
				}
				.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
			}
			.buttonStyle(.plain)

			if isExpanded {
				Text(text)
					.font(.caption)
					.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
					.padding(10)
					.background(NaoTheme.Colors.mutedFallback.opacity(0.5))
					.clipShape(RoundedRectangle(cornerRadius: NaoTheme.Radius.md))
			}
		}
	}
}

struct ToolCallBadge: View {
	let tool: ToolInvocation

	var body: some View {
		HStack(spacing: 8) {
			if tool.isComplete {
				Image(systemName: "checkmark.circle.fill")
					.font(.caption)
					.foregroundColor(.green)
			} else {
				ProgressView()
					.scaleEffect(0.6)
			}

			Text(tool.displayName)
				.font(.caption)
				.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
		}
		.padding(.horizontal, 10)
		.padding(.vertical, 6)
		.background(NaoTheme.Colors.mutedFallback.opacity(0.5))
		.clipShape(RoundedRectangle(cornerRadius: NaoTheme.Radius.md))
	}
}

struct TypingIndicator: View {
	@State private var opacity: [Double] = [0.3, 0.3, 0.3]

	var body: some View {
		HStack(spacing: 4) {
			ForEach(0..<3, id: \.self) { index in
				Circle()
					.fill(NaoTheme.Colors.mutedForegroundFallback)
					.frame(width: 6, height: 6)
					.opacity(opacity[index])
			}
		}
		.padding(.vertical, 8)
		.onAppear {
			animateDots()
		}
	}

	private func animateDots() {
		for i in 0..<3 {
			withAnimation(
				.easeInOut(duration: 0.6)
				.repeatForever(autoreverses: true)
				.delay(Double(i) * 0.2)
			) {
				opacity[i] = 1.0
			}
		}
	}
}
