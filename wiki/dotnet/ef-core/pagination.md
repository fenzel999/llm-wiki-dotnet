---
title: 分页查询与动态排序
summary: 应用层用可复用的 PagedResult<T> + 多字段动态排序做偏移分页；排序列白名单，条件下推数据库。
tags: [ef-core, pagination, sorting, application-layer, linq]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/ef/core/performance/efficient-querying
updated: 2026-07-10
---

# 分页查询与动态排序

> **要点速览**
> - 分页是**应用层职责**：接收页码/页大小/排序字段，返回 `PagedResult<T>` 数据载体（不是 [Result 信封](../aspnet-core/exception-handling.md)）。
> - 用**偏移分页** `OrderBy(...).Skip(n).Take(m)`，分页**必须先排序**，否则结果顺序不确定。
> - 动态排序按"列名 → 表达式"构建 `OrderBy`，并用**白名单**限制可排序列，防注入与性能坑。
> - 把分页/排序做成 `IQueryable` 扩展放 `SharedKernel`（[跨模块共享工具](../../architecture/solution-structure.md)），各模块应用层复用。

## 概述

列表接口几乎都要分页：一次只取一页数据、告诉前端总条数、允许按某列排序。这件事有三个容易做错的地方：**在哪层做**（该在应用层，不该渗进领域层，也不该在 Web 端点里堆逻辑）、**怎么排序**（`Skip/Take` 前必须有确定的 `OrderBy`，否则数据库返回顺序不保证，翻页会重复或漏数据）、**动态排序怎么安全地做**（前端传列名时不能直接拼到查询里）。

我们把分页做成一个**可复用的工具**：定义 `PagedResult<T>` 承载"这一页 + 总数"，定义 `PageRequest` 承载分页参数，再写一个 `IQueryable` 扩展把二者串起来，条件全部**下推数据库**执行。这个工具是跨模块共享的基元，放在 `SharedKernel`（见[解决方案分层](../../architecture/solution-structure.md)），由各模块的**应用服务**调用。

> `PagedResult<T>` 是**数据模型**（items + 元数据），与被禁用的"统一返回信封"完全是两回事（[P15](../../governance/policy.md)）。API 仍返回真实 HTTP 状态码，body 里放这个分页对象。

## 正确做法

先定义放在 `SharedKernel` 的分页基元与可复用扩展（手写，零第三方依赖，[P10](../../governance/policy.md)）：

```csharp
// 分页请求参数：构造时就把非法值夹紧
public sealed record PageRequest
{
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 20;
    public string? SortBy { get; init; }
    public bool Descending { get; init; }

    public int SafePage => Page < 1 ? 1 : Page;
    public int SafeSize => Math.Clamp(PageSize, 1, 100);   // 上限防止一次拉全表
}

// 分页结果：纯数据载体
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int TotalCount, int Page, int PageSize)
{
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}
```

```csharp
// SharedKernel：排序字段白名单（派生自字典，提供 Map 自动取属性名）
public class DynamicOrderByAllowList<T> : Dictionary<string, Expression<Func<T, object>>>
{
    public DynamicOrderByAllowList<T> Map(string fieldName, Expression<Func<T, object>> expr)
    { this[fieldName] = expr; return this; }

    // 从表达式自动取成员名："date" ← o => o.CreatedAt
    public DynamicOrderByAllowList<T> Map(Expression<Func<T, object>> expr)
    {
        var body = expr.Body is UnaryExpression u ? u.Operand : expr.Body;
        if (body is MemberExpression m) this[m.Member.Name] = expr;
        return this;
    }
}

// SharedKernel：可复用的 IQueryable 扩展（net14 可用 extension 成员；低版本写成普通 static class）
public static class QueryableExpressions
{
    // 多字段动态排序（逗号分隔、支持 DESC），白名单过滤防注入
    public static IQueryable<T> WithDynamicOrderBy<T>(
        this IQueryable<T> source, string? sorting,
        IReadOnlyDictionary<string, Expression<Func<T, object>>> sortMap)
    {
        if (string.IsNullOrWhiteSpace(sorting)) return source;
        IOrderedQueryable<T>? ordered = null;
        foreach (var part in sorting.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries))
        {
            var span = part.AsSpan();
            var space = span.IndexOf(' ');
            var field = (space > 0 ? span[..space] : span).Trim().ToString();
            var isDesc = space > 0 && span[space..].TrimStart().Equals("DESC", StringComparison.OrdinalIgnoreCase);
            if (!sortMap.TryGetValue(field, out var expr)) continue;   // 不在白名单→跳过
            ordered = ordered is null
                ? (isDesc ? source.OrderByDescending(expr) : source.OrderBy(expr))
                : (isDesc ? ordered.ThenByDescending(expr)   : ordered.ThenBy(expr));
        }
        return ordered ?? source;
    }

    // 偏移分页，自动校正非法参数
    public static IQueryable<T> WithOffsetPaging<T>(this IQueryable<T> source, int skipCount, int maxResultCount)
    {
        skipCount = Math.Max(0, skipCount);
        maxResultCount = Math.Clamp(maxResultCount, 1, 1000);   // 上限防止一次拉全表
        return source.Skip(skipCount).Take(maxResultCount);
    }
}
```

