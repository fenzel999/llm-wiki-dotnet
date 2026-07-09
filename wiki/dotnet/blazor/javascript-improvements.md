---
title: Blazor JavaScript 互操作增强
summary: .NET 10 Blazor 增强 JS 互操作：更简洁的调用、更好的资源生命周期管理。
tags: [blazor, javascript, interop, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/release-notes/aspnetcore-10.0
updated: 2026-07-10
---

## 概述

Blazor 的魅力在于用 C# 写前端，但现实世界不会因为只有 Blazor 就停下——图表库、地图、各种现成的 JS 组件都还在 JavaScript 那一侧。所以 JS 互操作（JS interop）几乎每个正经 Blazor 项目都绕不开。问题在于，旧的做法有不少“手感不好”的地方：想创建一个 JS 对象实例，往往得 `InvokeVoidAsync("eval", "window.x = new X(...)")`，既用字符串拼代码、又污染全局命名空间；想读个属性值，得包一层 `InvokeAsync`；更麻烦的是 `IJSObjectReference` 这种资源如果不手动释放，JS 那侧就会悄悄泄漏。

.NET 10 针对这些痛点做了增强：JS 模块的调用更直接，通过 `IJSObjectReference` 管理 JS 对象生命周期更顺手，对导入/导出 JS 函数的类型支持也更强。整体目标就是让 Blazor 调 JS 这件事更稳健、更不容易漏。这套能力和 .NET 10 的整体方向一致，可对照[.NET 10 主题地图](../overview.md)看。

## 正确做法

先从最基础的模块加载说起。以 JS 模块方式导入并调用，关键是配合 `IAsyncDisposable`，在组件销毁时把模块引用释放掉——这是避免泄漏的标配写法：

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

上面这段本身在 .NET 8 就可用。.NET 10 真正加分的是后面这些更自然的 API。比如创建 JS 对象实例，过去要靠 `eval` 往 `window` 上挂，现在有了 `InvokeConstructorAsync`，直接走构造函数、拿回一个 `IJSObjectReference` 句柄：

```csharp
// 旧：await JS.InvokeVoidAsync("eval", "window.chart = new Chart(canvas, cfg)");
// 新：
IJSObjectReference chart = await JS.InvokeConstructorAsync<IJSObjectReference>(
    "Chart", canvas, config);
```

读个属性、写个属性也终于不用每次都包一层 `InvokeAsync` 了，直接 `GetValueAsync` / `SetValueAsync` 搞定，数据属性和访问器属性都支持：

```csharp
object? title = await chart.GetValueAsync("title");   // 读取属性
await chart.SetValueAsync("title", "新标题");          // 写入属性
```

这几处改动单独看不大，但累积起来，Blazor 组件里和 JS 打交道的代码会干净很多，也不再需要那些 `eval` 魔法字符串。

## 反例（常见错误）

JS 互操作的坑大多集中在“时机”和“清理”上。第一，忘了释放 `IJSObjectReference` / 模块引用，JS 侧的对象就一直挂着，组件反复创建销毁几次，内存就慢慢漏了——所以务必实现 `IAsyncDisposable`。第二，在 `OnInitialized` 阶段就去调 JS：这一阶段 DOM 还没渲染好，尤其服务端预渲染（prerendering）时 `IJSRuntime` 根本不可用，必须挪到 `OnAfterRenderAsync` 里、并用 `firstRender` 判断只初始化一次。第三，别在互操作调用之间传递大对象而忽略序列化开销——跨边界传的可不是引用，是实打实序列化过去的数据，体积大了就是性能账单。

## 适用版本

=== "net10"
    JS 互操作调用与对象生命周期管理增强（构造函数创建、`GetValueAsync`/`SetValueAsync`）。

=== "net8"
    支持 `IJSObjectReference` 与模块导入，API 较基础，需更多手动处理。

## 参考资料

- 相关：[.NET 10 主题地图](../overview.md)
- 官方文档：[What's new in ASP.NET Core 10 (Blazor JS interop)](https://learn.microsoft.com/aspnet/core/release-notes/aspnetcore-10.0)
