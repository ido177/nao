import Foundation

struct SignInRequest: Encodable {
	let email: String
	let password: String
}

struct SignUpRequest: Encodable {
	let email: String
	let password: String
	let name: String
}

final class AuthService {
	private let api: APIClient

	init(api: APIClient = .shared) {
		self.api = api
	}

	func signIn(email: String, password: String) async throws -> Session {
		try await api.requestVoid(
			path: "/api/auth/sign-in/email",
			method: "POST",
			body: SignInRequest(email: email, password: password)
		)
		return try await getSession()
	}

	func signUp(email: String, password: String, name: String) async throws -> Session {
		try await api.requestVoid(
			path: "/api/auth/sign-up/email",
			method: "POST",
			body: SignUpRequest(email: email, password: password, name: name)
		)
		return try await getSession()
	}

	func getSession() async throws -> Session {
		return try await api.request(path: "/api/auth/get-session")
	}

	func signOut() async throws {
		try await api.requestVoid(path: "/api/auth/sign-out", method: "POST")
	}
}
