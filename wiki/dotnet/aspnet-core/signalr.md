---
title: 实时通信（SignalR）
summary: 用内置 SignalR 实现服务器主动推送，Hub 抽象自动协商 WebSocket 等传输，强类型 Hub 更安全。
tags: [signalr, realtime, websocket, hub]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/aspnet-core/signalr/introduction
updated: 2026-07-10
---

> **要点速览**
> - 服务器主动推送（聊天/通知/实时看板）用内置 SignalR，Hub 自动协商 WebSocket 等传输。
> - 用**强类型 Hub**（`Hub<T>` + 接口），编译期检查，别用字符串方法名。
> - 目标选择是核心：`Clients.All / Caller / Others / Client(id) / Users / Group(name)`。
> - 分组用 `Groups.AddToGroupAsync` / `RemoveFromGroupAsync` + `Clients.Group(name)`；多实例配 **Redis backplane**（微软官方包 `Microsoft.AspNetCore.SignalR.StackExchangeRedis`）。
> - Hub 也要 `[Authorize]` 保护；`MapHub` 放在 `UseRouting`/认证之后、`UseEndpoints` 之前（Minimal API 直接 `app.MapHub`）。
> - AOT：SignalR 为 **🟡 部分**支持，保持 Hub 逻辑最小、发布后逐端测试（见 `### Native AOT 兼容性`）。

## 概述

普通 HTTP 是"客户端问、服务器答"，服务器没法主动找客户端。聊天、通知、实时仪表盘、协作编辑这类场景需要**服务器主动推送**，这正是 **SignalR**（微软内置，`Microsoft.AspNetCore.SignalR`）要解决的。它把底层传输（WebSocket、Server-Sent Events、长轮询）抽象成一个 **Hub**——你只管在 Hub 上定义方法、调用客户端方法，SignalR 负责协商出当前环境能用的最佳传输、处理连接管理与分组广播。

推荐用**强类型 Hub**（`Hub<T>`）：把客户端能收到的方法定义成一个接口，服务器端调用时就有编译期检查和智能提示，而不是用容易写错的字符串方法名。多实例部署时，用 backplane（微软官方 `Microsoft.AspNetCore.SignalR.StackExchangeRedis` 包）在实例间同步消息，不绑定付费云服务（[P12](../../governance/policy.md)）。

### 何时用 SignalR vs 其他推送方式

| 需求 | 推荐方案 |
|------|----------|
| 服务器主动推给已连客户端（聊天/通知/看板） | ✅ SignalR |
| 单向服务端流（仅下载、可断点重连） | `Results.Stream` / `IAsyncEnumerable` 流式响应 |
| 客户端轮询低频数据 | 普通 `GET` + 输出缓存 |
| 浏览器原生推送（无需长连接） | WebSocket 直连（SignalR 底层即基于此） |

## 正确做法

### 强类型 Hub 与基础发送

用接口定义客户端方法，Hub 继承 `Hub<T>`，获得强类型推送：

```csharp
public interface IChatClient                       // 客户端能收到的方法
{
    Task ReceiveMessage(string user, string text);
}

public class ChatHub : Hub<IChatClient>
{
    public async Task Send(string user, string text)
        => await Clients.All.ReceiveMessage(user, text);   // 强类型，编译期检查

    public Task JoinGroup(string room) => Groups.AddToGroupAsync(Context.ConnectionId, room);
}

app.MapHub<ChatHub>("/chat");
```

### 目标选择：向谁发送

`Clients` 提供多个选择器，决定一条消息推送给哪部分连接：

| 选择器 | 含义 | 典型场景 |
|--------|------|----------|
| `Clients.All` | 所有已连接客户端 | 全局广播、公告 |
| `Clients.Caller` | 本次调用的发起者 | 回执/确认，`Send` 后返回给自己 |
| `Clients.Others` | 除发起者外的所有人 | 聊天室"某人已进入" |
| `Clients.Client(connId)` | 指定连接 ID 的单个客户端 | 点对点私信 |
| `Clients.Clients(IReadOnlyList<string>)` | 多个指定连接 | 批量指定 |
| `Clients.User(userId)` | 该用户的所有连接（依赖 `Context.User` 的 NameIdentifier） | 发给某登录用户 |
| `Clients.Group(name)` | 已加入该分组的所有连接 | 房间/频道广播 |
| `Clients.Groups(names)` | 多个分组 | 跨频道广播 |
| `Clients.AllExcept(connIds)` | 除某些连接外的所有人 | 排除自己与其他指定者 |
| `Clients.GroupExcept(name, connIds)` | 分组内除某些连接 | 群内排除某成员 |

向调用者回执、向其他人广播的组合示例：

```csharp
public class DrawHub : Hub<IDrawClient>
{
    public async Task Stroke(string color, int x, int y)
    {
        // 把笔画推给其他连接，自己已在本地画了（Others = 除自己外的全部连接）
        await Clients.Others.ReceiveStroke(color, x, y);
        // 仅向自己确认已收到
        await Clients.Caller.Ack();
    }
}
```

