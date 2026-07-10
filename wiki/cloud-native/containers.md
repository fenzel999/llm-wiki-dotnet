---
title: 容器化（Docker / 内置容器发布）
summary: 用多阶段 Dockerfile 或 dotnet publish 内置容器支持产出精简镜像，非 root 运行。
tags: [docker, container, publish, chiseled, 部署]
introduced-in: general
applies-to: [net8, net9, net10]
status: stable
source: https://learn.microsoft.com/dotnet/core/docker/build-container
updated: 2026-07-10
---

> **要点速览**
> - 两条路：写 Dockerfile（最通用）或 `dotnet publish /t:PublishContainer`（net7+，免 Dockerfile）。
> - 用**多阶段构建**：SDK 编译、精简 runtime 镜像只放产物。
> - 用 **chiseled** 镜像（无 shell）+ 非 root（`USER $APP_UID`）。
> - 别单阶段打包 SDK、别 root 运行、别把密钥烤进镜像。

## 概述

容器把应用和它的运行环境打包成一个可移植镜像，"我机器上能跑"从此不再是问题。.NET 对容器化有两条路：写 **Dockerfile**（最通用、最可控），或用 **`dotnet publish` 内置的容器发布**（net7+，无需 Dockerfile 也能直接产出 OCI 镜像）。

产镜像的两条铁律：**用多阶段构建**（build 阶段用 SDK 镜像编译、运行阶段只拷贝产物到精简的 runtime 镜像，别把整个 SDK 塞进最终镜像）；**用非 root 用户运行**并选精简基础镜像。微软官方提供 `mcr.microsoft.com/dotnet/*` 镜像，其中 **chiseled**（凿削）镜像去掉了 shell 和包管理器，体积更小、攻击面更少，是生产首选。

## 正确做法

多阶段 Dockerfile：SDK 构建 + chiseled 运行 + 非 root：

```dockerfile
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled   # 精简、无 shell
WORKDIR /app
COPY --from=build /app .
USER $APP_UID                                              # 非 root 运行
ENTRYPOINT ["dotnet", "MyApp.dll"]
```

不想写 Dockerfile 时，用内置容器发布一步产出镜像：

```bash
dotnet publish -c Release /t:PublishContainer
```

## 常见误区

❌ 用单阶段构建、把 SDK 和源码全打进最终镜像，镜像几 GB 且暴露构建工具。用多阶段，只留运行时 + 产物。

❌ 以 root 用户跑容器，一旦被攻破权限过大。用 `USER $APP_UID` 非 root 运行。

❌ 基础镜像用完整发行版且从不更新，攻击面大。用 chiseled/alpine 精简镜像并定期重建拉取安全更新。

❌ 把密钥硬编码进镜像层。密钥通过环境变量/挂载在运行时注入，别烤进镜像。

## 适用版本

Dockerfile 全版本通用；`dotnet publish` 内置容器发布 net7+；chiseled 镜像 net8+。

## 参考资料

- [.NET Aspire](aspire.md)
- [原生 AOT（更小镜像）](../dotnet/aot/native-aot.md)
- 官方文档：[将 .NET 应用容器化](https://learn.microsoft.com/dotnet/core/docker/build-container)
- 官方文档：[dotnet publish 容器化](https://learn.microsoft.com/dotnet/core/containers/publish-configuration)
