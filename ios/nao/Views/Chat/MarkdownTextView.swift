import SwiftUI

struct MarkdownTextView: View {
	let text: String

	var body: some View {
		let cleaned = stripCitationTags(text)
		Text(markdownAttributed(cleaned))
			.font(.body)
			.foregroundColor(NaoTheme.Colors.foregroundFallback)
			.textSelection(.enabled)
	}

	private func stripCitationTags(_ text: String) -> String {
		let pattern = #"<citation-number[^>]*>[^<]*</citation-number>"#
		return text.replacingOccurrences(of: pattern, with: "", options: .regularExpression)
	}

	private func markdownAttributed(_ text: String) -> AttributedString {
		do {
			var attributed = try AttributedString(
				markdown: text,
				options: .init(interpretedSyntax: .inlineOnlyPreservingWhitespace)
			)
			attributed.font = .body
			return attributed
		} catch {
			return AttributedString(text)
		}
	}
}
