// 阅读模式控制：
//   主题：护眼(暖色,默认) / 白天(浅色) / 黑夜(深色)
//   专注：隐藏侧栏与目录，正文居中收窄（默认开启）
// 默认即「护眼 + 专注」，无需选择；偏好记入 localStorage。
(function () {
  var root = document.documentElement;

  function makeButton(label, title) {
    var b = document.createElement("button");
    b.textContent = label;
    b.title = title;
    b.setAttribute("aria-label", title);
    return b;
  }

  var bar = document.createElement("div");
  bar.className = "mode-bar";

  var eye = makeButton("🌿", "护眼模式（暖色纸张，默认）");
  var day = makeButton("☀️", "白天模式（浅色）");
  var night = makeButton("🌙", "黑夜模式（深色）");
  var focus = makeButton("📖", "专注阅读模式（隐藏侧栏与目录）");

  function applyTheme(t) {
    if (t === "eye-care") {
      root.setAttribute("data-md-color-scheme", "default");
      root.classList.add("eye-care");
    } else if (t === "light") {
      root.classList.remove("eye-care");
      root.setAttribute("data-md-color-scheme", "default");
    } else if (t === "dark") {
      root.classList.remove("eye-care");
      root.setAttribute("data-md-color-scheme", "slate");
    }
  }

  function getTheme() {
    try { return localStorage.getItem("theme") || "eye-care"; } catch (e) { return "eye-care"; }
  }
  function getFocus() {
    try { var v = localStorage.getItem("focus-mode"); return v === null ? true : v === "true"; }
    catch (e) { return true; }
  }

  function setTheme(t) {
    applyTheme(t);
    try { localStorage.setItem("theme", t); } catch (e) {}
    sync();
  }

  function sync() {
    var t = getTheme();
    eye.classList.toggle("active", t === "eye-care");
    day.classList.toggle("active", t === "light");
    night.classList.toggle("active", t === "dark");
    focus.classList.toggle("active", document.body.classList.contains("focus-mode"));
  }

  eye.addEventListener("click", function () { setTheme("eye-care"); });
  day.addEventListener("click", function () { setTheme("light"); });
  night.addEventListener("click", function () { setTheme("dark"); });
  focus.addEventListener("click", function () {
    document.body.classList.toggle("focus-mode");
    try { localStorage.setItem("focus-mode", document.body.classList.contains("focus-mode")); } catch (e) {}
    sync();
  });

  bar.appendChild(eye);
  bar.appendChild(day);
  bar.appendChild(night);
  bar.appendChild(focus);
  document.body.appendChild(bar);

  // 默认：护眼 + 专注
  applyTheme(getTheme());
  if (getFocus()) document.body.classList.add("focus-mode");
  sync();

  // 快捷键：e 护眼，d 白天，n 黑夜，f 专注（输入框中不触发）
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var k = e.key.toLowerCase();
    if (k === "e") eye.click();
    else if (k === "d") day.click();
    else if (k === "n") night.click();
    else if (k === "f") focus.click();
  });
})();
