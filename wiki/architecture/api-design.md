---
title: API 璁捐妯″紡
summary: RESTful 璁捐瑙勮寖銆佺増鏈帶鍒躲€侀敊璇鐞嗐€佸垎椤?绛涢€?鎺掑簭銆佸箓绛夋€с€佷箰瑙傚苟鍙戙€丠ATEOAS 鍙栬垗锛涗粎鐢?Minimal API + 鏍囧噯搴撱€?tags: [architecture, api-design, rest, http, versioning, pagination]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis
updated: 2026-07-11
---

# API 璁捐妯″紡

> **瑕佺偣閫熻**
> - 璧勬簮瀵煎悜 URL銆佹爣鍑?HTTP 璇箟銆丳roblemDetails 閿欒銆佸厜鏍?鍋忕Щ鍒嗛〉銆丒Tag/If-None-Match 缂撳瓨銆?> - 鐗堟湰璧?URL 鍓嶇紑 `/api/v1/`锛涚牬鍧忔€у彉鏇存柊鐗堟湰锛屽閲忓瓧娈典笉鐮村潖銆?> - 骞傜瓑閿?`Idempotency-Key` 淇濇姢闈炲箓绛夊啓鍏ワ紱`ETag/If-Match` 涔愯骞跺彂銆?> - 浠呯敤 Minimal API + 鏍囧噯搴擄紱涓嶅紩鍏?Swashbuckle/FluentValidation/绗笁鏂?SDK銆?
## 姒傝堪

API 鏄郴缁熷澶栫殑濂戠害锛?*绋冲畾銆佸彲婕旇繘銆佸彲瑙傛祴** 鏄牳蹇冪洰鏍囥€傛湰椤电粰鍑哄湪 .NET Minimal API + 鏍囧噯搴撲笅鐨勮惤鍦拌鑼冿紝涓嶄緷璧栫涓夋柟妗嗘灦銆?
## 璧勬簮涓?URL 璁捐

| 瑙勮寖 | 绀轰緥 | 璇存槑 |
|------|------|------|
| 鍚嶈瘝澶嶆暟銆佸皬鍐欍€佺煭妯嚎 | `/api/v1/users/{id}/orders` | 璧勬簮闆嗗悎鐢ㄥ鏁?|
| 灞傜骇涓嶈秴杩?3 绾?| `/users/{id}/orders/{id}/items` | 杩囨繁鏀圭敤鏌ヨ鍙傛暟鎴栨墎骞冲寲 |
| 鍔ㄤ綔鐢?HTTP 鏂规硶 | `POST /orders`銆乣GET /orders/{id}` | 涓嶅湪 URL 鏀惧姩璇?|
| 鐗堟湰鍦?URL 鍓嶇紑 | `/api/v1/`銆乣/api/v2/` | 鐮村潖鎬у彉鏇存柊鐗堟湰锛孶RL 鏄惧紡 |

### 鐗堟湰鎺у埗绛栫暐

| 绛栫暐 | 閫傜敤鍦烘櫙 | 瀹炵幇 |
|------|----------|------|
| URL 鍓嶇紑 | 鍏紑 API銆佺牬鍧忔€у彉鏇村 | `/api/v1/`銆乣/api/v2/`锛堥粯璁ゆ帹鑽愶級 |
| Header `Api-Version` | 鍐呴儴 API銆佺増鏈皯 | `Api-Version` Header + `MapGroup` |
| 鏌ヨ鍙傛暟 `?v=1` | 绠€鍗曞満鏅?| 涓嶆帹鑽愬叕寮€ API |

**Minimal API 瀹炵幇**锛?
```csharp
var v1 = app.MapGroup("/api/v1").WithTags("v1");
var v2 = app.MapGroup("/api/v2").WithTags("v2");

