export type ShipmentItemPayload = {
  description: string;
  quantity: number;
  unitValue: number;
  weight: number;
  originCountry: string;
  hsCode: string | null;
};

export type ShipmentPayload = {
  id: string;
  mailType: string;
  contentType: string | null;
  contractAccount: string | null;
  currency: string;
  totalWeight: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  sender: {
    name: string;
    address1: string;
    city: string;
    postal: string;
    phone: string;
  };
  recipient: {
    name: string;
    address1: string;
    city: string;
    state: string | null;
    postal: string;
    country: string;
    phone: string;
    taxId: string | null;
  };
  items: ShipmentItemPayload[];
};

export type ItmattSubmitResult = {
  success: boolean;
  trackingNo?: string;
  /** 送出後從 ITMATT 抓取的條碼/QR 圖檔在本機的路徑（用於回傳 LINE） */
  qrImagePath?: string;
  log: string;
};
