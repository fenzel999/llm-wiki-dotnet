---
title: 鏋舵瀯鍐崇瓥璁板綍 (ADR)
summary: ADR 妯℃澘銆佺紪鍐欒鑼冦€佸瓨鍌ㄤ綅缃€佸鎵规祦绋嬨€佸簾寮?鏇夸唬鏈哄埗锛涙瘡涓噸澶ф灦鏋勫喅绛栧繀椤荤暀鐥曘€?tags: [architecture, adr, decision-record, governance]
introduced-in: general
applies-to: [all]
status: stable
source: https://adr.github.io/
updated: 2026-07-11
---

# 鏋舵瀯鍐崇瓥璁板綍 (ADR)

> **瑕佺偣閫熻**
> - 姣忎釜**閲嶅ぇ鏋舵瀯鍐崇瓥**蹇呴』鍐?ADR锛氭妧鏈€夊瀷銆佹灦鏋勯鏍笺€佽法鍥㈤槦鎺ュ彛銆佹暟鎹ā鍨嬨€佸熀纭€璁炬柦閫夊瀷銆?> - 鏍煎紡锛歁arkdown + YAML Frontmatter锛涘瓨鏀?`architecture/adr/` 鐩綍锛涚紪鍙?`ADR-0001`銆乣ADR-0002`...
> - 鐘舵€侊細`Proposed` 鈫?`Accepted` / `Rejected` / `Superseded` 鈫?`Deprecated`
> - 瀹℃壒锛氭灦鏋勭粍 + 鐩稿叧 Tech Lead 绛惧瓧锛沗Superseded` 闇€閾炬帴鏂?ADR銆?
## 姒傝堪

**鏋舵瀯鍐崇瓥璁板綍** 鏄崟鑾封€滀负浣曞仛姝ゅ喅绛栥€佽€冭檻浜嗕粈涔堟浛浠ｆ柟妗堛€佸悗鏋滄槸浠€涔堚€濈殑杞婚噺绾ф枃妗ｃ€傚畠涓嶆槸璁捐鏂囨。锛岃€屾槸**鍐崇瓥鐣欑棔**锛屼究浜庯細

- 鏂版垚鍛樺揩閫熺悊瑙ｂ€滀负浠€涔堣繖涔堝仛鈥?- 閬垮厤閲嶅璁ㄨ宸插喅浜嬮」
- 鍥炴函鍐崇瓥涓婁笅鏂囷紝璇勪及鏄惁闇€瑕佹帹缈?
## ADR 缁撴瀯妯℃澘

