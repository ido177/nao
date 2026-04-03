import SwiftUI

struct ChatInputBar: View {
	@Binding var text: String
	let isStreaming: Bool
	let currentToolName: String?
	let onSend: () -> Void
	let onStop: () -> Void

	@FocusState private var isFocused: Bool

	var body: some View {
		VStack(spacing: 0) {
			if isStreaming, let toolName = currentToolName {
				HStack(spacing: 6) {
					ProgressView()
						.scaleEffect(0.6)
					Text("Using \(toolName.replacingOccurrences(of: "_", with: " "))...")
						.font(.caption)
						.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
					Spacer()
				}
				.padding(.horizontal, 16)
				.padding(.vertical, 6)
			}

			Divider()
				.foregroundColor(NaoTheme.Colors.borderFallback)

			HStack(alignment: .bottom, spacing: 10) {
				inputField
				actionButton
			}
			.padding(.horizontal, 12)
			.padding(.vertical, 8)
			.background(NaoTheme.Colors.backgroundFallback)
		}
	}

	private var inputField: some View {
		TextField("Ask anything about your data...", text: $text, axis: .vertical)
			.font(.body)
			.lineLimit(1...6)
			.padding(.horizontal, 14)
			.padding(.vertical, 10)
			.background(NaoTheme.Colors.mutedFallback.opacity(0.5))
			.clipShape(RoundedRectangle(cornerRadius: NaoTheme.Radius.xxl))
			.focused($isFocused)
			.submitLabel(.send)
			.onSubmit {
				if !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
					onSend()
				}
			}
	}

	private var actionButton: some View {
		Group {
			if isStreaming {
				Button(action: onStop) {
					Image(systemName: "stop.circle.fill")
						.font(.system(size: 32))
						.foregroundColor(NaoTheme.Colors.foregroundFallback)
				}
			} else {
				Button(action: onSend) {
					Image(systemName: "arrow.up.circle.fill")
						.font(.system(size: 32))
						.foregroundColor(
							text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
							? NaoTheme.Colors.mutedForegroundFallback
							: NaoTheme.Colors.primaryFallback
						)
				}
				.disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
			}
		}
	}
}
