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

写异步代码，本质上是在回答一个问题：当一段操作（网络请求、文件读写、延时等待）需要时间，程序凭什么不卡在那里干等？C# 给出的答案是 `Task` 与 `Task<T>`——它们代表“一个将来会完成的操作”。当你在一个方法上写下 `async`，编译器并不会真的让线程空转，而是悄悄把这个方法改写成一个状态机：遇到 `await` 时，方法在此挂起并把控制权交还调用方，等被等待的操作完成后再从挂起点继续（这一步叫“延续”，continuation）。

这里有个关键细节：延续默认会被调度回“原始的同步上下文”（`SynchronizationContext`）。在桌面 UI 或旧版 ASP.NET 这类“只有一个上下文线程”的环境里，这本来是为了方便你安全地更新界面；但也正是它，制造了 .NET 世界里最经典的死锁——当你在某个上下文线程上用 `.Result` 或 `.Wait()` 去等一个异步方法时，那个方法的延续却在等你腾出上下文。要打破这个循环，库代码（或任何不需要回到原上下文的场景）应当用 `ConfigureAwait(false)` 显式说“我不在乎回到哪个线程”。而当你追求热路径上的零分配异步时，还可以进一步去看 [ValueTask](modern-csharp.md#value-task) 的思路。

## 正确做法

把思路落到实处：在库代码、或不需要回到 UI 线程的调用链上，对每个 `await` 都加上 `ConfigureAwait(false)`，避免把延续强行塞回原始上下文，从而释放并发能力。下面这个例子在 `HttpClient` 的整条调用链上保持一致，同时展示了如何用并行 `await` 把两个互不依赖的任务组合起来一起等：

```csharp
public async Task<string> FetchAsync(HttpClient client, string url)
{
    using var resp = await client.GetAsync(url).ConfigureAwait(false);
    return await resp.Content.ReadAsStringAsync().ConfigureAwait(false);
}

// 并行组合：先发起，再一起等
var tA = GetA();               // 立即发起，不 await
var tB = GetB();               // 立即发起，不 await
var (a, b) = (await tA, await tB);
```

注意第二段的写法：想让两个异步操作**真正并发**，必须先各自发起任务（`GetA()` / `GetB()` 拿到 `Task`），再统一 `await`。常见的坑是写成 `var (a, b) = (await GetA(), await GetB());`——由于表达式从左到右求值，它会先完整 `await` 完 `GetA()` 再去调用 `GetB()`，实际上是**串行**执行，只是看起来像并行。需要等待一组任务时也可以用 `await Task.WhenAll(tA, tB)`。这是异步代码里最常被误写的地方。

## 常见误区

❌ 在单一同步上下文（UI / 旧版 ASP.NET）里，用 `.Result` 或 `.Wait()` 去阻塞一个异步调用，会让延续死等被占用的上下文，从而死锁：

```csharp
var html = FetchAsync(client, url).Result; // 可能死锁
```

除了死锁，还有几个常被忽略的坑：

- `async void` 只能用于事件处理程序。一旦用在普通方法上，方法里抛出的异常无法被 `catch`，也很难和别的操作组合。
- 忘了 `await` 时，任务会被悄悄“点火就忘”（fire-and-forget），常常引发资源泄漏和竞态，而且你连出错了都无从知晓。
- 在库代码里保留 `ConfigureAwait(true)`（即不带 `false`），会不必要地限制调用方的并发度——库通常没有“必须回原线程”的理由。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- [ValueTask 与零分配异步](modern-csharp.md#value-task)
- [Span 与 Memory 零拷贝](modern-csharp.md#span)
- 官方文档：[异步编程（C#）](https://learn.microsoft.com/dotnet/csharp/asynchronous-programming)
