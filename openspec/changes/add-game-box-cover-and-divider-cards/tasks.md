# Tasks

## 1. 前置與協調

- [x] 1.1 確認前置條件：`add-game-box-card-presets` 已合併，本分支已 rebase 於其上（`git log --oneline` 可見該 change 的 merge/commit），`gameBoxDefinition` 已有七組卡片尺寸 preset；未滿足時停止並回報 lead。
- [x] 1.2 對照 `retire-card-box` 的 proposal/design：確認本 change 的協調事項（design.md 決策 6）與其 `card-storage-shell` 搬移清單一致，即該 change 搬移/刪除的檔案集合涵蓋 game-box 將使用的所有 shell 匯出（`buildCardBoxDivider`、`CardBoxArtPartBuild`、`text.ts` 兩個文字函式、`cardBoxToken`、SVG outline 型別、`CARD_BOX_CONFIGURATION` 尺寸函式），且 game-box 不再 import `cover.ts`、`layout.ts`、`svg-outline.ts`、`card-box-svg/`；若有出入，先與 lead 確認再動工。
- [x] 1.3 命名與目錄檢查（無新 component）：本 change 不新增 modelId、buildKey、route 或 OpenGrid component；既有 ID 全部保留。實作後驗證 `game-box` 的 modelId/buildKey/route 皆為 `game-box`、顯示名稱無 `OpenGrid ` 前綴；card-box 行為與輸出不變（card-box 測試原值通過），唯一更動的 card-box 檔案是 `card-box/definition.ts` 的 `context.coverSvg` 讀取名（design.md 決策 5 / 任務 5.1）；`package.json` 與 lockfile 無差異。

## 2. 合約層 `src/cad-contract/units/game-box.ts`

- [x] 2.1 新增型別與參數鍵：`GameBoxDividerIndex`（1–5）、`dividerNText`／`dividerNTabPosition`／`dividerNStyle` 五組、九個封面欄位，`GameBoxPart` 加入 `cover` 與 `divider1`…`divider5`；全部為扁平單值並納入 `GAME_BOX_PARAMETER_KEYS` 與 `defaultParameters`（24 個新鍵：15 個分隔卡鍵加 9 個封面鍵）。
- [x] 2.2 `GAME_BOX_CONFIGURATION` 加入分隔卡與封面的範圍／預設常數（文字上限 20、封面文字上限 30、文字高 4–20／3–12、SVG 寬 10–58、垂直位置 0–100、Tab 與樣式列舉、預設 `GAME`／`left`／`raised`；封面 SVG 寬超過目前卡片安全區寬時驗證必須拒絕，供 preset 不套用規則使用）。
- [x] 2.3 擴充 `validateGameBoxParameters`：新欄位範圍與列舉（欄位級錯誤）、`usesCoverSvg` 缺指紋規則、不存在的 `dividerN` 與 `moduleN` 零件選擇被拒；非啟用分隔卡欄位仍驗範圍但不影響幾何（沿用模組欄位規則）。
- [x] 2.4 檔名：`gameBoxFileName`／`gameBoxStlFileName` 支援 `cover` 與 `dividerN`（含邊界編號、Tab、樣式、FNV token，空文字 `blank`；封面含卡片尺寸、推算深度、樣式、圖稿 token），新增 `gameBoxThreeMfFileName`（有 accent 圖稿回傳同名 `.3mf`，否則 null）。
- [x] 2.5 `boundsForGameBox` 支援 `cover`（`W × H × 0.6`）與 `dividerN`（與現行 divider 相同外框）。
- [x] 2.6 更新 raw parser（`model-raw-parsers/game-box.ts`）與 `model-parameter-keys.ts` 的 game-box 鍵清單，納入全部新鍵。

## 3. Kernel `src/cad-kernel/components/game-box/`

