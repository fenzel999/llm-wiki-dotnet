---
title: 实时通信（SignalR）
summary: 用内置 SignalR 实现服务器主动推送，Hub 抽象自动协商 WebSocket 等传输，强类型 Hub 更安全。
tags: [signalr, realtime, websocket, hub]
introduced-in: general
applies-to: [all]
status: stable
source: https://learn.microsoft.com/aspnet/core/signalr/introduction
updated: 2026-07-10
---

> **要点速览**
> - 服务器主动推送（聊天/通知/实时看板）用内置 SignalR，Hub 自动协商 WebSocket 等传输。
> - 用**强类型 Hub**（`Hub<T>` + 接口），编译期检查，别用字符串方法名。
> - Hub 实例瞬时，别存每连接状态；多实例部署配 backplane（可自托管开源）。
> - Hub 也要 `[Authorize]` 保护。

## 概述

普通 HTTP 是"客户端问、服务器答"，服务器没法主动找客户端。聊天、通知、实时仪表盘、协作编辑这类场景需要**服务器主动推送**，这正是 **SignalR**（微软内置，`Microsoft.AspNetCore.SignalR`）要解决的。它把底层传输（WebSocket、Server-Sent Events、长轮询）抽象成一个 **Hub**——你只管在 Hub 上定义方法、调用客户端方法，SignalR 负责协商出当前环境能用的最佳传输、处理连接管理与分组广播。

推荐用**强类型 Hub**（`Hub<T>`）：把客户端能收到的方法定义成一个接口，服务器端调用时就有编译期检查和智能提示，而不是用容易写错的字符串方法名。多实例部署时，用 backplane（可自托管的 Redis 等开源方案）在实例间同步消息，不绑定付费云服务（[P12](../../governance/policy.md)）。

## 正确做法

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

## 常见误区

❌ 用字符串方法名 `Clients.All.SendAsync("ReceiveMessage", ...)`，方法名写错运行时才发现。用强类型 `Hub<T>` + 接口。

❌ 在 Hub 里保存每连接的可变状态字段。Hub 实例是**瞬时**的（每次调用可能新建），状态会丢。用户/连接映射存到外部（分组、缓存）。

❌ 多实例部署却不配 backplane，消息只广播到本实例连的客户端，其余收不到。多实例用 backplane 同步。

❌ 不做认证就开放 Hub，任何人可连并广播。Hub 同样要 `[Authorize]` 保护。

## 适用版本

SignalR 各受支持版本通用；强类型 Hub 长期可用。

## 参考资料

- [认证与授权](auth.md)
- [后台服务（推送源）](../fundamentals/background-services.md)
- 官方文档：[ASP.NET Core SignalR 简介](https://learn.microsoft.com/aspnet/core/signalr/introduction)
- 官方文档：[强类型 Hub](https://learn.microsoft.com/aspnet/core/signalr/hubs#strongly-typed-hubs)
