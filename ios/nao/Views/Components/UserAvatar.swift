import SwiftUI

struct UserAvatar: View {
	let user: User?
	var size: CGFloat = 32

	var body: some View {
		ZStack {
			Circle()
				.fill(NaoTheme.Colors.mutedFallback)
				.frame(width: size, height: size)

			Text(initials)
				.font(.system(size: size * 0.38, weight: .semibold))
				.foregroundColor(NaoTheme.Colors.foregroundFallback)
		}
	}

	private var initials: String {
		guard let user = user else { return "?" }
		let parts = user.name.components(separatedBy: " ")
		let first = parts.first?.prefix(1) ?? ""
		let last = parts.count > 1 ? parts.last?.prefix(1) ?? "" : ""
		return "\(first)\(last)".uppercased()
	}
}