### 分组（Groups）操作

分组是 SignalR 服务端维护的"连接集合"，用于按房间/频道/租户隔离广播。成员关系由连接 ID 维护，**不持久**——连接断开后自动离开分组。

```csharp
public class RoomHub : Hub<IRoomClient>
{
    public Task Join(string room)
        => Groups.AddToGroupAsync(Context.ConnectionId, room);

    public Task Leave(string room)
        => Groups.RemoveFromGroupAsync(Context.ConnectionId, room);

    public async Task BroadcastInRoom(string room, string user, string text)
        // 只推给当前已加入 room 的连接
        => await Clients.Group(room).ReceiveMessage(user, text);
}
```

注意：`AddToGroupAsync` / `RemoveFromGroupAsync` 是异步的，必须 `await`。分组名区分大小写。多实例下分组状态由 backplane 在实例间同步（见下文）。

### 连接生命周期与自动重连

Hub 提供两个可重写的生命周期钩子：

```csharp
public class PresenceHub : Hub
{
    public override async Task OnConnectedAsync()
    {
        // 新连接建立（握手成功）后调用，可在此登记在线状态
        await Groups.AddToGroupAsync(Context.ConnectionId, "online");
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        // 连接关闭（正常或异常）后调用，exception 为 null 表示正常断开
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, "online");
        await base.OnDisconnectedAsync(exception);
    }
}
```

`Context` 在 Hub 方法内可访问的关键属性：

| 属性 | 说明 |
|------|------|
| `Context.ConnectionId` | 当前连接的唯一字符串 ID（可存入分组/外部映射） |
| `Context.User` | 当前 `ClaimsPrincipal`（需 `[Authorize]`），取 `UserIdentifier` 等声明 |
| `Context.UserIdentifier` | `[Authorize]` 下用户的标识声明（配合 `Clients.User`） |
| `Context.Items` | 单次连接生命周期内的字典（非跨调用持久，应谨慎） |

客户端（.NET 客户端为例）自动重连配置：

```csharp
var connection = new HubConnectionBuilder()
    .WithUrl("https://host/chat")
    .WithAutomaticReconnect()              // 默认：0,2,10,30 秒四次重试后放弃
    // .WithAutomaticReconnect(new[] { TimeSpan.Zero, TimeSpan.FromSeconds(2), TimeSpan.FromSeconds(10) })
    .Build();

connection.Closed += async (error) =>
{
    await Task.Delay(new Random().Next(0, 5) * 1000);
    await connection.StartAsync();          // 自定义无限重连循环
};

await connection.StartAsync();
await connection.InvokeAsync("Send", "alice", "hello");
```

`withAutomaticReconnect` 只自动重连"网络抖动"型断开；若服务器重启导致 Token 失效等，需在 `Closed` 里自行重建并重新登录。

### 向调用者 vs 其他人：一个完整聊天室

```csharp
public interface IChatClient
{
    Task Receive(string user, string text);   // 收到别人消息
    Task System(string text);                 // 系统提示（自己也看得见）
}

public class ChatHub : Hub<IChatClient>
{
    public async Task Send(string user, string text)
    {
        // 推给除自己以外的所有人
        await Clients.Others.Receive(user, text);
        // 同时给自己一条确认（含服务端时间戳等加工后内容）
        await Clients.Caller.System($"[{DateTime.UtcNow:HH:mm}] 你发送了：{text}");
    }

    // 点对点：把消息只发给目标用户（该用户的所有连接）
    public async Task Whisper(string toUserId, string text)
        => await Clients.User(toUserId).Receive("系统", $"私信：{text}");
}
```

### 多实例部署：Redis Backplane

单机内 SignalR 用进程内字典维护连接与分组。当站点横向扩展到多个实例时，实例 A 上的连接收不到实例 B 发出的消息。**Backplane（底板）** 在所有实例间中继消息，使 `Clients.All` / `Clients.Group` 等跨实例生效。

微软官方包 `Microsoft.AspNetCore.SignalR.StackExchangeRedis`（属 `Microsoft.*`，符合 [P10](../../governance/policy.md)，且可自托管、无云绑定，符合 [P12](../../governance/policy.md)）：

```csharp
builder.Services.AddSignalR()
    .AddStackExchangeRedis("localhost:6379,abortConnect=false");
// 注意：backplane 只负责消息中继，不影响 AOT（它运行在服务器、非反射热路径）；
// 但启用 AOT 时仍需遵守各自包的限制，见 AOT 小节。

app.MapHub<ChatHub>("/chat");
```

> Redis 仅作消息中继，**不**持久化消息历史；历史如需留存应另存数据库。Backplane 解决"实时可达性"，不解决"离线消息"。

### 在 Hub 上做认证与授权

