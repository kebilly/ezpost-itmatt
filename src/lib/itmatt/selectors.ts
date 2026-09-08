/**
 * ITMATT 頁面選擇器設定（非會員免登入流程）。
 *
 * 流程：開始製作 → 選郵件種類 → 注意事項(勾選同意「確認」) → 填發遞單 → 「確定」→ 產生郵件編號 + QR。
 *
 * 選擇器已於 2026-07 對照 https://ezpost.post.gov.tw/itmatt/ 線上 DOM 實測取得（以國際 e小包驗證）。
 * 欄位語意與必填規則見 docs/itmatt-fields.md。
 *
 * 地址欄位對應有玄機（實測）：
 *   寄件人：address1 → #txtSEADD_OTHER2（街道門牌）、city → #txtSEADD_OTHER1（縣市）
 *   收件人：address1 → #txtREADD_OTHER3（完整地址）、city → #txtREADD_OTHER2、state → #txtREADD_OTHER1
 *   寄達國 #selectREADD_COUNTRY 的 option value 為國名英文字串（例："Australia"）。
 */

export const BASE_URL =
  process.env.ITMATT_BASE_URL ?? "https://ezpost.post.gov.tw/itmatt/";

/** 首頁「開始製作」入口（頁面有兩顆同名按鈕，取第一顆） */
export const START_PAGE = {
  url: BASE_URL,
  startButtonSelector: "text=開始製作",
};

/** 郵件種類選擇（對應 MailType enum）— 以按鈕文字定位 */
export const MAIL_TYPE_BUTTONS: Record<string, string> = {
  EMS: "button:has-text('國際快捷郵件')",
  PARCEL: "button:has-text('國際包裹')",
  E_PACKET: "button:has-text('國際e小包')",
  REGISTERED_SMALL_PACKET: "button:has-text('國際掛號函件')",
  SMALL_PACKET: "button:has-text('國際平常小包')",
};

/** 注意事項同意頁 */
export const NOTICE_PAGE = {
  agreeCheckboxSelector: "#cbUnderstand",
  continueButtonSelector: "#btnGOTO_zh",
};

/** 物品種類 radio（對應 ContentCategory enum）— input[name=CONTENTS] 依序 */
export const CONTENT_TYPE_INDEX: Record<string, number> = {
  GIFT: 0,
  DOCUMENTS: 1,
  SALE_GOODS: 2,
  COMMERCIAL_SAMPLE: 3,
  RETURNED_GOODS: 4,
  OTHER: 5,
};
export const CONTENT_RADIO_SELECTOR = "input[name=CONTENTS]";

export const DECLARATION_FORM_SELECTORS = {
  // 郵件基本
  contractAccountSelector: "#txtCONTRACT_NO",

  // 寄件人
  senderName: "#txtSENAME",
  senderPostal: "#txtSEADD_ZIP",
  senderAddress1: "#txtSEADD_OTHER2", // 街道門牌
  senderCity: "#txtSEADD_OTHER1", // 縣市
  senderPhone: "#txtSPHONE",

  // 收件人
  recipientName: "#txtRENAME",
  recipientCountrySelect: "#selectREADD_COUNTRY", // option value = 國名英文
  recipientPostal: "#txtREADD_ZIP",
  recipientAddress1: "#txtREADD_OTHER3", // 完整地址（除城市/州省）
  recipientCity: "#txtREADD_OTHER2",
  recipientState: "#txtREADD_OTHER1", // 州/省/地區
  recipientPhone: "#txtRPHONE",
  recipientTaxId: "#txtRTAXID_NO",

  // 內裝物品
  totalWeightSelector: "#textWEIGHT_TOTAL",
  lengthSelector: "#textDEPTH",
  widthSelector: "#textWIDTH",
  heightSelector: "#textHEIGHT",
  currencySelect: "#selectITEM_CURRENCY",

  // 物品明細（第 n 列 id 尾碼為索引，第一列為 _0）
  itemDescription: (i: number) => `#ITEM_DESCRIPTION_${i}`,
  itemQuantity: (i: number) => `#ITEM_QUANITITY_${i}`, // 官方 id 拼字即為 QUANITITY
  itemUnitValue: (i: number) => `#ITEM_PRICE_${i}`,
  itemWeight: (i: number) => `#ITEM_WEIGHT_${i}`,
  itemTotalValue: (i: number) => `#ITEM_VALUE_${i}`,
  itemHsCode: (i: number) => `#ITEM_HSTANIFF_NUMBER_${i}`,
  itemOriginCountry: (i: number) => `#ITEM_OCOUNTRY_${i}`,
  addItemButtonSelector: "button:has-text('增加品項')",

  // 送出（「確定」，送出後不可修改）
  submitButtonSelector: "button:has-text('確定')",

  // 送出成功後：body 內含「郵件編號：XXXXXXXXXXTW」，QR 為 data:image 的 <img>
  trackingNoRegex: /郵件編號[：:]\s*([A-Z0-9]+)/,
  qrImageSelector: "img[src^='data:image']",
};
