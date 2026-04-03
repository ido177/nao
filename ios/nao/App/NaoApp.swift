import SwiftUI

@main
struct NaoApp: App {
	@StateObject private var authViewModel = AuthViewModel()

	var body: some Scene {
		WindowGroup {
			RootView()
				.environmentObject(authViewModel)
		}
	}
}
