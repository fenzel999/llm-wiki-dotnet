// 阅读模式：护眼（暖色）/ 专注（隐藏侧栏）切换，选择记入 localStorage。
(function () {
  function makeButton(label, title) {
    var b = document.createElement("button");
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    return b;
  }

  var bar = document.createElement("div");
  bar.className = "mode-bar";

  var eye = makeButton("👁", "护眼模式（暖色纸张，减轻刺眼）");
  var focus = makeButton("📖", "专注阅读模式（隐藏侧栏与目录）");

  function sync() {
    eye.classList.toggle("active", document.documentElement.classList.contains("eye-care"));
    focus.classList.toggle("active", document.body.classList.contains("focus-mode"));
  }

  eye.addEventListener("click", function () {
    document.documentElement.classList.toggle("eye-care");
    try { localStorage.setItem("eye-care", document.documentElement.classList.contains("eye-care")); } catch (e) {}
    sync();
  });

  focus.addEventListener("click", function () {
    document.body.classList.toggle("focus-mode");
    try { localStorage.setItem("focus-mode", document.body.classList.contains("focus-mode")); } catch (e) {}
    sync();
  });

  bar.appendChild(eye);
  bar.appendChild(focus);
  document.body.appendChild(bar);

  // 恢复偏好；默认即开启护眼 + 专注（首次访问也直接生效）
  function getPref(key, def) {
    try {
      var v = localStorage.getItem(key);
      return v === null ? def : v === "true";
    } catch (e) { return def; }
  }
  if (getPref("eye-care", true)) document.documentElement.classList.add("eye-care");
  if (getPref("focus-mode", true)) document.body.classList.add("focus-mode");
  sync();

  // 快捷键：e 护眼，f 专注（输入框中不触发）
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.key === "e" || e.key === "E") eye.click();
    if (e.key === "f" || e.key === "F") focus.click();
  });
})();
