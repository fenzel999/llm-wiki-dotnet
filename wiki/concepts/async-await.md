---
title: 异步编程（async/await）
summary: 基于 Task 的异步模型与 await 状态机，理解 ConfigureAwait 与同步上下文以避免死锁。
tags: [async, await, task, csharp]
introduced-in: csharp5
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/asynchronous-programming
updated: 2026-07-10
---

## 概述

C# 通过 `Task` 与 `Task<T>` 表示异步操作，编译器会把带有 `async` 修饰符的方法改写为一个状态机，在 `await` 处挂起、并在操作完成后续延续（continuation）。是否把延续调度回原始线程，由当前的 `SynchronizationContext` 决定；在 UI 或旧版 ASP.NET 这类“单一上下文”环境中，错误地阻塞异步调用正是经典死锁的根源。当你编写库代码或无需回到原上下文时，应使用 `ConfigureAwait(false)` 来摆脱上下文约束，提升并发能力；而在追求热路径零分配异步时，可进一步参考 [ValueTask](../concepts/value-task.md)。

## 正确做法

在库代码或不需要回到 UI 线程的场景中，对每个 `await` 调用 `ConfigureAwait(false)`，避免把延续强制调度回原始同步上下文。下面这个示例在 `HttpClient` 调用链上全程使用 `ConfigureAwait(false)`，并展示了如何用并行 `await` 组合两个独立任务：

```csharp
public async Task<string> FetchAsync(HttpClient client, string url)
{
    using var resp = await client.GetAsync(url).ConfigureAwait(false);
    return await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
}

// 并行组合
var (a, b) = (await GetA(), await GetB());
```

## 反例（常见错误）

❌ 在单一同步上下文（UI / 旧版 ASP.NET）中，用 `.Result` 或 `.Wait()` 阻塞异步调用，会导致延续等待被占用的上下文，从而引发死锁：

```csharp
❌ var html = FetchAsync(client, url).Result; // 可能死锁
```

- `async void` 仅应用于事件处理程序；用于普通方法时异常无法被捕获，且难以组合。
- 忘记 `await` 会让任务悄悄被丢弃（fire-and-forget），往往造成资源泄漏与竞态。
- 在库代码中保留 `ConfigureAwait(true)`，会不必要地限制调用方的并发度。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- [ValueTask](../concepts/value-task.md)
- [Span 内存](../concepts/span-memory.md)
- 官方文档：[异步编程（C#）](https://learn.microsoft.com/dotnet/csharp/asynchronous-programming)
