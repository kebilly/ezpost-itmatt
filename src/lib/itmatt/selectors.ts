/**
 * ITMATT 頁面選擇器設定（非會員免登入流程）
 *
 * 流程：開始製作 → 選郵件種類 → 注意事項(勾選同意) → 填發遞單 → 確定 → 產生條碼/QR
 *
 * TODO: 以下多為佔位選擇器，待實際對照 https://ezpost.post.gov.tw/itmatt/ 線上 DOM
 * 後替換為真實值。client.ts 只依賴這裡匯出的設定，更新選擇器時不需改動流程邏輯。
 * 欄位語意與必填規則見 docs/itmatt-fields.md。
 */

export const BASE_URL =
  process.env.ITMATT_BASE_URL ?? "https://ezpost.post.gov.tw/itmatt/";

/** 首頁「開始製作」入口 */
export const START_PAGE = {
  url: BASE_URL,
  // TODO: 「開始製作」按鈕（國際郵件發遞單製作）
  startButtonSelector: "#TODO-start-make",
};

/** 郵件種類選擇（對應 MailType enum） */
export const MAIL_TYPE_BUTTONS: Record<string, string> = {
  EMS: "#TODO-mailtype-ems",
  PARCEL: "#TODO-mailtype-parcel",
  E_PACKET: "#TODO-mailtype-epacket",
  REGISTERED_SMALL_PACKET: "#TODO-mailtype-registered",
  SMALL_PACKET: "#TODO-mailtype-packet",
};

/** 注意事項同意頁 */
export const NOTICE_PAGE = {
  // 「本人已閱讀並充分了解上述告知內容」勾選框
  agreeCheckboxSelector: "#TODO-notice-agree",
  continueButtonSelector: "#TODO-notice-continue",
};

/** 物品種類 radio（對應 ContentCategory enum） */
export const CONTENT_TYPE_RADIOS: Record<string, string> = {
  GIFT: "#TODO-content-gift",
  DOCUMENTS: "#TODO-content-documents",
  SALE_GOODS: "#TODO-content-sale",
  COMMERCIAL_SAMPLE: "#TODO-content-sample",
  RETURNED_GOODS: "#TODO-content-returned",
  OTHER: "#TODO-content-other",
};

export const DECLARATION_FORM_SELECTORS = {
  // 郵件基本
  contractAccountSelector: "#TODO-contract-account",

  // 寄件人
  senderName: "#TODO-sender-name",
  senderPostal: "#TODO-sender-postal",
  senderAddress1: "#TODO-sender-address1",
  senderCity: "#TODO-sender-city",
  senderPhone: "#TODO-sender-phone",

  // 收件人
  recipientName: "#TODO-recipient-name",
  recipientCountrySelect: "#TODO-recipient-country", // 寄達國下拉
  recipientPostal: "#TODO-recipient-postal",
  recipientAddress1: "#TODO-recipient-address1",
  recipientCity: "#TODO-recipient-city",
  recipientState: "#TODO-recipient-state", // 州/省/地區
  recipientPhone: "#TODO-recipient-phone",
  recipientTaxId: "#TODO-recipient-taxid",

  // 內裝物品
  totalWeightSelector: "#TODO-total-weight",
  lengthSelector: "#TODO-dim-length",
  widthSelector: "#TODO-dim-width",
  heightSelector: "#TODO-dim-height",
  currencySelect: "#TODO-currency",

  // 物品明細（多列）
  itemDescriptionSelector: "#TODO-item-description",
  itemQuantitySelector: "#TODO-item-quantity",
  itemUnitValueSelector: "#TODO-item-unit-value",
  itemWeightSelector: "#TODO-item-weight",
  itemHsCodeSelector: "#TODO-item-hs-code",
  itemOriginCountrySelector: "#TODO-item-origin-country",
  addItemRowButtonSelector: "#TODO-add-item-row",

  // 送出（「確定」，送出後不可修改）
  submitButtonSelector: "#TODO-declaration-submit",

  // 送出成功後
  trackingNoSelector: "#TODO-tracking-no",
  qrImageSelector: "#TODO-qr-image", // 條碼/QR 圖，供截圖存檔回傳 LINE
};
