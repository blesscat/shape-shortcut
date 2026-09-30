# Cloudflare Workers 遷移與回復

此專案提供 `dist/` 靜態檔案。`wrangler.jsonc` 沒有應用程式 Worker 入口、SSR adapter、資料庫或 R2 binding。CAD 計算與檔案產生由使用者瀏覽器完成。

## 目前部署狀態（2026-09-30）

- 正式站：`https://shape-shortcut.blesscat.dev`，由 `shape-shortcut` Worker 提供；同版本也可在 `https://shape-shortcut.blesscat.workers.dev` 驗證。
- GitHub repository：`blesscat/shape-shortcut`；`main` 自動部署正式 Worker，其他分支使用獨立 Worker Preview。
- Node.js `22.23.2`、pnpm `11.20.0` 已設為 production 與 preview 的 build variables；公開網址及贊助連結沿用 `.env.production`。
- 正式 custom domain 已轉移到 Worker，DNS 記錄由 Workers 管理。`wrangler.jsonc` 的 `routes` 保存正式 hostname；手動 `pnpm run deploy` 也會更新正式站。
- Pages 專案保留作回復，production 自動部署已關閉，preview 設為 `none`。回復版本為 `0d34d11e-a162-4679-b629-48c0c3fe3eb8`（commit `e158441`），網址 `https://0d34d11e.shape-shortcut.pages.dev`。
- 首次 Workers Builds 成功，dashboard 顯示 1 分 6 秒：初始化 3 秒、clone 4 秒、安裝 26 秒、build 13 秒、deploy 20 秒。這是單次量測，後續快取與帳號總用量會影響實際耗時。

下方保留建立、驗證及回復步驟。重新演練候選遷移時，先在獨立設定中移除正式 `routes`，避免候選部署改動正式 hostname。

## 本機驗證與手動發布

使用 Node.js 22.22.2 以上、pnpm 11.20.0，並以 lockfile 安裝：

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm test:e2e:workers
pnpm exec wrangler deploy --dry-run
```

hosting 測試會自行執行 `pnpm build`，在 `127.0.0.1:4179` 啟動 Wrangler，驗證兩個語系的靜態內容與 SEO、308 轉址及 query、404、WASM MIME/檔案，以及瀏覽器 CAD Worker 產生的 STL。使用獨立測試伺服器，避免誤測其他已啟動的站台。測試結束後伺服器會關閉。

互動檢查使用 `pnpm preview:workers`。若要手動發布，先完成 `pnpm exec wrangler login`，再執行 `pnpm run deploy`。瀏覽器 dashboard 的登入與 Wrangler CLI 的授權是兩件事。CI 使用 Cloudflare 提供的 build token；不要將 token 寫入 Git。

## Workers Builds 設定

合併後，在 Cloudflare Workers & Pages 建立連接 `blesscat/shape-shortcut` repository 的 Worker，名稱設為 `shape-shortcut`，與 `wrangler.jsonc` 相同。Workers 與 Pages 專案可並存；若同名 Worker 已存在，先確認其用途。

| 設定                          | 值                           |
| ----------------------------- | ---------------------------- |
| Root directory                | repository 根目錄            |
| Production branch             | `main`                       |
| Build command                 | `pnpm build`                 |
| Deploy command                | `pnpm exec wrangler deploy`  |
| Preview command               | `pnpm exec wrangler preview` |
| Build variable `NODE_VERSION` | `22.23.2`                    |
| Build variable `PNPM_VERSION` | `11.20.0`                    |

開啟需要的 preview branch builds。設定檔已啟用 `workers.dev`、`preview_urls` 與 `previews`。若 dashboard 仍使用舊的 preview 模式，依 Cloudflare 的遷移指引啟用 Worker Previews 後再使用表列 preview 指令。

Cloudflare 會先安裝依賴，再執行 build/deploy。不要把 `pnpm run deploy` 填成 Deploy command，否則同一次 pipeline 會再 build 一次。保留 `pnpm-workspace.yaml` 中對 `workerd` 的允許設定；Wrangler 及 Miniflare 的版本例外只針對已鎖定版本。

從 Pages 的 production/preview 設定比對並搬移需要的 **build-time** 公開變數：

- `PUBLIC_SITE_URL=https://shape-shortcut.blesscat.dev`
- `PUBLIC_PORTALY_SUPPORT_URL=https://portaly.cc/blesscat/support`
- `PUBLIC_KOFI_SUPPORT_URL=https://ko-fi.com/blesscat`

repository 的 `.env.production` 已有這些預設值；dashboard 值會覆寫它們。不要把設定只放在 Worker runtime Variables，Astro 已在 build 時產生 HTML。候選和分支預覽沿用正式 origin，讓 canonical 與 sitemap 指向正式站；若預覽需要限制可見性，另外設定 Cloudflare Access。canonical 本身不是存取控制。

## 切換前的候選版本驗證

