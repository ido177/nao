import Foundation

struct AgentRequest: Encodable {
	let message: AgentRequestMessage
	let chatId: String?
	let messageToEditId: String?
	let timezone: String?

	init(text: String, chatId: String? = nil, messageToEditId: String? = nil) {
		self.message = AgentRequestMessage(text: text)
		self.chatId = chatId
		self.messageToEditId = messageToEditId
		self.timezone = TimeZone.current.identifier
	}
}

struct AgentRequestMessage: Encodable {
	let text: String
}
