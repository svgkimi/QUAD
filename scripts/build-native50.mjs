import {execFileSync} from "node:child_process";
import {mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync} from "node:fs";
import {join, resolve} from "node:path";
import {tmpdir} from "node:os";
const root=mkdtempSync(join(tmpdir(),"quad50-native-"));
// 입력: 선택적인 로컬 QA 경로와 --developer / 출력: 명시적으로 분리한 테스트 빌드.
const args = process.argv.slice(2);
const developer = args.includes("--developer");
const qaScriptPath = args.find(arg => arg !== "--developer") ?? (developer ? "qa/developer-access-2026-09-13/native-ui.js" : "scripts/native50-ui.js");
console.log("BUILD_ROOT="+root);
/** 입력: 기존 도구·인자 / 출력: 해당 명령의 실제 로그. 도구 설치는 하지 않는다. */
const run=(command,args)=>execFileSync(command,args,{stdio:"inherit"});
run(process.execPath,["node_modules/vite/bin/vite.js","build","--config",developer ? "vite.developer.config.ts" : "vite.standalone.config.ts","--outDir",join(root,"web")]);
for(const mode of ["normal","qa"]){
 const project=join(root,mode);
 mkdirSync(join(project,"QUADTest.xcodeproj"),{recursive:true});
 mkdirSync(join(project,"Web"),{recursive:true});
 for(const file of ["Info.plist","QUADTest.xcodeproj/project.pbxproj"])copyFileSync(resolve("ios-preview",file),join(project,file));
 const bundle = "dev.quad.preview.basic50" + (developer ? "dev" : "") + (mode === "qa" ? "qa" : "");
 if(developer) run("/usr/libexec/PlistBuddy",["-c",`Set :CFBundleDisplayName ${mode === "qa" ? "QUAD Dev QA" : "QUAD Dev"}`,join(project,"Info.plist")]);
 copyFileSync(join(root,"web/index.html"),join(project,"Web/index.html"));
 copyFileSync(resolve("public/icon.svg"),join(project,"Web/icon.svg"));
 let swift=readFileSync("ios-preview/App.swift","utf8");
 if(mode==="qa"){
  // QA 호스트에서만 자동 입력·화면 캡처를 주입한다. 사용자용 앱은 수동 플레이만 한다.
  swift=swift.replace("@main",readFileSync("scripts/native50-probe.swift","utf8")+"\n@main");
  const script=readFileSync(qaScriptPath,"utf8");
  swift=swift.replace('let webView = WKWebView(frame: .zero, configuration: configuration)',
   'let qa = QAProbe()\nconfiguration.userContentController.add(qa, name: "quadQA")\nlet qaScript = ##"""\n'+script+'\n"""##\nconfiguration.userContentController.addUserScript(WKUserScript(source: qaScript, injectionTime: .atDocumentEnd, forMainFrameOnly: true))\nlet webView = WKWebView(frame: .zero, configuration: configuration)\nqa.webView = webView');
  swift=swift.replace("NSLayoutConstraint.activate([",'let compact = ProcessInfo.processInfo.arguments.contains("--compact")\nNSLayoutConstraint.activate([');
  swift=swift.replace("webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)","compact ? webView.heightAnchor.constraint(equalToConstant: 568) : webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)");
  swift=swift.replace("webView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor)","compact ? webView.widthAnchor.constraint(equalToConstant: 320) : webView.trailingAnchor.constraint(equalTo: view.safeAreaLayoutGuide.trailingAnchor)");
 }
 writeFileSync(join(project,"App.swift"),swift);
 run("xcodebuild",["-project",join(project,"QUADTest.xcodeproj"),"-scheme","QUADTest","-sdk","iphonesimulator","-configuration","Debug","-derivedDataPath",join(root,mode==="qa"?"DerivedQA":"DerivedNormal"),"ARCHS=arm64","CODE_SIGNING_ALLOWED=NO","PRODUCT_BUNDLE_IDENTIFIER="+bundle,"COMPILER_INDEX_STORE_ENABLE=NO","CLANG_MODULE_CACHE_PATH="+join(root,"ModuleCache"),"build"]);
}
console.log("BUILT="+root);