v1.MapGet("/users", GetUsersV1);
v2.MapGet("/users", GetUsersV2); // 鏂板瀛楁锛屼笉鐮村潖 v1
```

## HTTP 璇箟涓庣姸鎬佺爜

| 鍦烘櫙 | 鐘舵€佺爜 | 璇存槑 |
|------|--------|------|
| 鎴愬姛鑾峰彇 | `200 OK` | GET 鎴愬姛 |
| 鎴愬姛鍒涘缓 | `201 Created` | Location 鎸囧悜鏂拌祫婧?|
| 鎴愬姛鏃犲唴瀹?| `204 No Content` | DELETE/PATCH 鎴愬姛鏃犺繑鍥炰綋 |
| 瀹㈡埛绔敊璇?| `400 Bad Request` | 鍙傛暟鏍￠獙澶辫触銆佹牸寮忛敊璇?|
| 鏈巿鏉?| `401 Unauthorized` | 鏃?鏃犳晥 Token |
| 鏃犳潈闄?| `403 Forbidden` | 鏈?Token 浣嗘潈闄愪笉瓒?|
| 涓嶅瓨鍦?| `404 Not Found` | 璧勬簮涓嶅瓨鍦?|
| 鍐茬獊 | `409 Conflict` | 骞傜瓑閿啿绐併€佸苟鍙戝啿绐?|
| 楠岃瘉澶辫触 | `422 Unprocessable Entity` | 璇箟鏍￠獙澶辫触锛堝瓧娈电害鏉燂級 |
| 鏈嶅姟绔敊璇?| `500 Internal Server Error` | 鏈鏈熷紓甯革紙璁板綍鏃ュ織銆佽繑鍥炶拷韪?ID锛?|

**閿欒缁熶竴鏍煎紡锛圧FC 9457 ProblemDetails锛?*锛?
```json
{
  "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
  "title": "Validation Failed",
  "status": 422,
  "traceId": "0HMQU9V2K7G8V",
  "errors": {
    "email": ["鏍煎紡鏃犳晥"],
    "qty": ["蹇呴』澶т簬 0"]
  }
}
```

**Minimal API 缁熶竴寮傚父澶勭悊**锛堣 `exception-handling.md`锛夛細

```csharp
app.UseExceptionHandler(opt => opt.Run(async ctx =>
{
    var problem = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
    var pd = new ProblemDetails
    {
        Status = StatusCodes.Status500InternalServerError,
        Title = "Internal Error",
        TraceId = ctx.TraceIdentifier
    };
    ctx.Response.StatusCode = pd.Status.Value;
    await ctx.Response.WriteAsJsonAsync(pd);
}));
```

## 鍒嗛〉銆佺瓫閫夈€佹帓搴?
### 鍋忕Щ鍒嗛〉锛堢畝鍗曞満鏅級

```
GET /api/v1/users?page=2&pageSize=20
```

鍝嶅簲锛?
```json
{
  "items": [...],
  "page": 2,
  "pageSize": 20,
  "totalCount": 1045
}
```

### 娓告爣鍒嗛〉锛堝ぇ鏁版嵁/楂樺苟鍙戯級

```
GET /api/v1/users?after=cursor_xyz&limit=20
```

鍝嶅簲锛?
```json
{
  "items": [...],
  "nextCursor": "cursor_abc",
  "hasMore": true
}
```

### 绛涢€変笌鎺掑簭

```
GET /api/v1/users?filter[name]=john&filter[status]=active&sort=-createdAt,email
```

- 绛涢€夛細`filter[瀛楁]=鍊糮锛屾敮鎸佸瀛楁 AND
- 鎺掑簭锛歚sort=瀛楁` 鍗囧簭锛宍sort=-瀛楁` 闄嶅簭锛岄€楀彿鍒嗛殧澶氬瓧娈?- **鐧藉悕鍗曟満鍒?*锛氫粎鍏佽棰勫畾涔夊瓧娈碉紙闃?SQL 娉ㄥ叆銆佹€ц兘澶辨帶锛?
## 骞傜瓑鎬т笌涔愯骞跺彂

### 骞傜瓑閿紙鍐欏叆鍘婚噸锛?
```http
POST /api/v1/orders
Idempotency-Key: a1b2-c3d4-e5f6
Content-Type: application/json

{ "userId": 1, "items": [...] }
```

- 鏈嶅姟绔褰?`Idempotency-Key` + 鍝嶅簲锛?4h 鍐呴噸澶嶉敭鐩存帴杩斿洖鍘熷搷搴?- 浠呯敤浜庨潪骞傜瓑鍐欏叆锛圥OST锛夛紱GET/PUT/DELETE 澶╃劧骞傜瓑鏃犻渶閿?
### 涔愯骞跺彂锛圗Tag / If-Match锛?
```http
GET /api/v1/users/123
ETag: "abc123"

PATCH /api/v1/users/123
If-Match: "abc123"
{ "email": "new@example.com" }
```

- 鍝嶅簲 `ETag`锛涘啓鍏ラ渶甯?`If-Match`锛岀増鏈笉鍖归厤杩斿洖 `412 Precondition Failed`
- 瀹炵幇锛氬疄浣撳惈 `RowVersion`/`xmin`/`ETag` 瀛楁锛孍F Core 涔愯骞跺彂鎷︽埅

## 缂撳瓨涓庢潯浠惰姹?
| 澶?| 鐢ㄩ€?| 绀轰緥 |
|----|------|------|
| `ETag` | 璧勬簮鐗堟湰鏍囪瘑 | `ETag: "v1-abc123"` |
| `If-None-Match` | 鏉′欢 GET | `If-None-Match: "v1-abc123"` 鈫?`304 Not Modified` |
| `If-Match` | 鏉′欢鍐欏叆 | `If-Match: "v1-abc123"` 鈫?`412` 鍐茬獊 |
| `Cache-Control` | 缂撳瓨绛栫暐 | `Cache-Control: public, max-age=60` |
| `Vary` | 鍙樹綋缂撳瓨 | `Vary: Accept-Encoding, Authorization` |

