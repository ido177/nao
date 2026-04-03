import Foundation

final class TRPCClient {
	private let api: APIClient

	init(api: APIClient = .shared) {
		self.api = api
	}

	func query<T: Decodable>(_ procedure: String, input: (any Encodable)? = nil) async throws -> T {
		let path = "/api/trpc/\(procedure)"
		var inputJSON: String

		if let input = input {
			let inputData = try JSONEncoder().encode(input)
			if let raw = String(data: inputData, encoding: .utf8) {
				inputJSON = "{\"0\":{\"json\":\(raw)}}"
			} else {
				inputJSON = "{\"0\":{\"json\":null}}"
			}
		} else {
			inputJSON = "{\"0\":{\"json\":null}}"
		}

		let queryItems = [
			URLQueryItem(name: "batch", value: "1"),
			URLQueryItem(name: "input", value: inputJSON),
		]

		let batchResponse: [TRPCBatchItem] = try await api.request(
			path: path,
			queryItems: queryItems
		)

		guard let first = batchResponse.first else {
			throw APIError.noData
		}

		let jsonData = try JSONSerialization.data(withJSONObject: first.result.data.json)
		let decoder = JSONDecoder()
		decoder.dateDecodingStrategy = .millisecondsSince1970
		return try decoder.decode(T.self, from: jsonData)
	}

	func mutation<T: Decodable>(_ procedure: String, input: some Encodable) async throws -> T {
		let path = "/api/trpc/\(procedure)"
		let body = SuperJSONBatchInput(input: input)

		let batchResponse: [TRPCBatchItem] = try await api.request(
			path: path,
			method: "POST",
			body: body,
			queryItems: [URLQueryItem(name: "batch", value: "1")]
		)

		guard let first = batchResponse.first else {
			throw APIError.noData
		}

		let jsonData = try JSONSerialization.data(withJSONObject: first.result.data.json)
		let decoder = JSONDecoder()
		decoder.dateDecodingStrategy = .millisecondsSince1970
		return try decoder.decode(T.self, from: jsonData)
	}

	func mutationVoid(_ procedure: String, input: some Encodable) async throws {
		let path = "/api/trpc/\(procedure)"
		let body = SuperJSONBatchInput(input: input)

		try await api.requestVoid(
			path: path,
			method: "POST",
			body: body,
			queryItems: [URLQueryItem(name: "batch", value: "1")]
		)
	}
}

private struct TRPCBatchItem: Decodable {
	let result: TRPCResultWrapper
}

private struct TRPCResultWrapper: Decodable {
	let data: SuperJSONData
}

private struct SuperJSONData: Decodable {
	let json: Any

	init(from decoder: Decoder) throws {
		let container = try decoder.container(keyedBy: DynamicCodingKey.self)
		if let jsonKey = DynamicCodingKey(stringValue: "json") {
			json = try container.decode(AnyCodableValue.self, forKey: jsonKey).value
		} else {
			json = [String: Any]()
		}
	}
}

private struct DynamicCodingKey: CodingKey {
	var stringValue: String
	var intValue: Int?

	init?(stringValue: String) { self.stringValue = stringValue }
	init?(intValue: Int) { self.intValue = intValue; self.stringValue = "\(intValue)" }
}

private struct AnyCodableValue: Decodable {
	let value: Any

	init(from decoder: Decoder) throws {
		let container = try decoder.singleValueContainer()
		if container.decodeNil() {
			value = NSNull()
		} else if let bool = try? container.decode(Bool.self) {
			value = bool
		} else if let int = try? container.decode(Int.self) {
			value = int
		} else if let double = try? container.decode(Double.self) {
			value = double
		} else if let string = try? container.decode(String.self) {
			value = string
		} else if let array = try? container.decode([AnyCodableValue].self) {
			value = array.map(\.value)
		} else if let dict = try? container.decode([String: AnyCodableValue].self) {
			value = dict.mapValues(\.value)
		} else {
			value = NSNull()
		}
	}
}

private struct SuperJSONBatchInput<T: Encodable>: Encodable {
	let input: T

	private enum CodingKeys: String, CodingKey {
		case zero = "0"
	}

	func encode(to encoder: Encoder) throws {
		var container = encoder.container(keyedBy: CodingKeys.self)
		let wrapper = SuperJSONWrapper(json: input)
		try container.encode(wrapper, forKey: .zero)
	}
}

private struct SuperJSONWrapper<T: Encodable>: Encodable {
	let json: T
}
