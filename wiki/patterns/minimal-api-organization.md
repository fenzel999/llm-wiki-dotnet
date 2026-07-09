---
title: 鏈€灏?API 缁勭粐妯″紡锛圡inimal API Organization锛?summary: 鐢?MapGroup 瀵规渶灏?API 杩涜鍒嗙粍涓庢ā鍧楀寲锛岀洿鎺ユ敞鍏?DbContext锛屼笉鐢?Controller銆?tags: [pattern, aspnet-core, minimal-api]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis
updated: 2026-07-09
---

## 鎰忓浘

鏈」鐩?**缁熶竴浣跨敤鏈€灏?API锛圡inimal API锛夌粍缁?HTTP 绔偣锛屼笉浣跨敤 Controller**銆傚€熷姪 `MapGroup`
鍋氳矾鐢卞垎缁勩€佺粺涓€鍓嶇紑涓庝腑闂翠欢锛堝閴存潈锛夛紝鎸変笟鍔℃ā鍧楁媶鍒嗗埌澶氫釜 `MapXXX` 鎵╁睍鏂规硶锛涙暟鎹闂?**鐩存帴娉ㄥ叆 `DbContext`**锛圗F Core 宸叉槸浠撳偍 + 宸ヤ綔鍗曞厓锛屼笉鍙﹀姞鎶借薄锛夛紝骞舵帴鍏?[鍘熺敓 OpenAPI 3.1](../dotnet/aspnet-core/aspnet-core-10.md#openapi-3-1)銆?
> 绾﹀畾锛?*涓嶈嚜宸遍€?`Result<T>` 绫诲瀷**銆傛渶灏?API 宸叉湁鍐呭缓鐨?**`Results<TResult1, ...>` /
> `TypedResults`** 浣滀负绫诲瀷鍖栬繑鍥炶仈鍚堬紝鎵挎媴銆屾垚鍔?澶辫触澶氱鍝嶅簲銆嶇殑琛ㄨ揪锛屾棤闇€閲嶅瀹炵幇涓€涓?> `Result<T>`銆?
## 姝ｇ‘鍋氭硶

鍦?`Program.cs` 涓敞鍐屾湇鍔′笌鏂囨。绔偣锛?*鏃?Swagger**锛夛細

```csharp
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(builder.Configuration.GetConnectionString("Db")));
builder.Services.AddOpenApi();   // .NET 10 鍘熺敓 OpenAPI 3.1锛屼笉浣跨敤 Swashbuckle

var app = builder.Build();
app.MapOpenApi();                // 鏆撮湶 /openapi/v1.json

app.MapOrderEndpoints();
app.MapHealthEndpoints();

app.Run();
```

鎶婄鐐归€昏緫鎶藉埌鐙珛妯″潡锛屼繚鎸?`Program` 绮剧畝锛涚洿鎺ユ秷璐?`AppDbContext`锛?
```csharp
public static class OrderEndpoints
{
    public static IEndpointRouteBuilder MapOrderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/orders")
                       .WithTags("Orders")
                       .WithOpenApi();   // 绾冲叆 OpenAPI 鏂囨。

        group.MapGet("/", async (AppDbContext db, CancellationToken ct) =>
            Results.Ok(await db.Orders.ToListAsync(ct)));

        group.MapPost("/", async (CreateOrderRequest req, AppDbContext db, CancellationToken ct) =>
        {
            if (string.IsNullOrWhiteSpace(req.CustomerId))
                return Results.BadRequest("瀹㈡埛鏍囪瘑涓嶈兘涓虹┖");

            var order = new Order(req.CustomerId, req.Items);
            db.Orders.Add(order);
            await db.SaveChangesAsync(ct);   // EF Core 鐨勫崟鍏?of-work锛氫竴娆℃彁浜?            return Results.Created($"/api/orders/{order.Id}", order);
        });

        return app;
    }
}
```

鑻ョ鐐归渶瑕?*澶氱鍙兘鐨勫搷搴旂被鍨?*锛岀敤鍐呭缓绫诲瀷鍖栬仈鍚堟槑纭０鏄庯紙杩欎篃鏄?OpenAPI 鐢熸垚澶氱姸鎬佺爜鐨勪緷鎹級锛?
```csharp
group.MapGet("/{id:guid}", async (Guid id, AppDbContext db, CancellationToken ct) =>
    await db.Orders.FindAsync(new object[] { id }, ct) is { } order
        ? Results.Ok(order)
        : Results.NotFound())
    .Produces<Order>(StatusCodes.Status200OK)
    .ProducesProblem(StatusCodes.Status404NotFound);
```

## 绫诲瀷鍖栬繑鍥烇細Results<T> / TypedResults

`Results<...>` 鏄?.NET 涓烘渶灏?API 鎻愪緵鐨?*鍐呭缓杩斿洖绫诲瀷鑱斿悎**锛岀瓑浠蜂簬銆屼竴涓鐐瑰彲鑳借繑鍥?Ok / NotFound /
BadRequest / Created 绛夊绉嶅甫绫诲瀷鐨勫搷搴斻€嶏細

```csharp
// 杩斿洖绫诲瀷鍐欐垚鑱斿悎锛岃皟鐢ㄦ柟涓?OpenAPI 閮借兘鐪嬪埌鎵€鏈夊彲鑳界粨鏋?static Results<Ok<Order>, NotFound, BadRequest<ProblemDetails>> Get(Guid id, AppDbContext db)
{
    var order = db.Orders.Find(id);
    return order is null
        ? TypedResults.NotFound()
        : TypedResults.Ok(order);
}
```

- 鐢?`Results.Ok/TypedResults.Ok`銆乣NotFound`銆乣BadRequest`銆乣Created` 绛夐潤鎬佸伐鍘傛瀯閫犲叿浣撳搷搴斻€?- 闇€瑕佹牎楠屽け璐ョ殑缁撴瀯鍖栭敊璇椂锛岃繑鍥?`BadRequest<ProblemDetails>`锛堜笌 .NET 10 鍐呯疆楠岃瘉鐨勯敊璇牸寮忎竴鑷达紝瑙?  [鏈€灏?API 楠岃瘉](../dotnet/aspnet-core/aspnet-core-10.md#minimal-api-validation)锛夈€?- **涓嶈**鍐嶅畾涔?`Result<T>`/`Either<T>` 涔嬬被鐨勮嚜瀹氫箟鑱斿悎绫诲瀷鈥斺€斿畠涓?`Results<T>` 璇箟閲嶅銆佸緬澧炴蹇佃礋鎷呫€?
## 浣曟椂浣跨敤 / 浣曟椂涓嶇敤

- 浣跨敤锛氬井鏈嶅姟銆佽交閲?API銆佸揩閫熷師鍨嬶紝绔偣鏁伴噺閫備腑銆?- 浣跨敤锛氶渶鎸夋ā鍧楀垎缁勩€佺粺涓€鍓嶇紑/閴存潈/鐗堟湰鏃讹紝`MapGroup` 鏈€鍚堥€傘€?- 浣跨敤锛氭暟鎹闂洿鎺ユ敞鍏?`AppDbContext`锛岀敱 EF Core 璐熻矗鎸佷箙鍖栦笌浜嬪姟銆?- 涓嶇敤锛?*涓嶈寮曞叆 Controller**鈥斺€旀湰椤圭洰绾﹀畾鍏ㄩ儴绔偣璧版渶灏?API銆?- 涓嶇敤锛氫笉瑕佸彟鍐欎粨鍌紙Repository锛?宸ヤ綔鍗曞厓锛圲nit of Work锛夊寘瑁?`DbContext`锛岄偅鏄噸澶嶆娊璞°€?- 涓嶇敤锛氫笉瑕佽嚜閫?`Result<T>` 绫诲瀷鈥斺€旂敤 `Results<T>`/`TypedResults` 琛ㄨ揪澶氬搷搴斻€?- 涓嶇敤锛氫笉瑕佸湪涓€涓法鏂囦欢閲屽爢鎵€鏈夌鐐癸紝鎸夋ā鍧楁媶鍒嗘墿灞曟柟娉曘€?
## 鍙傝€冭祫鏂?
- [OpenAPI 3.1锛坅spnet-core锛塢(../dotnet/aspnet-core/aspnet-core-10.md#openapi-3-1)
- [EF Core 鏁版嵁璁块棶锛堜笉鐢ㄤ粨鍌?宸ヤ綔鍗曞厓锛塢(../dotnet/ef-core/ef-data-access.md)
- [鏈€灏?API 楠岃瘉](../dotnet/aspnet-core/aspnet-core-10.md#minimal-api-validation)
- [渚濊禆娉ㄥ叆](../concepts/dependency-injection.md)

