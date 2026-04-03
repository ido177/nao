import Foundation

struct User: Codable, Equatable {
	let id: String
	let name: String
	let email: String
	let image: String?
	let createdAt: String?
}

struct Session: Codable {
	let session: SessionData
	let user: User
}

struct SessionData: Codable {
	let id: String
	let token: String
	let expiresAt: String
}