- [x] 3.1 逐字搬移 card-box 的 `cover.ts`、`layout.ts`、`svg-outline.ts` 至 `src/cad-kernel/components/game-box/`（僅改 import 路徑；行為不變），game-box builder 改用搬移後的模組。
- [x] 3.2 新增每片分隔卡的建構：以 shell 的 `buildCardBoxDivider`（或其 plate + 文字路徑）依 `dividerN*` 欄位建構單片分隔卡；空白文字 + `left` 走現行 plain 路徑，保證與 `buildCardBoxDividerFromGeometry` 幾何相同。
- [x] 3.3 `builder.ts`：單零件支援 `cover` 與 `dividerN`（列印方位 z ≥ 0）；assembly 加入封面片（前緣封面槽，沿用 card-box 擺放）與每片帶文字圖稿的分隔卡；錯誤邊界包裝：將 shell 錯誤字串轉為 `GAME_BOX_DIVIDER_TEXT_TOO_WIDE`／`GAME_BOX_COVER_ART_OUTSIDE_SAFE_AREA`／`GAME_BOX_SVG_*` 後重新擲出，未知錯誤原樣上拋。
- [x] 3.4 `definition.ts` 增加 `buildWithParts`：`cover` 與帶文字分隔卡回傳 body/accent parts（沿用 card-box combinedArtShape 模式，含 clone 與 dispose），其餘零件僅 shape。
- [x] 3.5 漸進式預覽（`progressive-preview/components.ts`）與場景 proxy（`scene/proxy.ts`）支援 `cover` 與 `dividerN`：封面平板、每片分隔卡含 Tab（依各自 Tab 位置），外框與 contract bounds 一致。

## 4. SVG 匯入功能 `src/features/cad/game-box-cover-svg/`

- [x] 4.1 搬移 `card-box-svg` 的 `parse-svg.ts` 與 `fingerprint.ts` 為 game-box 版本（僅改 import 與命名），行為與錯誤碼語義不變。
- [x] 4.2 新增 game-box 專屬 store：key `shape-shortcut:game-box-cover-svg:v1`，沿用 256 KB 上限、單筆紀錄、session-only 回退、損毀回退規則；MUST NOT 讀寫 `shape-shortcut:card-box-cover-svg:v1`。

## 5. Worker、下載與錯誤

- [x] 5.1 `KernelBuildContext.cardBoxCoverSvg` 改名為中立的 `coverSvg`；`cad-worker-generation.ts` 對 `game-box` 傳入輪廓資料；`model-generation.ts` 依 game-box 指紋自新 store 載入。
- [x] 5.2 新增 game-box 自有的 Worker error rules（`src/workers/error-rules/game-box.ts`）：`GAME_BOX_DIVIDER_TEXT_TOO_WIDE`、`GAME_BOX_COVER_ART_OUTSIDE_SAFE_AREA`、`GAME_BOX_SVG_` → `GAME_BOX_GEOMETRY_INVALID`（stage `building`），order排在 card-box 同類規則之前；共享 runtime matcher 加入對應的本地化 descriptor（en／zh-Hant）。
- [x] 5.3 目錄定義（`model-catalog/components/game-box.ts`）掛 `threeMfFileName`（contract 的 `gameBoxThreeMfFileName`），使 3MF 僅對有 accent 圖稿的 `cover`／分隔卡零件啟用；assembly 維持全部下載停用與提示。

## 6. 面板 `GameBoxComponentPanel.svelte`

- [x] 6.1 零件選擇器列出 `assembly`、`box`、`lid`、`cover`、每個 dice 模組的骰子匣與 `divider1`…`dividerN`；每項以邊界編號識別；清單操作使選擇失效時回到 `assembly`。
- [x] 6.2 新增「分隔卡」欄位組：每個邊界一張卡（文字輸入、Tab 位置、樣式），欄位級錯誤顯示在對應分隔卡項目內；新增／刪除／移動模組時依 design.md 決策 2 的規則保留或重置。
- [x] 6.3 新增封面欄位組：標題、標題文字高、副標題、副標題文字高、SVG 寬、垂直位置滑桿、樣式，並接入 SVG 匯入控制項（帶 Beta 徽章、匯入／移除、損毀與 session-only 提示）。
- [x] 6.4 下載互動：`cover`／`dividerN` 有圖稿時啟用 3MF 按鈕，素板停用 3MF 並保持 STEP/STL。

## 7. 翻譯

- [x] 7.1 `en` 與 `zh-Hant` 各新增：`parameter.*`（24 個新欄位標籤）、`panel.gameBox.cover.*`、`panel.gameBox.divider.*`、零件名稱（cover、dividerN）、`validation.gameBox*`（新欄位錯誤）與 `diagnostic.gameBox*`（文字過寬、超出安全區、SVG 拒絕）；驗證兩個 locale 的 key 集合一致，且無未翻譯訊息鍵。

## 8. 測試

