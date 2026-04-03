import SwiftUI

struct RootView: View {
	@EnvironmentObject var authViewModel: AuthViewModel

	var body: some View {
		Group {
			switch authViewModel.state {
			case .loading:
				LaunchScreen()
			case .unauthenticated:
				AuthNavigationView()
			case .authenticated:
				ChatListView()
			}
		}
		.animation(.easeInOut(duration: 0.3), value: authViewModel.state)
	}
}
