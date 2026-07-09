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

任何持有非托管资源（文件句柄、socket、数据库连接、通道等）的类型，都应当实现 `IDisposable`（同步）或 `IAsyncDisposable`（异步），以便在作用域结束时无论是否发生异常都能可靠释放，避免资源泄漏。当你封装了上述资源、或类型的成员本身是 `IDisposable`/`IAsyncDisposable` 时，就应当采用此模式；而不应在 `Dispose` 中执行业务逻辑，也不应让释放过程抛出新异常。

## 正确做法

对于持有非托管资源的同步类型，实现 `IDisposable` 并加上 `_disposed` 守卫，确保重复释放为 no-op。下面的示例封装了一个 `FileStream`，在释放时关闭底层流：

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

当清理过程涉及 I/O 或网络时，应当优先使用 `IAsyncDisposable` 与 `await using`，避免阻塞线程。下面的示例在异步路径上释放数据库连接：

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

`using` 声明（不带花括号）会在方法返回时自动释放；`await using` 配合 [异步（async-await）](../concepts/async-await.md) 确保异步清理在离开作用域前完成。例如在一个数据库事务中，这样写可以保证提交或异常后连接正确关闭：

```csharp
await using var tx = await _db.Database.BeginTransactionAsync(ct);
await _db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);
```

## 反例（常见错误）

❌ 在 `Dispose` 中抛出异常或执行重复释放时未做守卫，导致第二次释放崩溃：

```csharp
public void Dispose()
{
    _stream.Dispose(); // 没有 _disposed 守卫，重复 Dispose 可能抛异常
}
```

- 把业务逻辑写进 `Dispose`：释放方法只做清理，不应包含提交、通知等副作用。
- 手动管理已注入的 `DbContext`：它本身就是 `IDisposable`，由 DI 容器按作用域自动释放，无需手动 `using`（见 [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)）。
- 在 async 路径上误用同步 `using` 释放本应异步清理的资源，造成线程阻塞或句柄未及时回收。

## 适用版本

所有受支持版本通用，无差异。

## 参考资料

- 相关：[异步（async-await）](../concepts/async-await.md)
- 相关：[依赖注入](../concepts/dependency-injection.md)
- 相关：[EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)
- 相关：[Generic Host](../patterns/generic-host.md)
- 官方文档：[using 语句（C#）](https://learn.microsoft.com/dotnet/csharp/language-reference/statements/using)
