# 後續設計與操作改進

本次完成配色、品牌、公開頁與工作區呈現更新；下列是獨立 change 的規劃，尚未實作。

| 批次/優先 | 建議獨立 change | Scope 與前置 | 驗收重點/owner |
|---|---|---|---|
| R1/P1 | cad-committed-size-summary | 顯示 committed XYZ 外部 bounds；依本次狀態與 panel 穩定。內部可用尺寸另做模型 definition inventory | stale 顯示上一版標記，provisional 不當精準值；與既有 bounds annotation 同源；C |
| R1/P1 | cad-parameter-state-summary | 收合區摘要、修改標記、browser-only saved wording；盤點現有單項 reset/boolean 例外及有效/草稿差異 | invalid draft 不被誤稱已保存；collapse 不藏 errors；parameter reset 不改 palette；C+B copy |
| R1/P1 | cad-explicit-view-controls | 分開 fit-to-view 與 reset-view；先定義 fit 保留角度、reset 範圍與 camera ownership | 任意 pan/zoom 可找回模型；不改幾何；手機 resize 不自動觸發 reset；C |
| R1/P2 | model-preset-guidance | 盤點各模型既有 preset；用途名稱、套用前影響說明，不先新增小中大 | 精確列出覆寫值與保存行為、缺省/invalid inputs相容；不新增未驗證物理參數；B+C |
| R2/P1 | cad-undo-history | 先定義一次 gesture/文字輸入如何形成 transaction、預設/重設/scene edits 是否納入、history 上限 | undo/redo 走既有 validation/latest-wins，無舊 worker 覆蓋、無副作用匯出；C |
| R2/P2 | share-model-settings | 先定義 schema version、allowlist、URL 長度、與 saved state 優先順序、是否分享 palette。預設先評估純 client，不引入服務 | malformed/舊版/unsupported model 安全失敗；開連結前可理解將套用什麼；不分享任意文字/本機資料；C+主 agent |
| R2/P3 | recent-models | 僅 browser-local model ID/system context，先驗證 catalog 增長是否真的需要 | storage 損壞可用、移除模型過濾、不當成帳號同步、可清除；B |

R1 可在本次穩定後提案；size-summary 與 view-controls 可並行，state-summary 先於 undo；preset guidance 先釐清 overwrite，再納入 undo。分享先有獨立 precedence/security review，recent 無需等分享。每個後續 change 都需自己的 proposal/spec/tasks，本文件只是有依賴的規劃，不表示已授權實作。

所有先前建議對照：本次涵蓋配色/favicon/字體/radius/nav/卡片/圖片/密度/用語/長字/載入/現有help/狀態/分組/下載說明；R1 承接尺寸/變更與收合摘要/找回模型/preset用途；R2 承接 undo/share/recent。沒有默默丟棄項目。


## 手機分區後續

本次候選分區未通過發布 gate，CAD 與 Playground 同時保留透明 overlay。下次先解決短螢幕與進度區遮擋，再執行完整狀態矩陣及真實手機 keyboard、touch、orientation 驗證，不能以桌面模擬代替。