Hub 是端点，同样受认证/授权管道约束。`[Authorize]` 可直接标注在 Hub 或单个方法上；授权失败会拒绝连接/调用。

```csharp
[Authorize]                                       // 整个 Hub 需登录
public class SecureHub : Hub<ISecureClient>
{
    [AllowAnonymous]                              // 单个方法放开
    public Task Ping() => Clients.Caller.Pong();

    [Authorize(Roles = "admin")]                 // 仅 admin 角色可调用
    public async Task Kick(string connId)
        => await Clients.Client(connId).ForceClose();
}
```

管道顺序（经典 `UseEndpoints` 写法）：认证/授权中间件须在 `MapHub` 之前生效；Minimal API 下 `app.MapHub` 直接注册到路由，确保 `UseAuthentication`/`UseAuthorization` 已 `Use`：

```csharp
var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();
app.MapHub<SecureHub>("/secure");   // MapHub 即注册端点
app.Run();
```

AOT 后端下认证推荐 JWT Bearer（支持 AOT），cookie/OIDC 不支持（见 [P16](../../governance/policy.md) 与 `### Native AOT 兼容性`）。

## 常见误区

❌ **用字符串方法名 `Clients.All.SendAsync("ReceiveMessage", ...)`**。方法名写错只能在运行时发现，且重构无提示。用强类型 `Hub<T>` + 接口，编译期即检查。

❌ **在 Hub 里保存每连接的可变状态字段**（如 `private Dictionary<string,int> _state`）。Hub 实例是**瞬时**的（每次调用可能新建），状态会丢。连接级映射请用分组、或外部缓存/字典以 `Context.ConnectionId` 为键。

❌ **多实例部署却不配 backplane**。消息只在发出实例所连的客户端间广播，其他实例的客户端收不到，表现为"部分人收不到消息"。多实例务必加 Redis backplane。

❌ **不做认证就开放 Hub**。任何人可连接并广播、冒充他人。Hub 同样要 `[Authorize]`（或至少对敏感方法加），并按角色/声明细粒度保护。

❌ **把分组当作持久订阅或权限机制**。`AddToGroupAsync` 的分组成员随连接断开自动清除；它不持久、也不替代授权。需要"断线后仍收到离线消息"应另存消息历史并上线时补发。

❌ **忘记 `await` `AddToGroupAsync` / `RemoveFromGroupAsync`**。这两个方法是异步的，不 `await` 可能导致消息在成员关系真正生效前发出，丢消息。始终 `await`。

❌ **依赖 `Context.Items` 跨方法调用保存业务状态**。`Context.Items` 在同一连接多次调用间的语义脆弱、且多实例下不共享；业务状态应放外部存储。

## 适用版本

SignalR 各受支持版本通用；强类型 Hub 长期可用。多实例 backplane（Redis）随 `Microsoft.AspNetCore.SignalR.StackExchangeRedis` 提供。

### Native AOT 兼容性

SignalR 在官方 Native AOT 兼容性矩阵中为 **🟡 部分（Partial）** 支持（见 [Native AOT 兼容性矩阵与规则](../aot/aot-compatibility.md)）。实践中：

- ✅ 静态可分析的 Hub 方法、强类型 `Hub<T>` 接口调用大多可 AOT 编译；但 SignalR 内部仍有少量运行期反射/动态协议协商，可能在发布时产生裁剪/AOT 警告。
- 🟡 建议：保持 Hub 逻辑**最小且确定**——避免运行期反射、动态 `Type` 派发、`dynamic`；客户端方法参数类型纳入 `System.Text.Json` **源生成上下文**（JSON 序列化在 AOT 下靠源生成，否则类型元数据被裁剪）。
- 🟡 AOT 发布后**必须逐个端点/场景实测**：典型故障是"启动正常、首个 SignalR 消息 500"，因为某消息参数类型未进入 JSON 源生成上下文。
- 认证：后端 AOT 场景下优先 **JWT Bearer**（✅ 支持 AOT），避免 cookie/OIDC（❌ 不支持）。
- 若某 Hub 功能在 AOT 下确无法消除警告/故障，记入 [操作日志](../../log.md)（操作日志）并先问你，不要静默织入。

## 参考资料

- [认证与授权](auth.md)
- [后台服务（推送源）](../fundamentals/background-services.md)
- [Native AOT 兼容性矩阵与规则](../aot/aot-compatibility.md)
- 官方文档：[ASP.NET Core SignalR 简介](https://learn.microsoft.com/aspnet/core/signalr/introduction)
- 官方文档：[强类型 Hub](https://learn.microsoft.com/aspnet/core/signalr/hubs#strongly-typed-hubs)
- 官方文档：[SignalR 横向扩展（Redis backplane）](https://learn.microsoft.com/aspnet/core/signalr/scale)
- 官方文档：[ASP.NET Core 对 Native AOT 的支持](https://learn.microsoft.com/aspnet/core/fundamentals/native-aot)
