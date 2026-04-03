import SwiftUI

enum NaoTheme {
	enum Colors {
		static let background = Color("Background", bundle: nil)
		static let panel = Color("Panel", bundle: nil)
		static let foreground = Color("Foreground", bundle: nil)
		static let card = Color("Card", bundle: nil)
		static let cardForeground = Color("CardForeground", bundle: nil)
		static let muted = Color("Muted", bundle: nil)
		static let mutedForeground = Color("MutedForeground", bundle: nil)
		static let primary = Color("PrimaryColor", bundle: nil)
		static let primaryForeground = Color("PrimaryForeground", bundle: nil)
		static let accent = Color("AccentColor", bundle: nil)
		static let border = Color("Border", bundle: nil)
		static let destructive = Color("Destructive", bundle: nil)

		static let backgroundFallback = Color(light: .white, dark: Color(hex: "1F1F25"))
		static let panelFallback = Color(light: Color(hex: "FAFAFA"), dark: Color(hex: "2E2E36"))
		static let foregroundFallback = Color(light: Color(hex: "1A1A2E"), dark: Color(hex: "FAFAFA"))
		static let cardFallback = Color(light: .white, dark: Color(hex: "2E2E36"))
		static let cardForegroundFallback = Color(light: Color(hex: "1A1A2E"), dark: Color(hex: "FAFAFA"))
		static let mutedFallback = Color(light: Color(hex: "F0F0F0"), dark: Color(hex: "3A3A44"))
		static let mutedForegroundFallback = Color(light: Color(hex: "737380"), dark: Color(hex: "8E8E9A"))
		static let primaryFallback = Color(light: Color(hex: "1A1A2E"), dark: Color(hex: "E8E8EC"))
		static let primaryForegroundFallback = Color(light: Color(hex: "FAFAFA"), dark: Color(hex: "2E2E36"))
		static let borderFallback = Color(light: Color(hex: "E5E5E5"), dark: Color(hex: "3A3A44"))
		static let destructiveFallback = Color(light: Color(hex: "DC2626"), dark: Color(hex: "EF4444"))
	}

	enum Spacing {
		static let xs: CGFloat = 4
		static let sm: CGFloat = 8
		static let md: CGFloat = 12
		static let lg: CGFloat = 16
		static let xl: CGFloat = 24
		static let xxl: CGFloat = 32
	}

	enum Radius {
		static let sm: CGFloat = 6
		static let md: CGFloat = 8
		static let lg: CGFloat = 10
		static let xl: CGFloat = 14
		static let xxl: CGFloat = 18
	}
}

extension Color {
	init(light: Color, dark: Color) {
		self.init(uiColor: UIColor { traits in
			traits.userInterfaceStyle == .dark ? UIColor(dark) : UIColor(light)
		})
	}

	init(hex: String) {
		let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
		var int: UInt64 = 0
		Scanner(string: hex).scanHexInt64(&int)
		let a, r, g, b: UInt64
		switch hex.count {
		case 6:
			(a, r, g, b) = (255, (int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
		case 8:
			(a, r, g, b) = ((int >> 24) & 0xFF, (int >> 16) & 0xFF, (int >> 8) & 0xFF, int & 0xFF)
		default:
			(a, r, g, b) = (255, 0, 0, 0)
		}
		self.init(
			.sRGB,
			red: Double(r) / 255,
			green: Double(g) / 255,
			blue: Double(b) / 255,
			opacity: Double(a) / 255
		)
	}
}
