/// 입력: QA 호스트의 검사 이벤트 / 출력: JSON 로그와 네이티브 WKWebView 스냅샷. 출시 앱에는 미포함.
final class QAProbe: NSObject, WKScriptMessageHandler {
 weak var webView: WKWebView?
 func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
  guard let text = message.body as? String else { return }
  FileHandle.standardOutput.write(Data(("QUAD_NATIVE_QA " + text + "\n").utf8))
  guard let data = text.data(using: .utf8), let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any], let name = obj["capture"] as? String, name.range(of: "^[a-z0-9-]+$", options: .regularExpression) != nil else { return }
  webView?.takeSnapshot(with: nil) { image, error in
   guard let png = image?.pngData(), let folder = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else { return }
   try? png.write(to: folder.appendingPathComponent(name + ".png"))
   self.webView?.evaluateJavaScript("window.QUAD_QA_CAPTURED=\"" + name + "\";")
  }
 }
}