应用服务组织查询：白名单可排序字段 → 多字段动态排序 → 偏移分页 → 投影成 DTO，全程 `IQueryable`：

```csharp
// Orders.Application —— 分页是应用层的活
internal sealed class OrderQueryService(OrdersDbContext db)
{
    // 显式声明"哪些列可排序"（前端只能在这里选），Map 自动取属性名
    private static readonly DynamicOrderByAllowList<Order> Sortable = new()
        .Map(o => o.CreatedAt)   // 键 "CreatedAt"
        .Map(o => o.Total);      // 键 "Total"

    public async Task<PagedResult<OrderDto>> ListAsync(ListRequest req, CancellationToken ct)
    {
        var query = db.Orders
            .Where(o => !o.IsDeleted)
            .WithDynamicOrderBy(req.Sorting, Sortable)        // "CreatedAt desc, Total"
            .WithOffsetPaging((req.Page - 1) * req.PageSize, req.PageSize);

        var total = await query.CountAsync(ct);
        var items = await query
            .Select(o => new OrderDto(o.Id, o.Total, o.CreatedAt))
            .ToListAsync(ct);                                  // 只取一页（下推 OFFSET/FETCH）
        return new(items, total, req.Page, req.PageSize);
    }
}
```

Minimal API 端点只做绑定与返回，成功就是 `200` + 分页体：

```csharp
app.MapGet("/orders", async ([AsParameters] PageRequest req, OrderQueryService svc, CancellationToken ct)
    => TypedResults.Ok(await svc.ListAsync(req, ct)));
```

## 常见误区

❌ **`Skip/Take` 前不排序**。数据库不保证返回顺序，翻页会出现重复或遗漏。分页前必须有确定且唯一的 `OrderBy`（必要时追加主键做 tie-breaker）。

❌ **把前端传来的列名直接拼进排序**（反射任意属性 / 拼 SQL 字符串）。既可能命中不可索引列拖垮性能，也是注入面。用**白名单字典**只放开允许排序的列。

❌ **先 `ToList()` 再在内存里 `Skip/Take`**。整表已被拉进进程，分页失去意义。保持 `IQueryable`，让 `OFFSET/FETCH` 在数据库执行。

❌ **不夹紧 `PageSize`**。前端传 `pageSize=100000` 就等于全表扫描。服务端 `Clamp` 上限。

❌ **把分页逻辑写进领域层或 Web 端点**。分页是查询/应用层关注点：领域层不该有 `Skip/Take`，端点只负责绑定参数和返回结果。

❌ **对超深翻页仍用偏移分页**（`Skip(1000000)`）。偏移越大数据库越慢；面向"无限滚动"的深翻页场景应改用**键集分页（keyset）**——用上一页最后一行的排序键作游标 `Where(o => o.CreatedAt < cursor)`，本库默认偏移分页够用，深翻页时再评估键集。

## 适用版本

`Skip/Take/OrderBy` 与 `IQueryable` 全版本通用；`[AsParameters]` 绑定 net7+ 最小 API。示例面向 EF Core（net8+）。

### Native AOT 兼容性

动态排序刻意用**编译期表达式白名单**（`Dictionary<string, Expression<Func<T,object>>>` + `WithDynamicOrderBy`），而非"按字符串反射属性名"，正是为了 AOT 友好：反射构建排序键在 Native AOT 下会被裁剪、失效，而白名单里的表达式是编译期已知的，安全。`DynamicOrderByAllowList.Map(expr)` 从表达式树取成员名（`MemberExpression`），**不反射**。注意 **EF Core 查询管道对 Native AOT 仅部分支持**，Native AOT 部署 EF Core 需启用编译模型/预编译查询；纯 `IQueryable`/`Skip/Take` 逻辑本身不含反射。

## 参考资料

- [解决方案分层（分页工具放 SharedKernel、应用层消费）](../../architecture/solution-structure.md) · [规约模式（可与分页组合）](../../architecture/specification-pattern.md)
- [EF Core 查询性能](query-performance.md) · [EF Core 数据访问](ef-data-access.md) · [LINQ 延迟执行](../csharp/linq.md)
- [全局异常处理（API 用真实状态码，非 Result 信封）](../aspnet-core/exception-handling.md)
- 官方文档：[EF Core 高效查询（分页）](https://learn.microsoft.com/ef/core/performance/efficient-querying#pagination)
