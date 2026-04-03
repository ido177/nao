import SwiftUI

struct NaoTextField: View {
	let placeholder: String
	@Binding var text: String
	var isSecure: Bool = false
	var keyboardType: UIKeyboardType = .default
	var textContentType: UITextContentType?
	var autocapitalization: TextInputAutocapitalization = .sentences

	var body: some View {
		Group {
			if isSecure {
				SecureField(placeholder, text: $text)
					.textContentType(textContentType)
			} else {
				TextField(placeholder, text: $text)
					.keyboardType(keyboardType)
					.textContentType(textContentType)
					.textInputAutocapitalization(autocapitalization)
			}
		}
		.font(.body)
		.padding(.horizontal, 16)
		.frame(height: 48)
		.background(NaoTheme.Colors.mutedFallback.opacity(0.5))
		.clipShape(RoundedRectangle(cornerRadius: NaoTheme.Radius.lg))
		.overlay(
			RoundedRectangle(cornerRadius: NaoTheme.Radius.lg)
				.stroke(NaoTheme.Colors.borderFallback, lineWidth: 1)
		)
	}
}
