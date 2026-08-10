import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ContactForm from "../ContactForm";

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const contact = await prisma.contact.findFirst({
    where: { id, userId: session!.user.id },
  });
  if (!contact) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">編輯收件人</h1>
      <ContactForm initialData={contact} />
    </div>
  );
}
