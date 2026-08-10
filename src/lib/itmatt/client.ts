import { chromium, type Browser, type Page } from "playwright";
import {
  START_PAGE,
  MAIL_TYPE_BUTTONS,
  NOTICE_PAGE,
  CONTENT_TYPE_RADIOS,
  DECLARATION_FORM_SELECTORS,
} from "./selectors";
import type { ItmattSubmitResult, ShipmentPayload } from "./types";

/**
 * ITMATT 非會員發遞單自動化 client。
 * 流程：開始製作 → 選郵件種類 → 注意事項同意 → 填發遞單 → 確定 → 取條碼/QR。
 * 不需登入、不保管任何帳密。
 */
export class ItmattClient {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private logLines: string[] = [];

  private log(line: string) {
    this.logLines.push(`[${new Date().toISOString()}] ${line}`);
  }

  getLog(): string {
    return this.logLines.join("\n");
  }

  private requirePage(): Page {
    if (!this.page) throw new Error("瀏覽器尚未啟動，請先呼叫 open()");
    return this.page;
  }

  async open(): Promise<void> {
    this.browser = await chromium.launch({
      headless: process.env.NODE_ENV === "production",
    });
    this.page = await this.browser.newPage();
    this.log("已啟動瀏覽器");
  }

  /** 開始製作 → 選郵件種類 → 勾選注意事項同意 */
  async startAsGuest(mailType: string): Promise<void> {
    const page = this.requirePage();

    this.log(`前往首頁：${START_PAGE.url}`);
    await page.goto(START_PAGE.url);
    await page.click(START_PAGE.startButtonSelector);

    const mailTypeButton = MAIL_TYPE_BUTTONS[mailType];
    if (!mailTypeButton) {
      throw new Error(`尚未設定郵件類型 ${mailType} 對應的選擇按鈕`);
    }
    this.log(`選擇郵件種類：${mailType}`);
    await page.click(mailTypeButton);

    this.log("勾選注意事項同意並繼續");
    await page.check(NOTICE_PAGE.agreeCheckboxSelector);
    await page.click(NOTICE_PAGE.continueButtonSelector);
  }

  async fillDeclarationForm(shipment: ShipmentPayload): Promise<void> {
    const page = this.requirePage();
    const s = DECLARATION_FORM_SELECTORS;

    if (shipment.contractAccount) {
      await page.fill(s.contractAccountSelector, shipment.contractAccount);
    }

    // 寄件人
    await page.fill(s.senderName, shipment.sender.name);
    await page.fill(s.senderPostal, shipment.sender.postal);
    await page.fill(s.senderAddress1, shipment.sender.address1);
    await page.fill(s.senderCity, shipment.sender.city);
    await page.fill(s.senderPhone, shipment.sender.phone);

    // 收件人
    await page.fill(s.recipientName, shipment.recipient.name);
    await page.selectOption(s.recipientCountrySelect, shipment.recipient.country);
    await page.fill(s.recipientPostal, shipment.recipient.postal);
    await page.fill(s.recipientAddress1, shipment.recipient.address1);
    await page.fill(s.recipientCity, shipment.recipient.city);
    if (shipment.recipient.state) {
      await page.fill(s.recipientState, shipment.recipient.state);
    }
    await page.fill(s.recipientPhone, shipment.recipient.phone);
    if (shipment.recipient.taxId) {
      await page.fill(s.recipientTaxId, shipment.recipient.taxId);
    }

    // 內裝物品
    if (shipment.contentType) {
      const contentRadio = CONTENT_TYPE_RADIOS[shipment.contentType];
      if (contentRadio) await page.check(contentRadio);
    }
    if (shipment.totalWeight != null) {
      await page.fill(s.totalWeightSelector, String(shipment.totalWeight));
    }
    if (shipment.lengthCm != null) {
      await page.fill(s.lengthSelector, String(shipment.lengthCm));
    }
    if (shipment.widthCm != null) {
      await page.fill(s.widthSelector, String(shipment.widthCm));
    }
    if (shipment.heightCm != null) {
      await page.fill(s.heightSelector, String(shipment.heightCm));
    }
    await page.selectOption(s.currencySelect, shipment.currency);

    // 物品明細（第一列已存在，其餘用「增加品項」新增）
    for (let i = 0; i < shipment.items.length; i++) {
      const item = shipment.items[i];
      if (i > 0) await page.click(s.addItemRowButtonSelector);
      await page.fill(s.itemDescriptionSelector, item.description);
      await page.fill(s.itemQuantitySelector, String(item.quantity));
      await page.fill(s.itemUnitValueSelector, String(item.unitValue));
      await page.fill(s.itemWeightSelector, String(item.weight));
      await page.fill(s.itemOriginCountrySelector, item.originCountry);
      if (item.hsCode) {
        await page.fill(s.itemHsCodeSelector, item.hsCode);
      }
    }

    this.log(`已填入寄件人、收件人與 ${shipment.items.length} 筆物品明細`);
  }

  /** 送出並取回追蹤號碼與條碼/QR 圖檔路徑 */
  async submit(qrImagePath: string): Promise<ItmattSubmitResult> {
    const page = this.requirePage();
    const s = DECLARATION_FORM_SELECTORS;

    await page.click(s.submitButtonSelector);

    const trackingEl = await page.waitForSelector(s.trackingNoSelector, {
      timeout: 15_000,
    });
    const trackingNo = (await trackingEl.textContent())?.trim();

    const qrEl = await page.waitForSelector(s.qrImageSelector, {
      timeout: 15_000,
    });
    await qrEl.screenshot({ path: qrImagePath });

    this.log(`送出完成，追蹤號碼：${trackingNo ?? "未取得"}，QR 已存至 ${qrImagePath}`);
    return { success: true, trackingNo, qrImagePath, log: this.getLog() };
  }

  async close(): Promise<void> {
    await this.page?.close();
    await this.browser?.close();
    this.log("已關閉瀏覽器");
  }
}