```markdown
---
title: ADR-0001: 閲囩敤 Minimal API 浣滀负鍞竴 Web 妗嗘灦
status: Accepted
date: 2026-07-11
deciders: [鏋舵瀯缁? Web Tech Lead]
consulted: [Backend Lead, DevOps Lead]
tags: [web-framework, minimal-api, aot]
---

# 鑳屾櫙涓庨棶棰?
鎴戜滑闇€瑕佺粺涓€ Web 妗嗘灦锛屾敮鎸?Native AOT銆侀浂鍙嶅皠銆侀珮鎬ц兘銆佷綆鏍锋澘浠ｇ爜銆?鍊欓€夛細Minimal API銆丮VC銆乬RPC銆丟raphQL銆?
# 鍐崇瓥

閲囩敤 **Minimal API** 浣滀负鍞竴 Web 妗嗘灦锛涚鐢?MVC/Controller銆?
# 鏇夸唬鏂规

| 鏂规 | 浼樼偣 | 缂虹偣 | 鍐冲畾 |
|------|------|------|------|
| Minimal API | AOT 鍘熺敓銆侀浂鍙嶅皠銆佹€ц兘寮恒€佹牱鏉垮皯 | 鍥㈤槦闇€瀛︿範 | 鉁?鎺ュ彈 |
| MVC/Controller | 鎴愮啛銆佺敓鎬佷赴瀵?| 涓嶆敮鎸?AOT銆佸弽灏勯噸銆佹牱鏉垮 | 鉂?鎷掔粷 |
| gRPC | 鍐呴儴楂樻€ц兘 | 澶栭儴 API 闇€ Gateway銆佸涔犳洸绾?| 浠呭唴閮ㄦ湇鍔￠棿 |
| GraphQL | 鐏垫椿鏌ヨ | 澶嶆潅銆丯+1銆丄OT 闅?| 鉂?鎷掔粷 |

# 鍚庢灉

**姝ｉ潰**锛欰OT 鍏煎銆佸惎鍔ㄥ揩銆佷簩杩涘埗灏忋€佹€ц兘鍩虹嚎楂樸€?**璐熼潰**锛氬洟闃熼渶閫傚簲 Minimal API 鍐欐硶锛汷penAPI 鏂囨。闇€婧愮敓鎴愬櫒銆?**椋庨櫓**锛氭棫 MVC 浠ｇ爜杩佺Щ鎴愭湰锛涚紦瑙ｏ細鍒嗘ā鍧楁笎杩涜縼绉伙紝鏂版ā鍧楀己鍒?Minimal API銆?
# 鎵ц璁″垝

1. 鏂版ā鍧楀己鍒?Minimal API锛堜唬鐮佸鏌ュ己鍒讹級
2. 瀛橀噺 MVC 妯″潡鎸変紭鍏堢骇娓愯繘杩佺Щ锛圦3 瀹屾垚鏍稿績妯″潡锛?3. 鍩硅锛氬唴閮?Workshop 2 鍦猴紝鏂囨。钀藉簱

# 鐩稿叧 ADR

- ADR-0002: 閲囩敤 EF Core 缂栬瘧妯″瀷 + 棰勭紪璇戞煡璇?(AOT)
- ADR-0003: 缁熶竴 JWT Bearer 璁よ瘉锛岀鐢?Cookie/OIDC (AOT)
```

## ADR 鐢熷懡鍛ㄦ湡

```
Proposed 鈫?(璇勫) 鈫?Accepted / Rejected
Accepted 鈫?(鏃堕棿鎺ㄧЩ/鎶€鏈彉鏇? 鈫?Superseded (by ADR-xxxx)
Superseded 鈫?(褰诲簳搴熷純) 鈫?Deprecated
```

| 鐘舵€?| 鍚箟 | 鍚庣画鍔ㄤ綔 |
|------|------|----------|
| `Proposed` | 鑽夋锛屽緟璇勫 | 鍙戣捣璇勫浼氾紝鏀堕泦鍙嶉 |
| `Accepted` | 姝ｅ紡鐢熸晥 | 鎵ц璁″垝钀藉湴锛屼唬鐮佸鏌ュ己鍒?|
| `Rejected` | 涓嶉噰绾?| 璁板綍鍘熷洜锛屽綊妗?|
| `Superseded` | 琚柊 ADR 鏇夸唬 | 鏍囨敞 `Superseded by ADR-xxxx`锛屼繚鐣欏巻鍙?|
| `Deprecated` | 褰诲簳搴熷純 | 涓嶅啀鍙傝€冿紝浠呭彶鏂?|

## 瀛樺偍涓庡懡鍚?
```
wiki/architecture/adr/
鈹溾攢鈹€ ADR-0001-minimal-api-framework.md
鈹溾攢鈹€ ADR-0002-ef-core-aot-compiled-model.md
鈹溾攢鈹€ ADR-0003-jwt-bearer-auth.md
鈹溾攢鈹€ ADR-0004-modular-monolith-vs-microservices.md
鈹斺攢鈹€ README.md  # 绱㈠紩琛?```

