---
title: 释放与 using 模式（IDisposable / IAsyncDisposable）
summary: 用 IDisposable/IAsyncDisposable 与 using 声明管理资源，防止句柄与连接泄漏。
tags: [pattern, resource-management, async]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/language-reference/statements/using
updated: 2026-07-10
---

## 概述

C# 里有一类类型，它们手里攥着的是「系统资源」而不是普通内存：文件句柄、socket、数据库连接、通道（channel）、互斥量……这些资源不由 GC 替你回收，必须显式交还操作系统，否则句柄会越积越多，直到连接池耗尽或进程被打爆。凡是持有这类非托管资源的类型，都应当实现 `IDisposable`（同步）或 `IAsyncDisposable`（异步），保证在作用域结束时、无论是否发生异常，都能可靠地把资源还回去。

这条规则还有两个常见的推论。其一，当你封装的资源本身就是 `IDisposable` / `IAsyncDisposable`（比如你在类里持有了一个 `FileStream`），那么你的类通常也得实现同样的接口，把释放「透传」下去。其二，`Dispose` 只该做一件事——清理资源，而不该夹带业务逻辑：不要在里面提交事务、发通知、写日志副作用，更不要让它抛出新异常（释放失败本就难处理，再抛异常只会把原来的错误掩盖掉）。

.NET 提供的 `using` 声明（不带花括号的那种）和 `await using` 就是为这件事服务的：它们把「作用域结束自动释放」写成语言层面的一等公民，你不必手动在 `finally` 里调用 `Dispose`，也不会因为中途 `return` 或抛异常而漏掉释放。

## 正确做法

先说同步场景。对于持有非托管资源的类型，实现 `IDisposable` 并加一个 `_disposed` 守卫，确保重复释放是安全的 no-op——因为调用方有时候会释放两次，而第二次绝不能崩。下面这个例子封装了一个 `FileStream`，在释放时关闭底层流：

```csharp
public sealed class TempFileWriter : IDisposable
{
    private readonly FileStream _stream;
    private bool _disposed;

    public TempFileWriter(string path) => _stream = File.OpenWrite(path);

    public void Write(ReadOnlySpan<byte> data) => _stream.Write(data);

    public void Dispose()
    {
        if (_disposed) return;
        _stream.Dispose();
        _disposed = true;
    }
}

// using 声明：作用域结束自动释放
using var writer = new TempFileWriter("out.bin");
writer.Write("hello"u8);
```

当清理过程本身涉及 I/O 或网络（比如关掉一条数据库连接、flush 一个网络流），就该优先用 `IAsyncDisposable` 配 `await using`，避免阻塞线程去等磁盘或网络。下面在异步路径上释放一个数据库连接持有者：

```csharp
public sealed class DbConnectionHolder : IAsyncDisposable
{
    private readonly SqlConnection _conn;
    public DbConnectionHolder(SqlConnection conn) => _conn = conn;

    public async ValueTask DisposeAsync()
    {
        if (_conn is not null)
            await _conn.DisposeAsync();
    }
}

await using var holder = new DbConnectionHolder(conn);
```

`using` 声明（不带花括号）会在方法返回时自动释放；`await using` 则配合[异步（async-await）](../concepts/async-await.md)，确保异步清理在离开作用域之前真的完成，而不是把未完成的释放甩在背后。一个很典型的落点是数据库事务：这样写可以保证无论提交成功还是中途异常，连接都正确关闭：

```csharp
await using var tx = await _db.Database.BeginTransactionAsync(ct);
await _db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);
```

这种「把资源交出去、作用域结束自动收回」的写法，也正好被[组合与架构模式](composition.md)里的[管道行为](composition.md#pipeline-behavior)和[泛型主机](composition.md#generic-host)用作事务、通道等资源的可靠清理手段。

## 反例（常见错误）

❌ 下面是最朴素的错误：在 `Dispose` 里直接释放，却没有 `_disposed` 守卫。一旦被释放两次，第二次就会抛异常，而释放路径上抛异常是最难处理的：

```csharp
public void Dispose()
{
    _stream.Dispose(); // 没有 _disposed 守卫，重复 Dispose 可能抛异常
}
```

还有几条经常被忽略的坑：

- **把业务逻辑写进 `Dispose`**：释放方法只做清理，不应包含提交、通知等副作用。
- **手动 `using` 已注入的 `DbContext`**：它本身就是 `IDisposable`，由 DI 容器按作用域自动释放，你再包一层 `using` 反而可能提前断开（见 [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)）。
- **在 async 路径上误用同步 `using` 释放本应异步清理的资源**：会造成线程阻塞，或句柄迟迟不被回收。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- 相关：[异步（async-await）](../concepts/async-await.md)
- 相关：[依赖注入](../concepts/dependency-injection.md)
- 相关：[EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)
- 相关：[组合与架构模式（泛型主机 / 管道行为）](composition.md)
- 官方文档：[using 语句（C#）](https://learn.microsoft.com/dotnet/csharp/language-reference/statements/using)
