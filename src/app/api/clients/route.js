import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

function capitalizeFirstLetter(string) {
  if (!string) return string;
  return string.charAt(0).toUpperCase() + string.slice(1);
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    // İsmi büyük harfe çevir
    const formattedName = capitalizeFirstLetter(data.name);

    // Aynı isimde client var mı kontrol et
    const existingClient = await prisma.client.findFirst({
      where: {
        name: {
          equals: formattedName,
          mode: 'insensitive' // büyük/küçük harf duyarsız arama
        }
      }
    });

    if (existingClient) {
      return NextResponse.json(
        { error: "A client with this name already exists" },
        { status: 400 }
      );
    }

    const newClient = await prisma.client.create({
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

    return NextResponse.json(newClient);
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Error creating client" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        emergencyContacts: true,
        invoiceMails: true
      }
    });
    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Error fetching clients" },
      { status: 500 }
    );
  }
} 