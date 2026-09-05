# Deno KV Proxy 部署指南

## 1. 部署到 Deno Deploy

### 方法 A: GitHub + Deno Deploy Dashboard (推薦)

1. **推送代碼到 GitHub**
   ```bash
   git add deno/kv-proxy.ts
   git commit -m "Add Deno KV Proxy for playback analytics"
   git push
   ```

2. **在 Deno Deploy 創建項目**
   - 訪問 https://dash.deno.com/
   - New Project → From GitHub
   - 選擇你的 repo
   - Entry point: `deno/kv-proxy.ts`
   - 部署

3. **設置環境變量**
   - 在 Deno Deploy 項目 Settings → Environment Variables
   - 添加：`KV_PROXY_SECRET` = 你的強密碼 (如: `openssl rand -hex 32`)
   - **無需設置 DENO_KV_URL** — `Deno.openKv()` 會自動連接項目的 KV 數據庫

4. **獲取部署 URL**
   - 部署完成後會得到類似：`https://your-project.deno.dev`

### 方法 B: CLI 部署
```bash
deno deploy --project=your-project deno/kv-proxy.ts
```

---

## 2. 配置 Next.js 環境變量

在 `.env.local` 或 Vercel/部署平台設置：

```env
# Deno KV Proxy URL (從 Deno Deploy 獲取)
DENO_KV_URL="https://your-project.deno.dev"

# 必須與 Deno Deploy 的 KV_PROXY_SECRET 一致
DENO_KV_TOKEN="your-KV_PROXY_SECRET-value"
```

---

## 3. 本地開發 (無需 Deno Deploy)

不設置環境變量時自動使用內存 fallback，重啟後數據丟失但不影響開發。

**本地測試真實 KV**（可選）：
```bash
# 設置 DENO_KV_URL 指向 Deno Deploy proxy 或本地 Deno KV
export DENO_KV_URL="https://your-project.deno.dev"
export DENO_KV_TOKEN="your-KV_PROXY_SECRET"
deno run --allow-net --allow-env deno/kv-proxy.ts
```

---

## 4. 驗證部署

```bash
# 健康檢查
curl https://your-project.deno.dev/health

# 測試寫入 (需 Authorization header)
curl -X POST https://your-project.deno.dev/set \
  -H "Authorization: Bearer your-KV_PROXY_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"key":["test","key"],"value":123}'

# 測試讀取
curl "https://your-project.deno.dev/get/%5B%22test%22%2C%22key%22%5D" \
  -H "Authorization: Bearer your-KV_PROXY_SECRET"
```

---

## 5. API 端點說明

| 方法 | 路徑 | 說明 |
|------|------|------|
| GET | `/health` | 健康檢查 |
| GET | `/get/["key","parts"]` | 讀取單個 key (URL encoded JSON array) |
| POST | `/set` | 寫入 `{key, value}` |
| POST | `/atomic` | 原子操作 `{checks, mutations}` |
| POST | `/list` | 列表查詢 `{prefix, limit}` |
| POST | `/get-many` | 批量讀取 `{keys: [[]]}` |

---

## 6. 架構圖

```
Next.js (Vercel/本地)
    │
    │ POST /api/track/playback
    ▼
lib/analytics.ts (DenoKvProxyClient)
    │
    │ HTTPS + Bearer Token
    ▼
Deno Deploy (kv-proxy.ts)
    │
    │ 自動連接 (Deno.openKv())
    ▼
Deno KV (項目級，全球分佈式)
```

---

## 7. 成本估算

| 服務 | 免費額度 | 超出後 |
|------|----------|--------|
| Deno Deploy | 100k requests/月 | $2/100k |
| Deno KV | 1GB 存儲/月 | $0.50/GB |
| **總計** | **完全免費** | 極低 |

---

## 8. 故障排查

| 問題 | 解決 |
|------|------|
| 401 Unauthorized | 檢查 `DENO_KV_TOKEN` = `KV_PROXY_SECRET` |
| 404 Not Found | 確認路徑正確：`/set` `/atomic` `/list` |
| CORS 錯誤 | Proxy 已內置 CORS headers |
| 連接超時 | Deno Deploy 冷啟動偶爾延遲，重試即可 |

---

## 關鍵改進：零配置連接

```typescript
// 以前需要 connect URL (僅限 Deno KV Connect)
const kv = await Deno.openKv("https://api.deno.com/v2/databases/.../connect");

// 現在在 Deno Deploy 上零配置
const kv = await Deno.openKv();  // 自動連接當前項目的 KV
```

這是 Deno Deploy 原生特性：**同一個 Deploy 項目自動綁定一個 KV 數據庫**，無需手動管理連接字串。