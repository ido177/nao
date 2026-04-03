import Foundation

struct AnyCodable: Codable, Equatable {
	let value: Any?

	init(_ value: Any?) {
		self.value = value
	}

	init(from decoder: Decoder) throws {
		let container = try decoder.singleValueContainer()
		if container.decodeNil() {
			value = nil
		} else if let bool = try? container.decode(Bool.self) {
			value = bool
		} else if let int = try? container.decode(Int.self) {
			value = int
		} else if let double = try? container.decode(Double.self) {
			value = double
		} else if let string = try? container.decode(String.self) {
			value = string
		} else if let array = try? container.decode([AnyCodable].self) {
			value = array.map(\.value)
		} else if let dict = try? container.decode([String: AnyCodable].self) {
			value = dict.mapValues(\.value)
		} else {
			value = nil
		}
	}

	func encode(to encoder: Encoder) throws {
		var container = encoder.singleValueContainer()
		if value == nil {
			try container.encodeNil()
		} else if let bool = value as? Bool {
			try container.encode(bool)
		} else if let int = value as? Int {
			try container.encode(int)
		} else if let double = value as? Double {
			try container.encode(double)
		} else if let string = value as? String {
			try container.encode(string)
		} else {
			try container.encodeNil()
		}
	}

	static func == (lhs: AnyCodable, rhs: AnyCodable) -> Bool {
		switch (lhs.value, rhs.value) {
		case (nil, nil):
			return true
		case (let l as String, let r as String):
			return l == r
		case (let l as Int, let r as Int):
			return l == r
		case (let l as Double, let r as Double):
			return l == r
		case (let l as Bool, let r as Bool):
			return l == r
		default:
			return false
		}
	}
}