- [x] 8.1 單元：移植 card-box contract/layout 測試的封面與版面案例至 game-box（欄位範圍、預設、安全區、堆疊、垂直位置）；新增分隔卡欄位組測試（範圍、預設、非啟用群組不影響幾何、清單操作保留規則）與 preset 保留封面／分隔卡欄位、封面圖樣放不下時不套用的測試。
- [x] 8.2 單元：移植 `card-box-svg-parse`／`card-box-svg-store` 測試至 game-box 版本（新 key、256 KB、session 回退、不讀 card-box key）。
- [x] 8.3 Worker：移植 `card-box-art` 案例（raised/flat 分隔卡文字、過寬拒絕、封面標題/SVG/副標題、安全區拒絕、垂直位置）與 `card-box.integration` 的 3MF parts 案例（body/accent、擠出機對應、素板無 3MF）至 game-box 各零件。
- [x] 8.4 Worker：以參考幾何釘住空白分隔卡（70.85 × 125 × 0.85 mm、7347.9 mm³）與 `left`/`center`/`right` Tab 外形；組裝（含非空分隔卡文字與封面圖稿）於預設／最小／最大卡片尺寸下任兩零件交集體積為零；新零件的漸進式預覽 bbox 差 ≤ 0.5 mm。
- [x] 8.5 單元：檔名測試（dividerN 編號區分、僅文字不同檔名不同、封面 token、3MF 同名 `.3mf`、盒體與骰子匣檔名不變）。
- [x] 8.6 E2E（`tests/e2e/game-box.spec.ts`）：編輯 `divider2Text`（含超限錯誤只顯示在該分隔卡）、選擇 `divider3`／`cover` 並重新生成、清單操作後分隔卡設定保留、3MF 按鈕只在圖稿零件啟用、SVG 匯入 Beta 徽章與回退提示、兩個 locale 無 raw key。

## 9. 驗證與提交

- [x] 9.1 執行 `pnpm check`、對每個更動檔案執行 prettier、`pnpm exec openspec validate add-game-box-cover-and-divider-cards --strict`，以及 `pnpm test:changed`（game-box 與移植測試為主），確認全部通過；不執行 `pnpm test:branch`、CAD 全組或 e2e 全組以外的無關套件。
- [x] 9.2 依主題分段提交（openspec 提案、合約、kernel/SVG 功能、Worker/面板/翻譯、測試、tasks ticked），以路徑方式 stage，不使用 `git add -A`；確認未更動 `card-box` 檔案、`package.json` 與 lockfile。

## Workflow follow-up

- 依 `/openspec-to-main-pr` 規則：proposal 完成後由 owner 端（herdr 終端 `t3q`）審核；通過後才進入 apply、獨立 compliance review、`openspec-sync-specs`、`openspec-archive-change`、push 與 `main` 的 draft PR。
- 本 change 之後才執行 `retire-card-box`；apply 期間若 design.md 決策 6 的協調事項與 retire proposal 有出入，停下回報 lead，不得單方面修改 retire proposal。

## Round-1 gate fixes

- [x] 3.6 （已由 3.7 於 rework 後移除——讓位帶不再存在）骰子匣頂部讓位帶（design.md 決策 9）：正面與背面牆頂部 1.0 mm 帶內縮 0.3 mm，使 `raised` 分隔卡標籤與相鄰骰子匣的組裝交集為零；讓位帶位於骰槽上方自由餘隙（容量不變），X 限制在本體寬度內（不碰握持薄片），並加入帶標籤組裝的成對零交集測試（`raised`＋`flat`、兩側骰子模組、預設／最小／最大卡片尺寸）。

## Rework after #215 (2026-11-25)

- [x] 3.7 重做後適配：分支以 `git rebase --onto origin/main 4b0b2df` 改基於合併後的 `f3976c9`；`dividerN` 改為「兩個 `cards` 模組相鄰」邊界的序號（holder 邊界無分隔卡）；移除骰子匣頂部讓位帶及其測試（決策 9）；零件選擇器、檔名、3MF、preset 規則與 delta spec 全部改寫在合併後的 main 文本上（7 ADDED + 8 MODIFIED，--strict 通過）。
- [x] 8.7 幾何 baseline：game-box 項目由 origin/main 的 108989.878666 mm³（2 solids）更新為 114090.238551 mm³（7 solids：盒體＋滑蓋＋封面片＋4 個 GAME 字形；bounds 不變），僅 game-box 項目變更，以測試自身的 build 路徑量測。
