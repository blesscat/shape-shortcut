# Tasks

## 1. 翻譯

- [x] 1.1 在 `src/i18n/messages/en/cad-workspace.ts` 與 `src/i18n/messages/zh-Hant/cad-workspace.ts` 各新增七筆 `cad.presets.game-box.*` 卡片尺寸標籤（沿用同一組卡片標準名稱），並保留既有 `cad.presets.card-box.*` 不動；驗證兩個 locale 的 preset key 集合一致且皆為七筆。
- [x] 1.2 新增 `cad.presets.game-box.notApplicable` 的 en 與 zh-Hant 訊息，說明該預設不適用於目前的模組；驗證兩個 locale 都有非空譯文。

## 2. 共用 preset 機制

- [x] 2.1 在 `ModelDefinition` 增加 `presetBase`（`'defaults'` 預設、`'current'` opt-in），讓 `resolvePresetParameters` 可以把 overrides 合併到呼叫端交來的目前參數；預設路徑的行為與既有測試 MUST 完全不變。
- [x] 2.2 合併結果若只因零件選擇而無效，改以 `assembly` 重試一次（僅限宣告 `presetBase: 'current'` 的 component；以預設參數為底者維持原行為，無效即拒絕）；仍無效則回傳未套用，絕不退回預設參數取代。
- [x] 2.3 `createCadWorkspaceController` 與 playground 的 `applyPreset` 都交出目前參數（`state.input` 與 `instance.parameters`），並在 preset 不適用時保留目前參數、顯示本地化訊息；驗證 workspace 面板與 playground 診斷區都看得到訊息：workspace 以 e2e 驗證（顯示訊息後按「回復預設」，訊息消失），playground 以 store 單元測試驗證（放得下的 preset 保留模組欄位只改卡片尺寸；放不下的 preset 保留參數且 `diagnostic.messageId` 為 `cad.presets.game-box.notApplicable`）。
- [x] 2.4 以 `MODIFIED` delta 修正 `component-parameter-presets` capability 的「Preset 參數解析與驗證」requirement（新增 `specs/component-parameter-presets/spec.md`），帶上完整內容：預設仍以 `defaultParameters` 為底、`presetBase: 'current'` 為 opt-in、零件失效時改用 `assembly`、不適用時保留參數並顯示本地化訊息、絕不退回預設參數；該 capability 的 component 列舉 requirement MUST NOT 動（屬於下架 card-box 的 task）。

## 3. game-box preset 清單與單元測試

- [x] 3.1 在 `src/features/cad/model-catalog/components/game-box.ts` 以 `GAME_BOX_PRESETS` 宣告七組卡片尺寸 preset（id、順序與尺寸與 `card-box` 既有七組一致，overrides 只含 cardWidth 與 cardHeight，labelKey 為 `cad.presets.game-box.*`），並宣告 `presetBase: 'current'`；驗證 `gameBoxDefinition.presets` 恰有七組。
- [x] 3.2 在 `tests/unit/game-box-presets.test.ts` 以字面值釘住七組 preset 的 id、順序與尺寸，驗證每組都通過 game-box contract、標籤在兩種語系都有譯文；驗證該測試通過。
- [x] 3.3 驗證套用 preset 只改變卡片尺寸：模組清單、每個模組欄位、推算收納深度與零件選擇都保持不變；驗證放不下時不套用且參數不變；驗證該測試通過。
- [x] 3.4 在 `tests/unit/model-preset-parameters.test.ts` 驗證共用機制：以目前參數為底、零件失效時改用組裝（且僅限 opt-in）、其他原因無效時不套用、以預設參數為底者仍拒絕只因零件而無效的 preset、card-box 仍以預設參數為底，以及每個 opt-in component 的不適用訊息在兩種語系都有譯文；驗證該測試通過。

## 4. 幾何測試

- [x] 4.1 在 worker 測試中比照 `tests/worker/card-box-parts.integration.test.ts` 的 preset 幾何測試，對七組 preset 各自以預設參數疊加 overrides 建構 game-box 的 `box`、`lid` 與 `assembly`，確認每次建構皆完成且量體積大於零；驗證該測試通過。

## 5. 瀏覽器測試

- [x] 5.1 在 `tests/e2e/game-box.spec.ts` 驗證 game-box 面板顯示「回復預設」加七顆卡片尺寸 preset 按鈕，按下後卡片寬高欄位變成該組尺寸且模型重新生成。
- [x] 5.2 驗證套用 preset 後模組清單仍在，以及放不下的 preset 不會被套用且面板顯示本地化訊息；驗證 `pnpm exec playwright test tests/e2e/game-box.spec.ts --project=chromium` 通過。

## 6. 驗證

- [x] 6.1 執行 `pnpm check`、對每個更動檔案執行 prettier、執行 `pnpm exec openspec validate add-game-box-card-presets --strict` 與完整 fast 測試套件、game-box 的 cad 測試檔，確認全部通過。
- [x] 6.2 執行 `tests/e2e/game-box.spec.ts`、`tests/e2e/card-box.spec.ts` 與 `tests/e2e/component-parameter-presets.spec.ts`，確認共用機制的變更沒有影響 card-box 與 stackable-box 的 preset 行為。
- [x] 6.3 依主題分段提交，以路徑方式 stage，不使用 `git add -A`，並確認 `card-box` 的檔案、`package.json` 與 lockfile 都沒有被更動。

## Workflow follow-up

- Review gate 由 owner 端（herdr 終端 `t3q`）執行；收到 `gate passed: continue to phase 2` 之後才進行 sync、archive、push 與 draft PR。
- Sync 以 `openspec-sync-specs` 將 delta 併入 `openspec/specs/game-box/spec.md`，archive 以 `openspec-archive-change` 執行，兩者都由 owner 端在 gate 通過後要求。
- Sync 時必須一併以手動編輯修正 `openspec/specs/component-parameter-presets/spec.md` 的 Purpose（「點擊即以該組預設覆蓋使用者目前參數」）：OpenSpec 的 delta 無法取代既有 capability 的 Purpose，既有 capability 的 delta Purpose 會被忽略。同步後必須再跑一次 `openspec validate --specs --strict`。
- `component-parameter-presets` 的 component 列舉 requirement 仍只列 `opengrid-stackable-box` 與 `card-box`；`game-box` 的列舉由哪個 task 補上，待 owner 決定（見 report.md 的待決事項）。
