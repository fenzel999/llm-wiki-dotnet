---
title: 释放与 using 模式（IDisposable / IAsyncDisposable）
summary: 用 IDisposable/IAsyncDisposable 与 using 声明管理资源，防止句柄与连接泄漏。
tags: [pattern, resource-management, async]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/dotnet/csharp/language-reference/statements/using
updated: 2026-07-09
---

## 意图

对持有非托管资源（文件、socket、数据库连接、通道）的类型实现 `IDisposable`（同步）或 `IAsyncDisposable`（异步），并通过 `using` 声明或声明式 `using var` 确保即使发生异常也能释放，避免资源泄漏（resource leak）。

## 正确做法

同步释放：

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

异步释放（涉及 IO / 网络时优先）：

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

`using` 声明（不带花括号）在方法返回时释放；`await using` 配合 [异步（async-await）](../concepts/async-await.md) 确保异步清理：

```csharp
await using var tx = await _db.Database.BeginTransactionAsync(ct);
await _db.SaveChangesAsync(ct);
await tx.CommitAsync(ct);
```

## 何时使用 / 何时不用

- 使用：任何封装了非托管资源或持有 `IDisposable`/`IAsyncDisposable` 成员的类型。
- 使用：async 路径上的资源清理用 `IAsyncDisposable` + `await using`。
- 不用：不要在 `Dispose` 中抛异常；已释放时应为 no-op（见上面的 `_disposed` 守卫）。
- 不用：不要把业务逻辑放进 `Dispose`；释放只做清理。
- 注意：直接注入 `DbContext`（`AppDbContext` 本身即 `IDisposable`）时，由 DI 容器按作用域自动释放，无需手动 `using`（见 [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)）。

## 参考资料

- [异步（async-await）](../concepts/async-await.md)
- [依赖注入](../concepts/dependency-injection.md)
- [EF Core 数据访问](../dotnet/ef-core/ef-data-access.md)
- [Generic Host](../patterns/generic-host.md)