鍛藉悕锛歚ADR-<4浣嶇紪鍙?-<kebab-case涓婚>.md`

## 璇勫娴佺▼

1. **璧疯崏**锛氬彂璧蜂汉鍐欒崏妗堬紝鎻愪氦 PR 鍒?`architecture/adr/`
2. **璇勫**锛氭灦鏋勭粍 + 鐩稿叧 Tech Lead 瀹￠槄锛屾彁鍑洪棶棰?鏇夸唬鏂规
3. **鍐崇瓥**锛氳揪鎴愬叡璇?鈫?`Accepted`锛涘垎姝уぇ 鈫?寤舵湡鎴?`Rejected`
3. **鍚堝苟**锛氬悎骞?PR锛岀姸鎬佹敼 `Accepted`锛岀紪鍙峰浐鍖?4. **鍚屾**锛氭洿鏂?`architecture/adr/README.md` 绱㈠紩琛?
## 绱㈠紩琛ㄧず渚?
| 缂栧彿 | 鏍囬 | 鐘舵€?| 鏃ユ湡 | 鍐崇瓥鑰?| 鍏宠仈 |
|------|------|------|------|--------|------|
| ADR-0001 | 閲囩敤 Minimal API 鍞竴 Web 妗嗘灦 | Accepted | 2026-07-11 | 鏋舵瀯缁?| 鈥?|
| ADR-0002 | EF Core 缂栬瘧妯″瀷 + 棰勭紪璇戞煡璇?(AOT) | Accepted | 2026-07-11 | 鏁版嵁鏋舵瀯 | ADR-0001 |
| ADR-0003 | 缁熶竴 JWT Bearer锛岀鐢?Cookie/OIDC | Accepted | 2026-07-11 | 瀹夊叏缁?| ADR-0001 |
| ADR-0004 | 妯″潡鍖栧崟浣撲紭鍏堬紝寰湇鍔℃寜闇€鎷嗗垎 | Accepted | 2026-07-11 | 鏋舵瀯缁?| ADR-0001 |

## 涓庢不鐞嗚鍒欑殑鍏崇郴

| 鏀跨瓥 | ADR 瑕佹眰 |
|------|----------|
| **P10/P12** 鍘傚晢涓珛 | 閫夊瀷 ADR 蹇呴』鍒楀嚭鈥滄棤鍘傚晢閿佸畾鈥濅綔涓鸿瘎浼扮淮搴?|
| **P16** 鍚庣涓ユ牸 AOT | 娑夊強妗嗘灦/搴撻€夊瀷鐨?ADR 蹇呴』缁欏嚭 AOT 鍏煎鎬х粨璁?|
| **P17** 娣卞害瀹屾暣 | ADR 蹇呴』鍚€滄浛浠ｆ柟妗堝姣旇〃鈥濃€滃悗鏋滃垎鏋愨€濃€滄墽琛岃鍒掆€?|
| **閾佸緥 4/5/6** | 鏂?ADR 蹇呰繘 `index.md`銆乣鎬濈淮瀵煎浘.md`銆乣log.md` |

## 甯歌璇尯

鉂?**鎶婅璁℃枃妗ｅ綋 ADR** 鈥斺€?ADR 鍙鈥滃喅绛?鐞嗙敱鈥濓紝涓嶅啓璇︾粏璁捐锛堣璁℃枃妗ｅ彟瀛橈級  
鉂?**浜嬪悗琛?ADR** 鈥斺€?鍐崇瓥鍓嶅繀椤绘湁 ADR锛屼簨鍚庤ˉ璁板け鍘烩€滃喅绛栨椂涓婁笅鏂団€? 
鉂?**鏃犳浛浠ｆ柟妗堝姣?* 鈥斺€?蹇呴』鍒楀嚭鑷冲皯 2 涓閫夛紝鍚﹀垯涓嶆槸鍐崇瓥鏄粯璁? 
鉂?**涓嶅啓鍚庢灉/椋庨櫓** 鈥斺€?蹇呴』鍐欐闈?璐熼潰/椋庨櫓/缂撹В锛屽惁鍒欐棤娉曚簨鍚庡鐩? 

## 鍙傝€冭祫鏂?
- [ADR GitHub 缁勭粐](https://adr.github.io/) 鈥斺€?鏍囧噯鍖栧€¤
- [Michael Nygard: Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [鏋舵瀯娌荤悊 P10-P17](../governance/policy.md) 路 [鏋舵瀯鍒嗙被](enterprise-patterns.md) 路 [鏃ュ織](../log.md)