先完成 `workers.dev` 部署，檢查遠端 build log 的工具版本、build/deploy 成功狀態與實際耗時。沿用本機測試也能檢查一個可直接存取的遠端站台：

```bash
WORKERS_TEST_BASE_URL=https://shape-shortcut.YOUR-SUBDOMAIN.workers.dev pnpm test:e2e:workers
```

這個模式不會本機 build 或啟動伺服器；若遠端刻意覆寫了 origin，同時設定對應 `PUBLIC_SITE_URL`。受 Access 保護的網址須先提供合適的測試存取方式。

另外人工檢查首頁、Docs、About、模型選擇、CAD 預覽、語系切換與兩個贊助連結。Wall Cover 的 3MF 下載也要檢查。確認 preview 分支可以建立獨立預覽，且不影響正式 Worker 版本。

Host 行為：

- 既有 directory index URL 會補上尾端 `/`。
- 舊首頁、Models、Docs、About、CAD URL 先以 308 導向繁體中文，保留 query string；依目的地可能再有一次尾端斜線正規化。
- 找不到的頁面與資產回 404。這是與 Pages 未提供 `404.html` 時自動回首頁的行為差異。
- 正式 `PUBLIC_SITE_URL`、model ID、儲存鍵、瀏覽器 CAD Worker 與下載格式維持原有定義。

## 正式網域切換

1. 記錄目前成功的 Pages deployment ID、`pages.dev` URL、custom domain 設定與 DNS 記錄，保留 Pages 專案作回復用途。
2. 確認 `blesscat.dev` 的 nameservers 由 Cloudflare 管理，候選版本與 Git preview 驗證已通過。
3. 暫停自動發布以避免切換期間有新版本。從 Pages 解除 `shape-shortcut.blesscat.dev` 的 custom domain，將同一 hostname 加入 Worker 的 Settings → Domains & Routes → Custom Domain。
4. 若既有 Pages CNAME 阻擋綁定，僅處理剛才記錄的該筆 DNS 記錄，再由 Workers Custom Domain 建立對應記錄及憑證。等待網域與 TLS 生效；此步可能有短暫中斷。
5. 對正式 hostname 重跑 hosting suite 與前節人工檢查。保留相同 HTTPS origin，讓既有 localStorage 參數與外部連結繼續有效。
6. 將正式網域納入 `wrangler.jsonc` 的 `routes`，經正常 PR 流程保存後，再啟用 Workers 自動發布。範例如下；只在候選驗證與網域轉移完成後加入：

   ```jsonc
   "routes": [
     { "pattern": "shape-shortcut.blesscat.dev", "custom_domain": true }
   ]
   ```

   遷移當時的候選設定省略正式 routes，先部署到 `workers.dev`；現在已納入正式 hostname。不要在尚未轉移時讓自動部署嘗試接管 Pages hostname；切換後也要將 dashboard 設定與 repository 對齊。

7. 關閉 Pages production 與 preview 的自動建置，避免每次 push 建置兩份。保留 Pages 專案及最後成功版本，待觀察期結束後另行決定是否刪除。

## 回復至 Pages

若候選驗證失敗，在 `workers.dev` 修正並重測即可。若正式切換後失敗：

1. 暫停 Workers 自動發布，從 Worker 移除正式 custom domain，避免後續部署重新接管；同步撤回 repository 的該條 route。
2. 將 hostname 重新加入保留的 Pages 專案，恢復先前記錄的 DNS 指向，等待 Pages domain/TLS 狀態正常。
3. 必要時在 Pages 選回最後成功的 production deployment。以該版本的既有路由行為驗證首頁、語系、CAD 與下載；舊版缺少 About 308 或未知頁面 404 時，不把 Workers 新增的斷言當成回復失敗。
4. 確認正式服務恢復後，重新啟用 Pages production/preview 自動部署。保留失敗 Worker 版本供調查。

## 費用與限制

2026-09-30 查核：一般 Static Assets 的請求與儲存免費；Workers Builds 免費額度為每帳號每月 3,000 分鐘。Shape Shortcut 最近 30 天的 173 次 Pages 部署，build 階段合計 112.8 分鐘，含初始化、clone 與發布約 154.9 分鐘（約免費額度 5.2%）。這是估算基準；Workers 的實際耗時、計費口徑、帳號其他專案用量仍以 dashboard 為準。

維持 assets-only 設定即可使用免費方案。新增應用程式 Worker、`run_worker_first`、Workers Caching 或其他產品時，要重新估算；不應因網站流量增加就推定純靜態請求會產生 Worker CPU 費用。部署前也須確保每個靜態資產不超過 25 MiB；目前 WASM 約 10.37 MiB。

- [Pages → Workers 遷移](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)
- [Static Assets 計費](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
- [Workers Builds 額度](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)
- [Workers 計費與 Caching](https://developers.cloudflare.com/workers/platform/pricing/)
- [Workers Builds 工具版本](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)
