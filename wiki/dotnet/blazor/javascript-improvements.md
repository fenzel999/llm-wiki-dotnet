---
title: Blazor JavaScript 互操作增强
summary: .NET 10 Blazor 增强 JS 互操作：更简洁的调用、更好的资源生命周期管理。
tags: [blazor, javascript, interop, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/release-notes/aspnetcore-10.0
updated: 2026-07-09
---

## 概述

.NET 10 增强了 Blazor 与 JavaScript 的互操作（JS interop）。改进包括更直接的 JS 模块调用、通过 `IJSObjectReference`（JS 对象引用）更好地管理 JS 对象生命周期，以及对导入/导出 JS 函数的更强类型支持，减少字符串式调用与手动清理带来的错误。

## 正确做法

以 JS 模块方式加载并调用，配合 `IAsyncDisposable` 正确释放：

```csharp
@implements IAsyncDisposable
@inject IJSRuntime JS

@code {
    private IJSObjectReference? _module;

    protected override async Task OnAfterRenderAsync(bool firstRender)
    {
        if (firstRender)
        {
            _module = await JS.InvokeAsync<IJSObjectReference>(
                "import", "./js/chart.js");
            await _module.InvokeVoidAsync("render", "#chart");
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_module is not null)
            await _module.DisposeAsync();
    }
}
```

.NET 10 新增的 JS 互操作 API：

- `IJSRuntime.InvokeConstructorAsync(...)` / `IJSObjectReference.InvokeConstructorAsync(...)`：通过 JS 构造函数创建对象实例，直接拿到 `IJSObjectReference` 句柄，免去 `eval` 与全局污染。

```csharp
// 旧：await JS.InvokeVoidAsync("eval", "window.chart = new Chart(canvas, cfg)");
// 新：
IJSObjectReference chart = await JS.InvokeConstructorAsync<IJSObjectReference>(
    "Chart", canvas, config);
```

- 直接读写 JS 对象的属性值（数据属性与访问器属性均可），无需为每次读取包一层 `InvokeAsync`。

```csharp
object? title = await chart.GetValueAsync("title");   // 读取属性
await chart.SetValueAsync("title", "新标题");          // 写入属性
```

## 常见错误

- 未释放 `IJSObjectReference` / 模块引用，造成 JS 侧内存泄漏。
- 在 `OnInitialized` 阶段调用 JS（此时 DOM 尚未就绪，尤其服务端预渲染）。
- 忽略预渲染（prerendering）阶段 `IJSRuntime` 不可用，需判断 `firstRender`。
- 在互操作调用间传递大对象未考虑序列化开销。

## 适用版本

=== "net10"
    JS 互操作调用与对象生命周期管理增强。

=== "net8"
    支持 `IJSObjectReference` 与模块导入，API 较基础。

## 参考资料

- [源汇总 sources/README.md](../../sources/README.md)
- 相关：[.NET 10 主题地图](../overview.md)
- 官方文档：[What's new in ASP.NET Core 10 (Blazor JS interop)](https://learn.microsoft.com/aspnet/core/release-notes/aspnetcore-10.0)

