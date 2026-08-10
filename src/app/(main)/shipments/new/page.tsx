import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ShipmentForm from "../ShipmentForm";

export default async function NewShipmentPage() {
  const session = await auth();
  const [senders, contacts] = await Promise.all([
    prisma.senderProfile.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.contact.findMany({
      where: { userId: session!.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">新增寄件單</h1>
      <ShipmentForm senders={senders} contacts={contacts} />
    </div>
  );
}
