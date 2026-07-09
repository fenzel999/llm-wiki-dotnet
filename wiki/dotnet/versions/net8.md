---
title: .NET 8 / C# 12 鍏抽敭鐭ヨ瘑
summary: .NET 8锛圠TS锛変笌 C# 12 鐨勪富瑕佺壒鎬э紝浣滀负鏈簱澶氱増鏈煡璇嗙殑涓€閮ㄥ垎銆?tags: [dotnet, net8, csharp12]
introduced-in: net8
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/whats-new/dotnet-8
updated: 2026-07-09
---

# .NET 8 / C# 12 鍏抽敭鐭ヨ瘑

.NET 8 浜?2023-11 鍙戝竷锛?*LTS锛屽埌 2026-11 姝?*锛夛紝瀵瑰簲 **C# 12**銆傛湰椤垫眹鎬?**v8 鐙湁鎴?LTS 鏍囧織鎬х壒鎬?*锛屽己璋冪ǔ瀹氬熀纭€锛涜鏌ラ槄 [.NET 鐗堟湰婕旇繘](../../comparisons/net-evolution.md) 浜嗚В net10 瀵瑰畠鐨勬墿灞曚笌鏇夸唬鍝併€?
## C# 12 璇█鐗规€?
- **闆嗗悎琛ㄨ揪寮?*锛歚List<int> a = [1, 2, 3]; var b = [.. a, 0];`锛屾敮鎸?immutable array銆丼pan 绛夛紝骞惰緟浠ヤ富鏋勯€犲嚱鏁般€?- **涓绘瀯閫犲嚱鏁?* (`class Point(int X, int Y);`) - 璇█绾ч粯璁ゅ€笺€?- **鍐呰仈鏁扮粍**锛歚[InlineArray(10)] struct Buf { private int _e; }` - 闆跺垎閰嶉珮鎬ц兘缂撳啿鍖恒€?- **鏂囦欢鏈湴绫诲瀷**锛歚file class Foo` - 浠呭綋鍓嶆枃浠跺彲瑙併€?- **ref 鏀硅繘**锛歚ref readonly` 鍙傛暟銆乣ref` 瀛楁缁嗗寲銆?
```csharp
public class Point(int X, int Y) { public int[] Coords => [X, Y]; }
```

## ASP.NET Core 8

- **鏃犲唴寤?OpenAPI 鐢熸垚鍣?*锛氶渶绗笁鏂瑰簱锛圫washbuckle锛夋墠鑳藉嚭 OpenAPI 鏂囨。銆?*鑷?.NET 9 璧锋彁渚涘師鐢?`AddOpenApi()`锛?NET 10 鍒欒繘涓€姝ュ崌绾т负 3.1銆?*鏈簱缁熶竴閲囩敤 .NET 10 鏂规锛屼笉鍐嶇敤 Swashbuckle锛堣 [鍘熺敓 OpenAPI 3.1](../aspnet-core/aspnet-core-10.md#openapi-3-1)锛夈€?- **鏃犲唴缃渶灏?API 楠岃瘉**銆傞渶绗笁鏂癸紙濡?FluentValidation锛夋垨鎵嬪啓杩囨护鍣ㄣ€?*鑷?.NET 10 璧锋彁渚涜嚜鍔ㄩ獙璇?*锛堣 [鏈€灏?API 楠岃瘉](../aspnet-core/aspnet-core-10.md#minimal-api-validation)锛夛紝鏈簱浠ヨ鏂规涓哄噯銆?
## EF Core 8

- **澶嶆潅绫诲瀷** 姝ｅ紡鏀寔锛堝€煎璞℃槧灏勪簬瀹夸富涓婚敭锛夛紝涓嶉渶 UoW/Repository 鍖呰銆?- **鍩哄厓闆嗗悎** 鏄犲皠锛坄List<int>` 绛夊瓨涓?JSON/鍘熺敓鍊肩被鍨嬶級銆?- **ExecuteUpdate / ExecuteDelete** 鎵归噺缂栬緫鍛戒护 - 鏃犻』鍏堟煡鍐嶆敼銆?
## 閫傜敤鐗堟湰

=== "net8"
    .NET 8 LTS 鐙湁鎴?LTS 鏍囧織鎬х壒鎬с€傜浉杈?LTS锛?NET 9 / .NET 10 涓嶄粎鍚戜笅鍏煎锛岃繕鍙犲姞鏇村鏂板姛鑳斤紙See [.NET 鐗堟湰婕旇繘](../../comparisons/net-evolution.md)锛夈€?=== "net9 / net10"
    鍏ㄩ儴鍚戜笅鍏煎锛涘苟鍙犲姞 [.NET 9](net9.md) / [.NET 10](../overview.md) 鏂扮壒鎬с€?
## 鍙傝€冭祫鏂?
- [.NET 鐗堟湰婕旇繘](../../comparisons/net-evolution.md) - 鏃堕棿绾夸笌鐗瑰緛鐭╅樀
- [Sources README](../../sources/README.md)

