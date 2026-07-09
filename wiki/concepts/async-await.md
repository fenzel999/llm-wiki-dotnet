---
title: 异步编程(async/await)
summary: 基于 Task 的异步模型与 await 状态机，理解 ConfigureAwait 与同步上下文避免死锁。
tags: [async, await, task, 异步]
introduced-in: general
applies-to: [all]
status: stable
source: sources/README.md
updated: 2026-07-09
---

## 概述

C# 以 `Task`/`Task<T>` 表示异步操作，编译器将 `async` 方法转换为状态机，在 `await` 处挂起并在完成后恢复。`SynchronizationContext` 决定是否把延续调度回原线程。`ConfigureAwait(false)` 表示无需回到原上下文，可避免 UI/ASP.NET 经典死锁。热路径零分配异步见 [ValueTask](../concepts/value-task.md)。

## 正确做法

```csharp
public async Task<string> FetchAsync(HttpClient client, string url)
{
    using var resp = await client.GetAsync(url).ConfigureAwait(false);
    return await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
}

// 并行组合
var (a, b) = (await GetA(), await GetB());
```

## 常见误区

- 用 `.Result` 或 `.Wait()` 阻塞异步代码，在单一上下文(UI/旧 ASP.NET)下死锁。
- 在库代码中保留 `ConfigureAwait(true)`，限制调用方并发。
- `async void` 仅用于事件处理，否则异常无法被捕获。
- 忘记 `await`，导致任务被丢弃(fire-and-forget)引发资源泄漏。

## 参考资料

- [ValueTask](../concepts/value-task.md)
- [Span 内存](../concepts/span-memory.md)