**Minimal API 瀹炵幇**锛?
```csharp
app.MapGet("/users/{id}", async (int id, AppDbContext db) =>
{
    var user = await db.Users.FindAsync(id);
    if (user is null) return Results.NotFound();
    var etag = $"\"{user.RowVersion}\"";
    return Results.Ok(user)
        .WithETag(etag)
        .WithHeader("Cache-Control", "public, max-age=60");
});
```

## HATEOAS锛堝彲閫夛級

浠呭綋瀹㈡埛绔渶**鑷彂鐜?*鑳藉姏鏃跺姞鍏ワ紙濡傞€氱敤瀹㈡埛绔€丼DK 鐢熸垚锛夈€傚鏁板唴閮?绉诲姩绔?API **涓嶉渶瑕?*銆?
```json
{
  "id": 1,
  "name": "John",
  "_links": {
    "self": { "href": "/api/v1/users/1" },
    "orders": { "href": "/api/v1/users/1/orders" }
  }
}
```

## 瀹夊叏涓庡悎瑙?
| 瑙勮寖 | 鍋氭硶 |
|------|------|
| HTTPS 寮哄埗 | 鍏ㄧ珯 HTTPS锛汬STS銆丆SP銆乆-Frame-Options |
| 璁よ瘉 | JWT Bearer锛圓OT 鍏煎锛夛紱Cookie/OIDC 浠呴潪 AOT 鍓嶇 |
| 鎺堟潈 | Policy-based锛坄RequireAuthorization("Admin")`锛?|
| 閫熺巼闄愬埗 | `MapGet(...).RequireRateLimiting("fixed")` |
| 杈撳叆楠岃瘉 | DataAnnotations + `IValidatableObject`锛沗FluentValidation` 涓嶇敤 |
| 鏁忔劅鏁版嵁 | 杩炴帴涓?瀵嗛挜璧伴厤缃郴缁?+ 瀵嗛挜搴擄紱涓嶈繘浠ｇ爜/鏃ュ織 |
| 瀹¤ | 鍐欏叆鎿嶄綔璁板綍 `UserId`銆乣TraceId`銆乣Before/After` 蹇収 |

## 瑙傛祴鎬у唴缃?
| 鑳藉姏 | 瀹炵幇 |
|------|------|
| 璇锋眰/鍝嶅簲鏃ュ織 | `UseHttpLogging()` + 缁撴瀯鍖栨棩蹇?|
| 鎸囨爣 | `dotnet-counters`銆乣prometheus-net`銆乣/metrics` |
| 鍒嗗竷寮忚拷韪?| `ActivitySource` + `OpenTelemetry` 鈫?Jaeger/Zipkin |
| 鍏宠仈 ID | `TraceId` 閫忎紶 Header `X-Correlation-ID`锛屾棩蹇?杩借釜/閿欒鑷姩鍏宠仈 |

## 鏂囨。涓庡绾︽祴璇?
| 宸ュ叿 | 鐢ㄩ€?|
|------|------|
| OpenAPI 闈欐€佺敓鎴?| `AddOpenApi()` + `MapOpenApi()` 鈫?`/openapi/v1.json` |
| 濂戠害娴嬭瘯 | `PactNet` (Provider 楠岃瘉) / `Refit` (Client 鐢熸垚) |
| 绀轰緥鐢熸垚 | `dotnet-openapi` 鐢熸垚 Client SDK锛圱S/C#/Python锛?|

## 甯歌璇尯

鉂?**URL 鏀惧姩璇?* `/api/v1/getUsers` 鈫?`/api/v1/users`  
鉂?**浠ヤ负 `EnableOpenApi` 灏辫兘鐢熸垚瀹屾暣鏂囨。** 鈥斺€?闇€鍦ㄧ鐐逛笂鏄惧紡 `.Produces()`銆乣.WithName()`銆乣.WithTags()` 绛夊厓鏁版嵁锛屽惁鍒欑敓鎴愭枃妗ｇ┖娉? 
鉂?**浠ヤ负 AOT 涓?`MapControllers()` 涔熻兘鐢ㄦ簮鐢熸垚** 鈥斺€?**MVC/Controller 瀹屽叏涓嶆敮鎸?AOT**锛屽繀椤荤敤 Minimal API  

## 鍙傝€冭祫鏂?
- [ASP.NET Core Native AOT 鏀寔](https://learn.microsoft.com/aspnet/core/fundamentals/native-aot)
- [Minimal API 姒傝堪](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis)
- [System.Text.Json 婧愮敓鎴怾(https://learn.microsoft.com/dotnet/standard/serialization/system-text-json/source-generation)
- [AOT 鍏煎鎬х煩闃礭(../dotnet/aot/aot-compatibility.md) 路 [鎸佷箙绾﹀畾 POLICY](../governance/policy.md) 路 [鏋舵瀯鍒嗙被](enterprise-patterns.md)
