import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

function capitalizeFirstLetter(string) {
  if (!string) return string;
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Status değişikliği mi kontrol et
    if (data.hasOwnProperty('isActive')) {
      const updatedClient = await prisma.client.update({
        where: { id: parseInt(id) },
        data: { isActive: data.isActive }
      });
      return NextResponse.json(updatedClient);
    }

    // İsmi büyük harfe çevir
    const formattedName = capitalizeFirstLetter(data.name);

    // Aynı isimde ve farklı ID'ye sahip client var mı kontrol et
    const existingClient = await prisma.client.findFirst({
      where: {
        AND: [
          { name: { equals: formattedName, mode: 'insensitive' } },
          { id: { not: parseInt(id) } }
        ]
      }
    });

    if (existingClient) {
      return NextResponse.json(
        { error: "A client with this name already exists" },
        { status: 400 }
      );
    }

    // Önce mevcut ilişkili verileri sil
    await prisma.emergencyContact.deleteMany({
      where: { clientId: parseInt(id) }
    });

    await prisma.invoiceMail.deleteMany({
      where: { clientId: parseInt(id) }
    });

    const updatedClient = await prisma.client.update({
      where: { id: parseInt(id) },
      data: {
        name: formattedName,
        address: data.address || null,
        vatNumber: data.vatNumber || null,
        emergencyContacts: {
          create: data.emergencyContacts?.map(contact => ({
            name: contact.name || null,
            phoneNumber: contact.phoneNumber || null
          })) || []
        },
        invoiceMails: {
          create: data.invoiceMails?.map(mail => ({
            email: mail.email || null
          })) || []
        }
      },
      include: {
        emergencyContacts: true,
        invoiceMails: true
      }
    });

    return NextResponse.json(updatedClient);
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: error.message || "Error updating client" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const deletedClient = await prisma.client.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: "Client başarıyla silindi" });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Error deleting client" },
      { status: 500 }
    );
  }
} 