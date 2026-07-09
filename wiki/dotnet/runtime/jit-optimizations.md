---
title: .NET 10 JIT 鎬ц兘浼樺寲
summary: .NET 10 杩愯鏃剁殑 JIT 鏀硅繘锛氬姩鎬?PGO銆佸惊鐜笌鍐呰仈浼樺寲銆佹洿濂界殑鍘昏櫄鎷熷寲銆?tags: [dotnet, runtime, jit, performance, pgo, net10]
introduced-in: net10
applies-to: [net10]
status: stable
source: https://devblogs.microsoft.com/dotnet/announcing-dotnet-10/
updated: 2026-07-09
---

## 姒傝堪

.NET 10 鐨?JIT锛圝ust-In-Time锛屽嵆鏃剁紪璇戝櫒锛夋寔缁寮虹儹璺緞鎬ц兘銆傛牳蹇冨寘鎷姩鎬?PGO锛圥rofile-Guided Optimization锛屽熀浜庤繍琛屾椂鍓栨瀽鐨勪紭鍖栵紝榛樿鍚敤锛夈€佹洿寮虹殑鍐呰仈锛坕nlining锛変笌鍘昏櫄鎷熷寲锛坉evirtualization锛夈€佸惊鐜紭鍖栵紙濡傚惊鐜厠闅嗐€佽竟鐣屾鏌ユ秷闄わ級浠ュ強瀵?`Span<T>`/鏍堝垎閰嶇殑鏇村ソ澶勭悊銆傚鏁版敹鐩婃棤闇€鏀逛唬鐮佸嵆鍙幏寰椼€?
## 姝ｇ‘鍋氭硶

涓€鑸棤闇€鐗规畩閰嶇疆鍗充韩鍙椾紭鍖栵紱鍐欏嚭 JIT 鍙嬪ソ鐨勪唬鐮佸嵆鍙細

```csharp
static long SumEven(ReadOnlySpan<int> data)
{
    long sum = 0;
    for (int i = 0; i < data.Length; i++)   // 寰幆闀垮害鍙浼樺寲锛岃竟鐣屾鏌ユ秷闄?    {
        if ((data[i] & 1) == 0)
            sum += data[i];
    }
    return sum;
}
```

鑻ラ渶瀵规瘮鎴栦复鏃跺叧闂姩鎬?PGO 鍋氬熀鍑嗘祴璇曪細

```csharp
// 鐜鍙橀噺锛欴OTNET_TieredPGO=0 鍙叧闂姩鎬?PGO 浠ュ鐓?
// 榛樿鏃犻渶璁剧疆锛孭GO 宸查粯璁ゅ紑鍚?
```

## 姝ｇ‘鍋氭硶锛堣ˉ鍏咃級

- 鐢?BenchmarkDotNet 搴﹂噺鑰岄潪鐩祴锛屾敞鎰?JIT 棰勭儹锛坱iered compilation锛屽垎灞傜紪璇戯級銆?- 閬垮厤鍦ㄧ儹璺緞涓骇鐢熷ぇ閲忓皬瀵硅薄鍒嗛厤锛岄厤鍚?Span 鍑忓皯 GC 鍘嬪姏銆?
## 閫傜敤鐗堟湰

=== "net10"
    鍔ㄦ€?PGO 榛樿鍚敤锛屽惊鐜?鍐呰仈浼樺寲杩涗竴姝ュ寮恒€?
=== "net8"
    宸查粯璁ゅ惎鐢ㄥ姩鎬?PGO锛屼紭鍖栬寖鍥磋緝灏忋€?
## 鍙傝€冭祫鏂?
- [婧愭眹鎬?sources/README.md](../../sources/README.md)
- 鐩稿叧锛歔闅愬紡 Span 杞崲](../csharp/csharp-14.md#implicit-span-conversions)銆乕鍘熺敓 AOT](../native-aot.md)
- 瀹樻柟鏂囨。锛歔.NET runtime compilation config (PGO)](https://learn.microsoft.com/dotnet/core/runtime-config/compilation)


