import SwiftUI

struct LaunchScreen: View {
	var body: some View {
		ZStack {
			NaoTheme.Colors.background
				.ignoresSafeArea()

			VStack(spacing: 16) {
				NaoLogoView(size: 48)
				Text("nao")
					.font(.title2)
					.fontWeight(.semibold)
					.foregroundColor(NaoTheme.Colors.foreground)
			}
		}
	}
}
