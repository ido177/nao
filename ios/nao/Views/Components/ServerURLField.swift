import SwiftUI

struct ServerURLField: View {
	@State private var isExpanded = false
	@State private var serverURL: String = APIClient.shared.baseURL

	var body: some View {
		VStack(spacing: 8) {
			Button {
				withAnimation(.easeInOut(duration: 0.2)) {
					isExpanded.toggle()
				}
			} label: {
				HStack(spacing: 4) {
					Image(systemName: "server.rack")
						.font(.caption)
					Text("Server")
						.font(.caption)
					Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
						.font(.caption2)
				}
				.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
			}
			.buttonStyle(.plain)

			if isExpanded {
				HStack(spacing: 8) {
					TextField("Server URL", text: $serverURL)
						.font(.caption)
						.textContentType(.URL)
						.keyboardType(.URL)
						.textInputAutocapitalization(.never)
						.autocorrectionDisabled()
						.padding(.horizontal, 12)
						.frame(height: 36)
						.background(NaoTheme.Colors.mutedFallback.opacity(0.5))
						.clipShape(RoundedRectangle(cornerRadius: NaoTheme.Radius.md))
						.overlay(
							RoundedRectangle(cornerRadius: NaoTheme.Radius.md)
								.stroke(NaoTheme.Colors.borderFallback, lineWidth: 1)
						)

					Button("Save") {
						APIClient.shared.baseURL = serverURL
					}
					.font(.caption)
					.fontWeight(.medium)
					.foregroundColor(NaoTheme.Colors.primaryFallback)
				}
			}
		}
	}
}
