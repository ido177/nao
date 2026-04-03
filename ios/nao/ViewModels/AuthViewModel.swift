import Foundation
import SwiftUI

enum AuthState: Equatable {
	case loading
	case unauthenticated
	case authenticated
}

@MainActor
final class AuthViewModel: ObservableObject {
	@Published var state: AuthState = .loading
	@Published var user: User?
	@Published var error: String?
	@Published var isSubmitting = false

	private let authService = AuthService()

	init() {
		Task { await checkSession() }
	}

	func checkSession() async {
		do {
			let session = try await authService.getSession()
			user = session.user
			state = .authenticated
		} catch {
			state = .unauthenticated
		}
	}

	func signIn(email: String, password: String) async {
		guard !email.isEmpty, !password.isEmpty else {
			error = "Please fill in all fields."
			return
		}

		isSubmitting = true
		error = nil

		do {
			let session = try await authService.signIn(email: email, password: password)
			user = session.user
			state = .authenticated
		} catch let apiError as APIError {
			error = apiError.errorDescription
		} catch {
			self.error = error.localizedDescription
		}

		isSubmitting = false
	}

	func signUp(name: String, email: String, password: String) async {
		guard !name.isEmpty, !email.isEmpty, !password.isEmpty else {
			error = "Please fill in all fields."
			return
		}

		isSubmitting = true
		error = nil

		do {
			let session = try await authService.signUp(email: email, password: password, name: name)
			user = session.user
			state = .authenticated
		} catch let apiError as APIError {
			error = apiError.errorDescription
		} catch {
			self.error = error.localizedDescription
		}

		isSubmitting = false
	}

	func signOut() async {
		do {
			try await authService.signOut()
		} catch {
			// Clear local state regardless
		}
		user = nil
		state = .unauthenticated
	}
}
