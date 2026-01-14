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
---

### 1️⃣ 监测任务：`.github/workflows/ssl_check.yml`

```yaml
name: "SSL: 0.Check"

on:
  schedule:
    - cron: '0 0 * * 1' # 每周一检测
  workflow_dispatch:

permissions:
  actions: write

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - id: check
        run: |
          T="${{ vars.DOMAIN_CHECK }}" # 在 Variables 中配置
          E=$(echo | openssl s_client -4 -connect $T:443 -servername $T -timeout 5 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)
          D=$(( ($(date -d "$E" +%s) - $(date +%s)) / 86400 ))
          echo "Days: $D"
          [ $D -lt 20 ] && echo "renew=true" >> $GITHUB_OUTPUT || echo "renew=false" >> $GITHUB_OUTPUT

      - if: steps.check.outputs.renew == 'true'
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.actions.createWorkflowDispatch({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'ssl_issue.yml',
              ref: 'main'
            })

```

---

### 2️⃣ 申请任务：`.github/workflows/ssl_issue.yml`

```yaml
name: "SSL: 1.Issue"

on:
  workflow_dispatch:

permissions:
  actions: write
  contents: read

jobs:
  issue:
    runs-on: ubuntu-latest
    env:
      ACME: "https://acme.litessl.com/acme/v2/directory"
      DOMAIN: "${{ vars.DOMAIN_MAIN }}"
    steps:
      - uses: actions/checkout@v4

      - name: Issue Certificate
        env:
          Ali_Key: ${{ secrets.ALIYUN_AK }}
          Ali_Secret: ${{ secrets.ALIYUN_SK }}
        run: |
          curl https://get.acme.sh | sh
          ~/.acme.sh/acme.sh --register-account --server "$ACME" \
            --eab-kid "${{ secrets.EAB_ID }}" \
            --eab-hmac-key "${{ secrets.EAB_KEY }}" -m "${{ vars.EMAIL }}"
          
          ~/.acme.sh/acme.sh --issue --dns dns_ali -d "$DOMAIN" -d "*.$DOMAIN" \
            --server "$ACME" --keylength ec-384 --force --dnssleep 60
          
          mkdir -p ./out
          ~/.acme.sh/acme.sh --install-cert -d "$DOMAIN" --ecc \
            --key-file ./out/cert.key --fullchain-file ./out/cert.pem

      - uses: actions/upload-artifact@v4
        with:
          name: ssl-cert-package
          path: ./out/
          retention-days: 7

      - name: Trigger Deploy
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.actions.createWorkflowDispatch({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'ssl_deploy.yml',
              ref: 'main',
              inputs: { run_id: '${{ github.run_id }}' }
            });

```

---

### 3️⃣ 部署任务：`.github/workflows/ssl_deploy.yml`

```yaml
name: "SSL: 2.Deploy"

on:
  workflow_dispatch:
    inputs:
      run_id:
        required: true

jobs:
  deploy:
    runs-on: ubuntu-latest
    env:
      DOMAIN: "${{ vars.DOMAIN_MAIN }}"
    steps:
      - uses: actions/checkout@v4

      - name: Download Cert
        uses: actions/download-artifact@v4
        with:
          name: ssl-cert-package
          path: ./certs
          run-id: ${{ github.event.inputs.run_id }}
          github-token: ${{ secrets.PAT_TOKEN }}

      - name: Aliyun ESA
        env:
          ALICLOUD_AK: ${{ secrets.ALIYUN_AK }}
          ALICLOUD_SK: ${{ secrets.ALIYUN_SK }}
          SITE_IDS: ${{ secrets.ESA_SITE_ID }}
        run: |
          curl -L https://aliyuncli.alicdn.com/aliyun-cli-linux-latest-amd64.tgz | tar -xz
          sudo mv aliyun /usr/local/bin/
          aliyun configure set --access-key-id "$ALICLOUD_AK" --access-key-secret "$ALICLOUD_SK" --region "cn-hangzhou"
          
          NAME="${DOMAIN}_$(date +%Y%m%d_%H%M%S)"
          CID=$(aliyun cas UploadUserCertificate --Cert "$(cat ./certs/cert.pem)" --Key "$(cat ./certs/cert.key)" --Name "$NAME" | jq -r '.CertId')
          
          IFS=',' read -r -a ids <<< "$SITE_IDS"
          for sid in "${ids[@]}"; do
            sid=$(echo $sid | xargs)
            for oid in $(aliyun esa ListCertificates --SiteId "$sid" | jq -r '.Result[].Id // empty'); do
              aliyun esa DeleteCertificate --SiteId "$sid" --Id "$oid" || true
            done
            sleep 2
            aliyun esa SetCertificate --SiteId "$sid" --Type cas --CasId "$CID"
          done

      - name: Tencent SSL
        env:
          TENCENT_AK: ${{ secrets.TENCENT_AK }}
          TENCENT_SK: ${{ secrets.TENCENT_SK }}
        run: |
          pip install requests
          python3 - <<'EOF'
          import requests, os, hashlib, hmac, json, time
          from datetime import datetime
          ak, sk, dom = os.environ["TENCENT_AK"], os.environ["TENCENT_SK"], os.environ["DOMAIN"]
          with open("./certs/cert.pem") as f: pub = f.read()
          with open("./certs/cert.key") as f: pri = f.read()
          name = f"{dom}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
          def sign(key, msg): return hmac.new(key, msg.encode(), hashlib.sha256).digest()
          ts = int(time.time())
          dt = datetime.utcfromtimestamp(ts).strftime("%Y-%m-%d")
          body = {"CertificatePublicKey": pub, "CertificatePrivateKey": pri, "Alias": name, "Repeatable": True}
          p = json.dumps(body)
          can = f"POST\n/\n\ncontent-type:application/json; charset=utf-8\nhost:ssl.tencentcloudapi.com\nx-tc-action:uploadcertificate\n\ncontent-type;host;x-tc-action\n{hashlib.sha256(p.encode()).hexdigest()}"
          s = f"TC3-HMAC-SHA256\n{ts}\n{dt}/ssl/tc3_request\n{hashlib.sha256(can.encode()).hexdigest()}"
          sig = hmac.new(sign(sign(sign(("TC3"+sk).encode(), dt), "ssl"), "tc3_request"), s.encode(), hashlib.sha256).hexdigest()
          h = {"Authorization": f"TC3-HMAC-SHA256 Credential={ak}/{dt}/ssl/tc3_request, SignedHeaders=content-type;host;x-tc-action, Signature={sig}", "Content-Type": "application/json; charset=utf-8", "Host": "ssl.tencentcloudapi.com", "X-TC-Action": "UploadCertificate", "X-TC-Timestamp": str(ts), "X-TC-Version": "2019-12-05"}
          r = requests.post("https://ssl.tencentcloudapi.com", headers=h, json=body).json()
          if "Error" in r.get("Response", {}): print(r); exit(1)
          print(f"Tencent ID: {r['Response']['CertificateId']}")
          EOF

      - name: Server Deploy
        uses: appleboy/scp-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          source: "./certs/*"
          target: "${{ vars.SERVER_CERT_PATH }}"
          strip_components: 1

      - name: Server Restart
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: ${{ vars.RESTART_CMD }}

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
