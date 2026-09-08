import { copyFile, mkdir } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { pushImage, pushMessages } from "@/lib/line/client";
import { runItmattSubmission } from "@/lib/itmatt/runner";

/**
 * 對話完成後：產生（或抓取）交寄 QR，並推回 LINE 客人。
 *
 * ITMATT_SUBMIT_MODE:
 *   "live" → 用 Playwright 真的送中華郵政、抓真實 QR（會建立真實記錄；需先 `npx playwright install chromium`）
 *   "test"（預設）→ 回傳示範 QR（docs/demo 的實測樣本），不碰中華郵政，安全 demo 用
 *
 * QR 圖存到 public/qr/{id}.png，透過 PUBLIC_BASE_URL 對外供 LINE 抓取。
 */
const MODE = process.env.ITMATT_SUBMIT_MODE ?? "test";
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL ?? "").replace(/\/$/, "");
const SAMPLE_QR = path.join(process.cwd(), "docs", "demo", "itmatt-qr-LX806576725TW.png");

export async function fulfillAndNotify(shipmentId: string): Promise<void> {
  const shipment = await prisma.shipment.findUnique({ where: { id: shipmentId } });
  if (!shipment?.lineUserId) return;
  const lineUserId = shipment.lineUserId;

  try {
    let qrPublicPath = "";

    if (MODE === "live") {
      await runItmattSubmission(shipmentId, shipment.userId); // 真送，內部會寫 public/qr/{id}.png
      const updated = await prisma.shipment.findUnique({ where: { id: shipmentId } });
      qrPublicPath = updated?.qrImagePath ?? "";
    } else {
      // test 模式：複製實測樣本 QR 當作結果
      const qrDir = path.join(process.cwd(), "public", "qr");
      await mkdir(qrDir, { recursive: true });
      await copyFile(SAMPLE_QR, path.join(qrDir, `${shipmentId}.png`));
      qrPublicPath = `/qr/${shipmentId}.png`;
      await prisma.shipment.update({
        where: { id: shipmentId },
        data: { status: "SUBMITTED", qrImagePath: qrPublicPath, itmattTrackingNo: "TEST-DEMO" },
      });
    }

    if (!qrPublicPath) {
      await pushMessages(lineUserId, [{ text: "產生交寄單失敗，請稍後再試或聯繫商家。" }]);
      return;
    }
    if (!PUBLIC_BASE_URL) {
      await pushMessages(lineUserId, [
        { text: "交寄單已建立，但系統尚未設定對外圖片網址（PUBLIC_BASE_URL），暫時無法推送 QR。" },
      ]);
      return;
    }

    await pushMessages(lineUserId, [
      {
        text:
          `交寄單完成！${MODE !== "live" ? "（測試模式：下方為示範 QR）" : ""}\n` +
          `請到郵局掃描此 QR 列印交寄。`,
      },
    ]);
    await pushImage(lineUserId, `${PUBLIC_BASE_URL}${qrPublicPath}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("fulfill error:", msg);
    await pushMessages(lineUserId, [{ text: `送件失敗：${msg}` }]).catch(() => {});
    await prisma.shipment
      .update({ where: { id: shipmentId }, data: { status: "FAILED", submissionLog: msg } })
      .catch(() => {});
  }
}
