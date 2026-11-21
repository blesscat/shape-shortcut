# Tasks

## 1. 翻譯

- [x] 1.1 在 `src/i18n/messages/en/cad-workspace.ts` 與 `src/i18n/messages/zh-Hant/cad-workspace.ts` 各新增七筆 `cad.presets.game-box.*` 翻譯（沿用同一組卡片標準名稱），並保留既有 `cad.presets.card-box.*` 不動；驗證兩個 locale 的 preset key 集合一致且皆為七筆。

## 2. game-box preset 清單與單元測試

- [x] 2.1 在 `src/features/cad/model-catalog/components/game-box.ts` 以 `GAME_BOX_PRESETS` 宣告七組卡片尺寸 preset（id、順序與尺寸與 `card-box` 既有七組一致，overrides 只含 cardWidth 與 cardHeight，labelKey 為 `cad.presets.game-box.*`），並在 `gameBoxDefinition` 上掛 `presets`；驗證 `gameBoxDefinition.presets` 恰有七組。
- [x] 2.2 新增 `tests/unit/game-box-presets.test.ts`，以字面值釘住七組 preset 的 id、順序與尺寸；驗證該測試通過。
- [x] 2.3 在同一支測試驗證每一組 preset 以 `defaultParameters` 疊加 overrides 後都通過 game-box contract 驗證，且套用後零件選擇為 `assembly`、模組清單回到只有模組 1 的 `cards` 模組、推算出的收納深度為 63 mm；驗證該測試通過。

## 3. 幾何測試

- [x] 3.1 在 worker 測試中比照 `tests/worker/card-box-parts.integration.test.ts` 的 preset 幾何測試，對七組 preset 各自以預設參數疊加 overrides 建構 game-box 的 `box`、`lid` 與 `assembly`，確認每次建構皆完成且量體積大於零；驗證該測試通過。

## 4. 瀏覽器測試

- [x] 4.1 在 `tests/e2e/game-box.spec.ts` 驗證 game-box 面板顯示「回復預設」加七顆卡片尺寸 preset 按鈕，按下任一按鈕後卡片寬高欄位變成該組尺寸且模型重新生成；驗證 `pnpm exec playwright test tests/e2e/game-box.spec.ts --project=chromium` 通過。

## 5. 驗證

- [x] 5.1 執行 `pnpm check`、對每個更動檔案執行 prettier、執行 `pnpm exec openspec validate add-game-box-card-presets --strict` 與新增／變更的單元測試、game-box 的 cad 測試檔，確認全部通過。
- [x] 5.2 依主題分段提交（proposal、實作、測試、tasks ticked），以路徑方式 stage，不使用 `git add -A`，並確認 `card-box` 的檔案、`package.json` 與 lockfile 都沒有被更動。

## Workflow follow-up

- Review gate 由 owner 端（herdr 終端 `t3q`）執行；收到 `gate passed: continue to phase 2` 之後才進行 sync、archive、push 與 draft PR。
- Sync 以 `openspec-sync-specs` 將 delta 併入 `openspec/specs/game-box/spec.md`，archive 以 `openspec-archive-change` 執行，兩者都由 owner 端在 gate 通過後要求。
