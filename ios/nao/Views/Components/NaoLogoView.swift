import SwiftUI

struct NaoLogoView: View {
	var size: CGFloat = 48
	var color: Color = NaoTheme.Colors.foregroundFallback

	var body: some View {
		ZStack {
			Circle()
				.fill(color.opacity(0.08))
				.frame(width: size, height: size)

			Text("n")
				.font(.system(size: size * 0.45, weight: .bold, design: .rounded))
				.foregroundColor(color)
		}
	}
}
