import SwiftUI

struct NaoButton: View {
	let title: String
	var isLoading: Bool = false
	var style: ButtonStyle = .primary
	let action: () -> Void

	enum ButtonStyle {
		case primary
		case secondary
		case destructive
	}

	var body: some View {
		Button(action: action) {
			HStack(spacing: 8) {
				if isLoading {
					ProgressView()
						.tint(foregroundColor)
						.scaleEffect(0.8)
				}
				Text(title)
					.fontWeight(.semibold)
			}
			.frame(maxWidth: .infinity)
			.frame(height: 48)
			.background(backgroundColor)
			.foregroundColor(foregroundColor)
			.clipShape(RoundedRectangle(cornerRadius: NaoTheme.Radius.lg))
		}
		.disabled(isLoading)
	}

	private var backgroundColor: Color {
		switch style {
		case .primary:
			return NaoTheme.Colors.primaryFallback
		case .secondary:
			return NaoTheme.Colors.mutedFallback
		case .destructive:
			return NaoTheme.Colors.destructiveFallback
		}
	}

	private var foregroundColor: Color {
		switch style {
		case .primary:
			return NaoTheme.Colors.primaryForegroundFallback
		case .secondary:
			return NaoTheme.Colors.foregroundFallback
		case .destructive:
			return .white
		}
	}
}
