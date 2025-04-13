import prisma from "@/lib/prisma";

export async function PATCH(request, { params }) {
  try {
    const { status } = await request.json();
    const { id } = params;

    const updatedMaintenance = await prisma.vehicleMaintenance.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    return Response.json(updatedMaintenance);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
} 