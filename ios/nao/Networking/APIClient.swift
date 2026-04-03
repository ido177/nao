import Foundation

enum APIError: LocalizedError {
	case invalidURL
	case unauthorized
	case serverError(Int, String?)
	case networkError(Error)
	case decodingError(Error)
	case noData

	var errorDescription: String? {
		switch self {
		case .invalidURL:
			return "Invalid URL"
		case .unauthorized:
			return "Your session has expired. Please log in again."
		case .serverError(let code, let message):
			return message ?? "Server error (\(code))"
		case .networkError(let error):
			return error.localizedDescription
		case .decodingError(let error):
			return "Failed to parse response: \(error.localizedDescription)"
		case .noData:
			return "No data received"
		}
	}
}

@MainActor
final class APIClient: ObservableObject {
	static let shared = APIClient()

	var baseURL: String {
		get { UserDefaults.standard.string(forKey: "nao_server_url") ?? "http://localhost:5005" }
		set { UserDefaults.standard.set(newValue, forKey: "nao_server_url") }
	}

	private var session: URLSession

	init() {
		let config = URLSessionConfiguration.default
		config.httpCookieAcceptPolicy = .always
		config.httpShouldSetCookies = true
		config.httpCookieStorage = .shared
		self.session = URLSession(configuration: config)
	}

	func request<T: Decodable>(
		path: String,
		method: String = "GET",
		body: (any Encodable)? = nil,
		queryItems: [URLQueryItem]? = nil
	) async throws -> T {
		let request = try buildRequest(path: path, method: method, body: body, queryItems: queryItems)
		let (data, response) = try await performRequest(request)
		try validateResponse(response)
		return try decodeResponse(data)
	}

	func requestVoid(
		path: String,
		method: String = "GET",
		body: (any Encodable)? = nil,
		queryItems: [URLQueryItem]? = nil
	) async throws {
		let request = try buildRequest(path: path, method: method, body: body, queryItems: queryItems)
		let (_, response) = try await performRequest(request)
		try validateResponse(response)
	}

	func streamRequest(
		path: String,
		body: some Encodable
	) async throws -> (URLSession.AsyncBytes, URLResponse) {
		let request = try buildRequest(path: path, method: "POST", body: body)
		return try await session.bytes(for: request)
	}

	private func buildRequest(
		path: String,
		method: String,
		body: (any Encodable)?,
		queryItems: [URLQueryItem]? = nil
	) throws -> URLRequest {
		guard var components = URLComponents(string: baseURL + path) else {
			throw APIError.invalidURL
		}
		components.queryItems = queryItems

		guard let url = components.url else {
			throw APIError.invalidURL
		}

		var request = URLRequest(url: url)
		request.httpMethod = method
		request.setValue("application/json", forHTTPHeaderField: "Content-Type")

		if let body = body {
			request.httpBody = try JSONEncoder().encode(body)
		}

		return request
	}

	private func performRequest(_ request: URLRequest) async throws -> (Data, URLResponse) {
		do {
			return try await session.data(for: request)
		} catch {
			throw APIError.networkError(error)
		}
	}

	private func validateResponse(_ response: URLResponse) throws {
		guard let httpResponse = response as? HTTPURLResponse else { return }
		switch httpResponse.statusCode {
		case 200...299:
			return
		case 401:
			throw APIError.unauthorized
		default:
			throw APIError.serverError(httpResponse.statusCode, nil)
		}
	}

	private func decodeResponse<T: Decodable>(_ data: Data) throws -> T {
		do {
			let decoder = JSONDecoder()
			decoder.dateDecodingStrategy = .millisecondsSince1970
			return try decoder.decode(T.self, from: data)
		} catch {
			throw APIError.decodingError(error)
		}
	}
}
