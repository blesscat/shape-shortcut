# Design — cad-chooser-system-switcher

## Decisions

1. **切換器**：膠囊 `seg`（Desk／Wall／HSW 三鈕，`aria-pressed` 標記現用）。
   三個面板一律由 server 靜態渲染；inline JS 依按鈕狀態對非現用面板加
   `hidden`。無 JS 時不加 `hidden`，三面板堆疊可見（漸進增強；模型卡 DOM
   與 href 不受切換影響）。預設現用系統＝Desk。
2. **版型映射**：`partCategory` → 版型。`base`＝薄荷 hero 橫條（84px 縮圖、
   selection label 標題、一句話描述 clamp、右側「基礎」綠字章）；`container`
   ＝大圖卡（圖上 8/5、徽章疊圖左上、zh 大字＋en 小字、system 標籤、
   Details／編輯列）；`accessory`／`tool`／`test`＝收合區內橫列（64px 縮圖、
   標題、描述 clamp、徽章、Details／編輯靠右）。selection label 仍是唯一
   heading 文字（per-model e2e 以 exact name 查詢）。
3. **空隱藏**：面板內的 base／containers／tools 區若為空則整區不渲染
   （HSW 面板只有容器區）。
4. **文案**（zh-Hant；en 另配同語氣）：面板頭「先挑容器／工具在下面等你」、
   容器區標籤「容器／真的拿來裝東西的」、工具區提示「小幫手，不裝東西」、
   收合預覽「組裝小工具和定位柱、分隔牆這些配件收在這區，需要再展開。」、
   展開／收合切換文字以雙 span 純 CSS 交換。
5. **Token 對應**：`--ss-mint`→`bg-success-soft`＋`text-success`、
   `--ss-coral-tint`→`bg-primary-soft`＋`text-primary-hover(dark:primary)`、
   面板＝`rounded-2xl border-border bg-card`。分類徽章雙編碼不變。
