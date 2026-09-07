# ITMATT 發遞單欄位規格（非會員流程）

> 來源：中華郵政 EZPost ITMATT 官方「登打範例」PDF（實測 2026-07 / 民國115年）。
> 以**國際 e小包**為基準型；其他郵件種類（EMS/包裹/掛號函件/平常小包）欄位大致相同，差異見文末。

## 流程

```
開始製作 → 選郵件種類 → 注意事項(勾選「本人已閱讀並充分了解」) → 填發遞單 → 按「確定」→ 產生條碼/QR → 郵局交寄列印
```

- 「確定」送出後**無法修改**（畫面明示）。
- 全站欄位有**字元數上限**，逾長無法輸入。
- 所有欄位須以**英文或寄達國通用語言**登打；**中文僅限日本、香港、澳門**。

---

## 1. 郵件基本

| 欄位 | 必填 | 範例 | 說明 |
|---|---|---|---|
| 郵件種類 | ✓ | 國際e小包 | 下拉：國際快捷/包裹/e小包/掛號函件/平常小包 |
| 本公司特約戶編號 | ✗ | 106201000001 | 特約戶才填：簽約局郵務局號(6碼)+特約戶號碼(6碼) |

## 2. 寄件人資料（Sender）

| 欄位 | 必填 | 範例 | 對應 schema |
|---|---|---|---|
| 寄件人姓名 | ✓ | Amia Teng | `SenderProfile.name` |
| 寄件人郵遞區號 | ✓ | 106409 | `SenderProfile.postal` |
| 寄件人地址 | ✓ | 55, Sec.2, Jinshan S. Rd., Da'an Dist. | `SenderProfile.address1` |
| 寄件人地址(縣市) | ✓ | Taipei | `SenderProfile.city` |
| 寄件人連絡電話 | ✓(建議) | 0981480961 | `SenderProfile.phone`（手機優先，供出口簡訊通知） |

> 寄件人國別固定為台灣(TW)。`address2` ITMATT 未使用。

## 3. 收件人資料（Recipient）

| 欄位 | 必填 | 範例 | 對應 schema |
|---|---|---|---|
| 收件人姓名 | ✓ | Amy | `Contact.name` |
| 寄達國 | ✓ | Australia | `Contact.country`（下拉，需國名對應） |
| 收件人郵遞區號 | ✓ | 2646 | `Contact.postal`（寄香港統一填 000） |
| 收件人地址(第一欄) | ✓ | 29 Green Swamp Road | `Contact.address1`（除城市/州省外全填此欄） |
| 收件人地址-城市 | ✓ | Nyora | `Contact.city` |
| 收件人地址-州/省/地區 | ✓ | New South Wales | ⚠️ **schema 缺**（暫可用 `address2`，建議新增 `state`） |
| 收件人連絡電話 | 寄歐盟必填 | 795739265 | `Contact.phone` |
| 稅務識別碼 | ✗ | (IOSS/VAT) | ⚠️ **schema 缺**，建議新增 `taxId` |

## 4. 內裝物品（Package，每筆一件）

| 欄位 | 必填 | 範例 | 對應 schema |
|---|---|---|---|
| 物品種類 | ✓ | 禮品 | ⚠️ **schema 缺** `contentType`：禮品/文件/銷售物品/商業貨樣/退貨/其他 |
| 總重量(公斤)(含箱袋重, 小數3位) | ✓ | 0.5 | `Shipment.totalWeight`（須 ≥ 各內容物重量加總） |
| 郵件尺寸-長度(公分, 小數1位) | ✓ | 25 | ⚠️ **schema 缺** `lengthCm` |
| 郵件尺寸-寬度(公分, 小數1位) | ✓ | 20 | ⚠️ **schema 缺** `widthCm` |
| 郵件尺寸-高度(公分, 小數1位) | ✓ | 10 | ⚠️ **schema 缺** `heightCm` |
| 體積重量(公斤) | 自動 | 0.000 | 系統計算，不需存 |
| 幣別 | ✓ | TWD | `Shipment.currency`（內容物總值最多7位數） |

## 5. 物品明細（Item，可多筆「增加品項」）

| 欄位 | 必填 | 範例 | 對應 schema |
|---|---|---|---|
| 內容物 | ✓ | skirts | `ShipmentItem.description`（須分類，勿籠統） |
| 數量 | ✓ | 2 | `ShipmentItem.quantity` |
| 單價 | ✓ | 500 | `ShipmentItem.unitValue` |
| 內容物重量(公斤, 小數3位) | ✓ | 0.5 | `ShipmentItem.weight` |
| 總價值 | 自動 | 1000 | 數量×單價，可不存 |
| 稅則號數(HS code) | ✗ | | `ShipmentItem.hsCode` |
| 原產國 | ✓ | TW | `ShipmentItem.originCountry` |

---

## e小包限制（驗證用）

- 每件重量 ≤ 2 公斤
- 單邊最長 ≤ 60 公分；長+寬+高 ≤ 90 公分；最小 14×9 公分
- 內容物總價值逾 USD 5,000（約 NT$15萬）須至郵局以報關郵件交寄
- 寄美國：「原產國」為必填

## 各郵件種類差異（待補）

e小包為基準。EMS(快捷)、包裹、掛號函件、平常小包的差異欄位（如保價金額、內容說明）尚未逐一比對，需要時再渲染對應「登打範例」PDF 補上。

## Schema 落差摘要

✅ 已新增（2026-07，additive，不破壞既有程式）：
- `Contact.state`（收件人州/省/地區）、`Contact.taxId`（稅務識別碼）
- `Shipment.contentType`（`ContentCategory` enum：GIFT/DOCUMENTS/SALE_GOODS/COMMERCIAL_SAMPLE/RETURNED_GOODS/OTHER）
- `Shipment.lengthCm/widthCm/heightCm`（郵件尺寸）
- `Shipment.contractAccount`（特約戶編號，選填）
- `Shipment.qrImagePath`（存回傳 LINE 的條碼/QR 圖）

✅ 已移除（精簡 scaffold，走非會員免登入）：
- `ItmattCredential` model + `User.itmattCredential` 關聯（table 已 drop）
- `src/lib/crypto.ts`、`/settings/itmatt-account` 頁與 API、導覽連結、`proxy.ts` 的 `/settings` 保護路徑、`.env` 的 `CREDENTIAL_ENC_KEY`
- `src/lib/itmatt/{types,selectors,client,runner}.ts` 已改寫為非會員流程（開始製作→選種類→注意事項同意→填單→確定→取 QR 存 `public/qr/{id}.png`）
- ✅ **選擇器已實測**（2026-07 對照線上 DOM）：欄位 id 見 `selectors.ts`；QR 為送出後頁面的 `img[src^='data:image']`（base64 解碼存檔）、郵件編號以 regex 從 body 擷取。實測產出真實交寄單 `LX806576725TW`，QR 樣本存於 `docs/demo/`

✅ 新欄位已接上 CRUD 表單/API（2026-07，端到端驗證通過）：
- 收件人表單：州/省/地區(state)、稅務識別碼(taxId)
- 寄件單表單：物品種類(contentType 下拉)、特約戶編號、長/寬/高尺寸
- POST/PUT API 皆已收這些欄位；實測存 DB 正確（含非預設下拉值 SALE_GOODS）
