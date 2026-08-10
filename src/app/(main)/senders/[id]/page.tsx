import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SenderForm from "../SenderForm";

export default async function EditSenderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const sender = await prisma.senderProfile.findFirst({
    where: { id, userId: session!.user.id },
  });
  if (!sender) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">編輯寄件人</h1>
      <SenderForm initialData={sender} />
    </div>
  );
}
