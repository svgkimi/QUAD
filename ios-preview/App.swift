import UIKit
import WebKit

/// 입력: 번들 메인 프레임의 tap/drop 메시지. 출력: 짧은 네이티브 햅틱(실기기 전용).
final class GameHapticHandler: NSObject, WKScriptMessageHandler {
    private let tap = UIImpactFeedbackGenerator(style: .light)
    private let drop = UIImpactFeedbackGenerator(style: .medium)

    override init() {
        super.init()
        tap.prepare()
        drop.prepare()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "quadHaptic", message.frameInfo.isMainFrame,
              UIApplication.shared.applicationState == .active,
              let url = message.frameInfo.request.url, url.isFileURL,
              let root = Bundle.main.url(forResource: "Web", withExtension: nil),
              url.standardizedFileURL == root.appendingPathComponent("index.html").standardizedFileURL,
              let kind = message.body as? String, kind == "tap" || kind == "drop" else { return }
        let generator = kind == "drop" ? drop : tap
        generator.impactOccurred()
        generator.prepare()
    }
}

/// 입력: iOS 앱 생명주기 이벤트. 출력: 번들 내 QUAD를 실행하는 창.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.rootViewController = GameViewController()
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}

/// 입력: 앱에 포함된 Web/index.html. 출력: 네이티브 화면 안에서 실행되는 웹게임.
final class GameViewController: UIViewController {
    override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.03, green: 0.03, blue: 0.05, alpha: 1)
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        // 핸들러는 컨트롤러를 참조하지 않아 WebView와의 순환 참조가 없다.
        configuration.userContentController.add(GameHapticHandler(), name: "quadHaptic")
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.translatesAutoresizingMaskIntoConstraints = false
        webView.isOpaque = false
        webView.backgroundColor = view.backgroundColor
        webView.scrollView.backgroundColor = view.backgroundColor
        webView.scrollView.bounces = false
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.isInspectable = true
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor),
        ])
        guard let root = Bundle.main.url(forResource: "Web", withExtension: nil) else { return }
        webView.loadFileURL(root.appendingPathComponent("index.html"), allowingReadAccessTo: root)
    }
}
