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

自动化SSL证书更新和部署系统，用于管理 `example.com` 域名的通配符证书。

## 项目概述

本项目利用 GitHub Actions 强大的工作流能力，集成了以下功能：

* 📜 **自动申请证书** - 使用 `acme.sh` 和 LiteSSL ACME 服务（支持 EAB 注册）。
* 🔐 **DNS 验证** - 自动化完成阿里云 DNS 挑战（DNS-01 Challenge）。
* 📦 **制品管理** - 证书签发后自动打包为 Artifacts，支持追溯与手动下载。
* 🚀 **多端部署** - 联动分发至阿里云 ESA、腾讯云证书中心及服务器。

## 工作流程

系统由三个相互关联的工作流组成：

### 1. 证书监测 (`ssl_check.yml`)

**触发方式：** 每周一凌晨定时执行或手动触发。

**核心逻辑：** 远程连接服务器获取证书剩余有效期。若不足 20 天，则自动触发申请工作流。

### 2. 证书申请 (`ssl_issue.yml`)

**触发方式：** 由监测任务自动触发或手动触发。

**核心步骤：**

1. **环境准备**：安装 `acme.sh` 并通过 EAB 注册账户。
2. **执行签发**：调用阿里云 DNS 验证签发 **ECC-384** 加密证书。
3. **上传制品**：将 `cert.key` 和 `cert.pem` 上传至 GitHub 仓库。
4. **触发部署**：证书就绪后，唤起部署任务。

### 3. 自动化部署 (`ssl_deploy.yml`)

**触发方式：** 由申请任务自动触发。

**核心步骤：**

1. **多云分发**：自动推送到阿里云 ESA 站点并绑定，同时上传至腾讯云 SSL 证书中心。
2. **物理服务器**：通过 SSH/SCP 将证书同步至服务器指定目录并重启网关服务（如 Caddy/Nginx）。

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


## 核心代码参考

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

## 相关资源

- [acme.sh 文档](https://github.com/acmesh-official/acme.sh)
- [阿里云 DNS API](https://help.aliyun.com/zh/dns/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
