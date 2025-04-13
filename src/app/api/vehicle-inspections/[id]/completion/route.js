import prisma from "@/lib/prisma";

export async function PATCH(request, { params }) {
  try {
    const { status } = await request.json();
    const { id } = params;

    const updatedInspection = await prisma.vehicleInspection.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    return Response.json(updatedInspection);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 