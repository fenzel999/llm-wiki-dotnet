// 阅读模式控制：
//   主题：白天(暖色浅) / 黑夜(暖色深) —— 两者都是护眼暖色调，护眼为默认底色无需选择
//   专注：隐藏侧栏与目录，正文居中收窄（默认开启，可切换）
// 偏好记入 localStorage。
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

  var day = makeButton("☀️", "白天模式（护眼暖色·浅）");
  var night = makeButton("🌙", "黑夜模式（护眼暖色·深）");
  var focus = makeButton("📖", "专注阅读模式（隐藏侧栏与目录）");

  function applyTheme(t) {
    var scheme = t === "dark" ? "slate" : "default";
    document.body.setAttribute("data-md-color-scheme", scheme);
    document.documentElement.setAttribute("data-md-color-scheme", scheme);
  }

  function getTheme() {
    try { return localStorage.getItem("theme") || "day"; } catch (e) { return "day"; }
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
    day.classList.toggle("active", t === "day");
    night.classList.toggle("active", t === "dark");
    focus.classList.toggle("active", document.body.classList.contains("focus-mode"));
  }

  day.addEventListener("click", function () { setTheme("day"); });
  night.addEventListener("click", function () { setTheme("dark"); });
  focus.addEventListener("click", function () {
    document.body.classList.toggle("focus-mode");
    try { localStorage.setItem("focus-mode", document.body.classList.contains("focus-mode")); } catch (e) {}
    sync();
  });

  bar.appendChild(day);
  bar.appendChild(night);
  bar.appendChild(focus);
  document.body.appendChild(bar);

  // 默认：白天（护眼暖色浅） + 专注
  applyTheme(getTheme());
  if (getFocus()) document.body.classList.add("focus-mode");
  sync();

  // 快捷键：d 白天，n 黑夜，f 专注（输入框中不触发）
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var k = e.key.toLowerCase();
    if (k === "d") day.click();
    else if (k === "n") night.click();
    else if (k === "f") focus.click();
  });
})();
