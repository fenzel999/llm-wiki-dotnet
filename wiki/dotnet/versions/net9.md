---
title: .NET 9 / C# 13 鍏抽敭鐭ヨ瘑
summary: .NET 9锛圫TS锛変笌 C# 13 鐨勪富瑕佺壒鎬э紝浣滀负鏈簱澶氱増鏈煡璇嗙殑涓€閮ㄥ垎銆?tags: [dotnet, net9, csharp13]
introduced-in: net9
applies-to: [net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-9
updated: 2026-07-09
---

# .NET 9 / C# 13 鍏抽敭鐭ヨ瘑

.NET 9 浜?2024-11 鍙戝竷锛?*STS**锛屾敮鎸佸埌 2026-05锛夈€傚搴?**C# 13**銆傛湰椤垫眹鎬诲叾鍏抽敭鑳藉姏锛?涓?.NET 8 / .NET 10 鐨勫樊寮傝 [.NET 鐗堟湰婕旇繘](../../comparisons/net-evolution.md)銆?
## C# 13 璇█鐗规€?
- **params 闆嗗悎**锛歚params ReadOnlySpan<T>` / `params IEnumerable<T>`锛屽彲鎺ユ敹浠绘剰闆嗗悎/鏍堜笂 span锛岄浂鍒嗛厤鍙嬪ソ銆?- **鏂?`System.Threading.Lock`**锛歚Lock` 绫诲瀷鏇夸唬 `lock(obj)`锛屾€ц兘涓庡彲瑙傛祴鎬ф洿濂姐€?- **params 涓?ref 缁嗗寲**銆佽浆涔夊簭鍒椾笌閲嶈浇浼樺厛绾ф敼杩涖€?
```csharp
void Log(params ReadOnlySpan<string> parts)
{
    foreach (var p in parts) Console.Write(p);
}

Log("a", "b", "c");                 // 鏍堜笂锛屾棤闇€鏁扮粍鍒嗛厤
ReadOnlySpan<string> s = ["x", "y"];
Log(s);                            // 鐩存帴浼?Span
```

## ASP.NET Core 9

- **鍐呭缓 OpenAPI 鐢熸垚鍣?*锛歚Microsoft.AspNetCore.OpenApi` 鐨?`AddOpenApi()` 浠?.NET 9 璧峰彲鐢紝
   鐢熸垚 **OpenAPI 3.0**锛圼鍘熺敓 OpenAPI 3.1](../aspnet-core/aspnet-core-10.md#openapi-3-1) 鍦?.NET 10 鍗囩骇鍒?3.1锛夈€?- 闈欐€佽祫婧愮紦瀛樸€佽鏃跺櫒涓庡悇椤规€ц兘鏀硅繘锛涘師鐢?AOT 闄愬埗杈?net8 鍑忓皯銆?
## .NET 9 骞冲彴鑳藉姏

- **Microsoft.Extensions.AI**锛氱粺涓€鐨?AI/LLM 鎶借薄锛圛ChatClient銆両EmbeddingGenerator銆佸伐鍏疯皟鐢級锛?  渚夸簬鎺ュ叆澶氱妯″瀷锛涜繖鏄?.NET 9 鐨勬爣蹇楁€ц兘鍔涖€?- **HybridCache**锛氬垎甯冨紡 + 鍐呭瓨鍙屽眰缂撳瓨鎶借薄銆?- `Base64Url`銆乣OrderedDictionary<TKey,TValue>`銆乣TensorPrimitives` 绛夊熀纭€搴撳寮恒€?- EF Core 9銆丄OT/trimming 鎸佺画鏀硅繘銆?
## 閫傜敤鐗堟湰

=== "net9"
    涓婅堪 C# 13 / Microsoft.Extensions.AI / HybridCache 绛夊彲鐢ㄣ€?=== "net10"
    鍏ㄩ儴鍚戜笅鍏煎锛屽苟鍙犲姞 [.NET 10](../overview.md) 鏂扮壒鎬э紙濡?`field` 鍏抽敭瀛椼€佸唴寤洪獙璇併€丱penAPI 3.1锛夈€?
