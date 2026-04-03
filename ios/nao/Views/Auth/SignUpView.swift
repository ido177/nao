import SwiftUI

struct SignUpView: View {
	@EnvironmentObject var authViewModel: AuthViewModel
	@Binding var showSignUp: Bool
	@State private var name = ""
	@State private var email = ""
	@State private var password = ""
	@FocusState private var focusedField: Field?

	private enum Field {
		case name, email, password
	}

	var body: some View {
		ScrollView {
			VStack(spacing: 32) {
				Spacer()
					.frame(height: 40)

				VStack(spacing: 16) {
					NaoLogoView(size: 48)

					Text("Sign Up")
						.font(.title2)
						.fontWeight(.semibold)
						.foregroundColor(NaoTheme.Colors.foregroundFallback)
				}

				VStack(spacing: 16) {
					NaoTextField(
						placeholder: "Name",
						text: $name,
						textContentType: .name
					)
					.focused($focusedField, equals: .name)

					NaoTextField(
						placeholder: "Email",
						text: $email,
						keyboardType: .emailAddress,
						textContentType: .emailAddress,
						autocapitalization: .never
					)
					.focused($focusedField, equals: .email)

					NaoTextField(
						placeholder: "Password",
						text: $password,
						isSecure: true,
						textContentType: .newPassword
					)
					.focused($focusedField, equals: .password)
				}

				if let error = authViewModel.error {
					Text(error)
						.font(.subheadline)
						.foregroundColor(NaoTheme.Colors.destructiveFallback)
						.multilineTextAlignment(.center)
				}

				NaoButton(
					title: "Sign Up",
					isLoading: authViewModel.isSubmitting
				) {
					focusedField = nil
					Task { await authViewModel.signUp(name: name, email: email, password: password) }
				}

				ServerURLField()

				Spacer()

				HStack(spacing: 4) {
					Text("Already have an account?")
						.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
					Button("Log In") {
						showSignUp = false
					}
					.fontWeight(.medium)
					.foregroundColor(NaoTheme.Colors.foregroundFallback)
				}
				.font(.subheadline)
			}
			.padding(.horizontal, 24)
			.padding(.bottom, 32)
		}
		.background(NaoTheme.Colors.backgroundFallback.ignoresSafeArea())
		.onSubmit {
			switch focusedField {
			case .name:
				focusedField = .email
			case .email:
				focusedField = .password
			case .password:
				Task { await authViewModel.signUp(name: name, email: email, password: password) }
			case nil:
				break
			}
		}
	}
}
