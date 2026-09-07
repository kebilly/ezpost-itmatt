import { chromium, type Browser, type Page } from "playwright";
import { writeFile } from "fs/promises";
import {
  START_PAGE,
  MAIL_TYPE_BUTTONS,
  NOTICE_PAGE,
  CONTENT_TYPE_INDEX,
  CONTENT_RADIO_SELECTOR,
  DECLARATION_FORM_SELECTORS,
} from "./selectors";
import type { ItmattSubmitResult, ShipmentPayload } from "./types";

/**
 * ITMATT 非會員發遞單自動化 client。
 * 流程：開始製作 → 選郵件種類 → 注意事項同意 → 填發遞單 → 確定 → 取郵件編號 + QR。
 * 不需登入、不保管任何帳密。選擇器見 selectors.ts（2026-07 實測）。
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
    this.browser = await chromium.launch({ headless: true });
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

    // 等 colorbox 遮罩消失、發遞單表單載入，避免遮罩攔截後續點擊
    await this.waitOverlayGone();
    await page
      .waitForSelector(DECLARATION_FORM_SELECTORS.senderName, {
        state: "visible",
        timeout: 15_000,
      })
      .catch(() => {});
  }

  /** 等 colorbox 過場遮罩消失 */
  private async waitOverlayGone(): Promise<void> {
    const page = this.requirePage();
    await page
      .waitForSelector("#cboxOverlay", { state: "hidden", timeout: 15_000 })
      .catch(() => {});
  }

  /** 用 JS 依文字點擊按鈕（表單在 colorbox 內，真實 pointer 會被遮罩攔截） */
  private async jsClickButton(text: string): Promise<boolean> {
    const page = this.requirePage();
    return await page.evaluate((t: string) => {
      const btns = document.querySelectorAll("button");
      for (const b of Array.from(btns)) {
        if ((b.textContent || "").trim() === t) {
          (b as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, text);
  }

  /** 寄達國下拉：ITMATT 各國寫法不一（美國=U.S.A.），用模糊比對 + 別名對應 */
  private async selectCountry(selector: string, country: string): Promise<void> {
    const page = this.requirePage();
    const value = await page.evaluate(
      (args: { selector: string; country: string }) => {
        const el = document.querySelector(args.selector) as HTMLSelectElement | null;
        if (!el) return null;
        const re = /[^a-z0-9一-鿿]/g;
        const c = (args.country || "").toLowerCase().replace(re, "");
        const aliases: Record<string, string> = {
          unitedstates: "usa",
          unitedstatesofamerica: "usa",
          us: "usa",
          america: "usa",
          "美國": "usa",
          "美国": "usa",
          uk: "unitedkingdom",
          "英國": "unitedkingdom",
          "澳洲": "australia",
          "澳大利亞": "australia",
        };
        const ca = aliases[c] || c;
        let found: string | null = null;
        for (const o of Array.from(el.options)) {
          const nv = (o.value || "").toLowerCase().replace(re, "");
          const nt = (o.textContent || "").toLowerCase().replace(re, "");
          if (
            nv === c ||
            nv === ca ||
            nt.indexOf(c) >= 0 ||
            nt.indexOf(ca) >= 0 ||
            (c.length >= 4 && nv.indexOf(c) >= 0) ||
            (nv.length >= 3 && c.indexOf(nv) >= 0)
          ) {
            found = o.value;
            break;
          }
        }
        return found;
      },
      { selector, country }
    );
    if (!value) throw new Error(`寄達國「${country}」找不到對應的 ITMATT 選項`);
    await page.selectOption(selector, value);
    this.log(`寄達國：${country} → ${value}`);
  }

  async fillDeclarationForm(shipment: ShipmentPayload): Promise<void> {
    const page = this.requirePage();
    const s = DECLARATION_FORM_SELECTORS;

    if (shipment.contractAccount) {
      await page.fill(s.contractAccountSelector, shipment.contractAccount);
    }

    // EMS（國際快捷）需先選子類：文件(2) / 商品(3)，兩者皆無預設
    if (shipment.mailType === "EMS") {
      const sub = shipment.contentType === "DOCUMENTS" ? "2" : "3";
      await page.evaluate((v: string) => {
        const rs = document.querySelectorAll('input[name="MAIL_TYPE"]');
        for (const r of Array.from(rs)) {
          const e = r as HTMLInputElement;
          if (e.value === v) {
            e.checked = true;
            e.dispatchEvent(new Event("change", { bubbles: true }));
          }
        }
      }, sub);
    }

    // 寄件人
    await page.fill(s.senderName, shipment.sender.name);
    await page.fill(s.senderPostal, shipment.sender.postal);
    await page.fill(s.senderAddress1, shipment.sender.address1);
    await page.fill(s.senderCity, shipment.sender.city);
    await page.fill(s.senderPhone, shipment.sender.phone);

    // 收件人
    await page.fill(s.recipientName, shipment.recipient.name);
    await this.selectCountry(s.recipientCountrySelect, shipment.recipient.country);
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

    // 內裝物品：物品種類 radio 為自訂樣式（視覺隱藏），改用 JS 設值 + 觸發 change
    await this.waitOverlayGone();
    if (shipment.contentType && shipment.contentType in CONTENT_TYPE_INDEX) {
      const idx = CONTENT_TYPE_INDEX[shipment.contentType];
      await page.evaluate(
        (args: { sel: string; idx: number }) => {
          const radios = document.querySelectorAll(args.sel);
          const r = radios[args.idx] as HTMLInputElement | undefined;
          if (r) {
            r.checked = true;
            r.dispatchEvent(new Event("change", { bubbles: true }));
          }
        },
        { sel: CONTENT_RADIO_SELECTOR, idx }
      );
    }
    if (shipment.totalWeight != null) {
      await page.fill(s.totalWeightSelector, String(shipment.totalWeight));
    }
    if (shipment.lengthCm != null) await page.fill(s.lengthSelector, String(shipment.lengthCm));
    if (shipment.widthCm != null) await page.fill(s.widthSelector, String(shipment.widthCm));
    if (shipment.heightCm != null) await page.fill(s.heightSelector, String(shipment.heightCm));
    await page.selectOption(s.currencySelect, shipment.currency);

    // 物品明細（第一列已存在，其餘用「增加品項」新增）
    for (let i = 0; i < shipment.items.length; i++) {
      const item = shipment.items[i];
      if (i > 0) await this.jsClickButton("增加品項");
      await page.fill(s.itemDescription(i), item.description);
      await page.fill(s.itemQuantity(i), String(item.quantity));
      await page.fill(s.itemUnitValue(i), String(item.unitValue));
      await page.fill(s.itemWeight(i), String(item.weight));
      await page.fill(s.itemTotalValue(i), String(item.quantity * item.unitValue));
      await page.fill(s.itemOriginCountry(i), item.originCountry);
      if (item.hsCode) await page.fill(s.itemHsCode(i), item.hsCode);
    }

    this.log(`已填入寄件人、收件人與 ${shipment.items.length} 筆物品明細`);
  }

  /** 送出並取回郵件編號與交寄 QR（QR 為 data:image，解碼存成 qrImagePath） */
  async submit(qrImagePath: string): Promise<ItmattSubmitResult> {
    const page = this.requirePage();
    const s = DECLARATION_FORM_SELECTORS;

    const clicked = await this.jsClickButton("確定");
    if (!clicked) throw new Error("找不到『確定』送出按鈕");

    // 送出成功後頁面出現 data:image 的 QR
    const qrEl = await page.waitForSelector(s.qrImageSelector, { timeout: 20_000 });
    const qrSrc = (await qrEl.getAttribute("src")) ?? "";

    const bodyText = await page.evaluate(() => document.body.innerText);
    const trackingNo = bodyText.match(s.trackingNoRegex)?.[1];

    // data:image/...;base64,XXXX → 解碼存檔
    const base64 = qrSrc.includes(",") ? qrSrc.split(",")[1] : "";
    if (base64) {
      await writeFile(qrImagePath, Buffer.from(base64, "base64"));
    }

    this.log(`送出完成，郵件編號：${trackingNo ?? "未取得"}，QR 已存至 ${qrImagePath}`);
    return { success: true, trackingNo, qrImagePath, log: this.getLog() };
  }

  async close(): Promise<void> {
    await this.page?.close();
    await this.browser?.close();
    this.log("已關閉瀏覽器");
  }
}
