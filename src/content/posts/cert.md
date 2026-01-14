---
title: 使用github工作流更新证书
published: 2026-01-14
description: ''
image: ''
tags: []
category: ''
draft: false 
lang: ''
---
# cert-_update

自动化SSL证书更新和部署系统，用于管理 `example.com` 域名的通配符证书。

## 项目概述

这是一个使用 GitHub Actions 自动化的证书管理项目，通过以下方式实现：

- 📜 **自动申请证书** - 使用 acme.sh 和 LiteSSL ACME 服务自动申请 SSL 证书
- 🔐 **DNS 验证** - 使用阿里云 DNS 作为验证方式
- 📦 **制品管理** - 自动构建和上传证书包为 GitHub Artifacts
- 🚀 **自动部署** - 证书申请成功后自动触发部署工作流

## 工作流程

### 1. SSL 证书申请工作流 (`ssl_issue_lvcdy.yml`)

**触发方式：** 手动触发 (Workflow Dispatch)

**工作步骤：**

1. **检出代码** - 检出仓库代码
2. **申请证书** - 使用 acme.sh 从 LiteSSL 申请证书
   - 支持通配符域名 `*.lvcdy.cn`
   - 使用 EC-384 加密
   - 阿里云 DNS 自动验证
3. **上传制品** - 将生成的证书文件上传为 GitHub Artifacts
   - `cert.key` - 私钥文件
   - `cert.pem` - 完整证书链
4. **触发部署** - 自动触发部署工作流 `ssl_deploy_lvcdy.yml`

### 2. 证书部署工作流 (待配置)

部署工作流 `ssl_deploy_lvcdy.yml` 由证书申请工作流自动触发。

## 配置要求

### GitHub Secrets

在 GitHub 仓库 `Settings > Secrets and variables > Actions > Variables` 中添加：

| 变量名 | 说明 | 示例 |
| --- | --- | --- |
| `DOMAIN_MAIN` | 申请证书的主域名 | `example.com` |
| `DOMAIN_CHECK` | 用于过期检测的地址 | `www.example.com` |
| `EMAIL` | ACME 注册邮箱 | `admin@example.com` |
| `SERVER_CERT_PATH` | 服务器存放证书路径 | `/etc/caddy/ssl/` |
| `RESTART_CMD` | 服务器重启网关命令 | `docker restart caddy` |


在 `Actions > Secrets` 中添加：

| Secret 名 | 说明 |
| --- | --- |
| `ALIYUN_AK / SK` | 阿里云访问密钥 |
| `TENCENT_AK / SK` | 腾讯云访问密钥 |
| `EAB_ID / EAB_KEY` | LiteSSL 或其他商家的 EAB 凭据 |
| `ESA_SITE_ID` | 阿里云 ESA 站点 ID |
| `SSH_HOST / USER / KEY` | 服务器登录凭据 (建议使用 Key 登录) |
| `PAT_TOKEN` | 具有 `repo` 权限的个人访问令牌 |


### 环境配置

- **ACME 服务器** - LiteSSL: `https://acme.litessl.com/acme/v2/directory`
- **域名** - `*.lvcdy.cn`
- **证书密钥长度** - EC-384
- **验证方式** - DNS (Ali DNS)

## 使用指南

### 手动触发证书申请

1. 进入 GitHub 仓库
2. 点击 **Actions** 标签
3. 选择 **"SSL Issue: lvcdy.cn"** 工作流
4. 点击 **Run workflow** 按钮

### 查看证书文件

1. 工作流完成后，进入 Run Details
2. 滚动到 **Artifacts** 部分
3. 下载 `lvcdy-cert-package` 文件包

## 文件说明

```
cert-_update/
├── .github/
│   └── workflows/
│       ├── ssl_issue_lvcdy.yml      # 证书申请工作流
│       └── ssl_deploy_lvcdy.yml     # 证书部署工作流 (待创建)
├── LICENSE                          # 许可证文件
└── README.md                        # 项目文档
```

## 证书文件

工作流输出的证书文件：

- **cert.key** - 私钥文件，用于服务器配置
- **cert.pem** - 完整证书链，包含根证书和中间证书

## 常见问题

### Q: 证书申请失败如何排查？
A: 检查以下几点：
1. 确保所有 GitHub Secrets 已正确配置
2. 验证阿里云 DNS 账户状态和 API 权限
3. 查看工作流运行日志获取详细错误信息

### Q: 证书多久更新一次？
A: 目前需要手动触发。可以通过配置定时任务 (cron schedule) 实现自动更新。

### Q: 如何修改要申请的域名？
A: 修改 `ssl_issue_lvcdy.yml` 中的以下行：
```yaml
--issue --dns dns_ali -d "*.lvcdy.cn"
```

## 相关资源

- [acme.sh 文档](https://github.com/acmesh-official/acme.sh)
- [LiteSSL ACME](https://acme.litessl.com/)
- [阿里云 DNS API](https://help.aliyun.com/zh/dns/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
