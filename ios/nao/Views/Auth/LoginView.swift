import SwiftUI

struct LoginView: View {
	@EnvironmentObject var authViewModel: AuthViewModel
	@Binding var showSignUp: Bool
	@State private var email = ""
	@State private var password = ""
	@FocusState private var focusedField: Field?

	private enum Field {
		case email, password
	}

	var body: some View {
		ScrollView {
			VStack(spacing: 32) {
				Spacer()
					.frame(height: 40)

				VStack(spacing: 16) {
					NaoLogoView(size: 48)

					Text("Log In")
						.font(.title2)
						.fontWeight(.semibold)
						.foregroundColor(NaoTheme.Colors.foregroundFallback)
				}

				VStack(spacing: 16) {
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
						textContentType: .password
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
					title: "Log In",
					isLoading: authViewModel.isSubmitting
				) {
					focusedField = nil
					Task { await authViewModel.signIn(email: email, password: password) }
				}

				ServerURLField()

				Spacer()

				HStack(spacing: 4) {
					Text("Don't have an account?")
						.foregroundColor(NaoTheme.Colors.mutedForegroundFallback)
					Button("Sign Up") {
						showSignUp = true
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
			case .email:
				focusedField = .password
			case .password:
				Task { await authViewModel.signIn(email: email, password: password) }
			case nil:
				break
			}
		}
	}
}
