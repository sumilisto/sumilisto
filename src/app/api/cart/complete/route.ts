import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { saveOrder } from "@/lib/supabase/queries";
import { Order, OrderItem } from "@/types/order";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      sessionId,
      orderCode,
      nombre,
      telefono,
      zonaEntrega,
      direccion,
      metodoPago,
      items,
      totalUsd,
      totalVes,
      tasaBcv,
    } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ error: "sessionId es requerido" }, { status: 400 });
    }

    const cleanSessionId = String(sessionId).slice(0, 100);
    const now = new Date().toISOString();

    // 1. Si viene con datos de pedido, registrar la orden para contabilidad
    if (orderCode && Array.isArray(items)) {
      const parsedTotalUsd = Number(totalUsd) || 0;
      const parsedTotalVes = Number(totalVes) || 0;
      const parsedTasa = Number(tasaBcv) || 880.12;

      // Estimación de costo de mercancía base (asumiendo ~75% del precio de venta o calculado)
      const costoMercanciaEstimado = Math.round(parsedTotalUsd * 0.75 * 100) / 100;
      const fleteRetiro = 5.0; // Base por retiro
      const embalaje = 0.5; // Embalaje unitario
      const gananciaBruta = Math.max(0, Math.round((parsedTotalUsd - costoMercanciaEstimado) * 100) / 100);
      const gananciaNeta = Math.max(0, Math.round((gananciaBruta - fleteRetiro - embalaje) * 100) / 100);

      const orderData: Order = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        codigo: String(orderCode),
        origen: "web",
        clienteNombre: String(nombre || "Cliente Web"),
        clienteTelefono: String(telefono || ""),
        zonaEntrega: String(zonaEntrega || ""),
        direccion: String(direccion || ""),
        metodoPago: String(metodoPago || "Pago Móvil / Transferencia Bs (Tasa BCV)"),
        items: items.map((i: any): OrderItem => ({
          sku: String(i.sku || ""),
          nombre: String(i.nombre || "Producto"),
          presentacion: i.presentacion ? String(i.presentacion) : undefined,
          color: i.color ? String(i.color) : undefined,
          cantidad: Number(i.cantidad) || 1,
          precioUnitarioUsd: Number(i.precioUnitarioUsd) || 0,
          subtotalUsd: Number(i.subtotalUsd) || 0,
          tarifa: i.tarifa === "gran_mayor" ? "gran_mayor" : "mayor",
        })),
        totalUsd: parsedTotalUsd,
        totalVes: parsedTotalVes,
        tasaBcv: parsedTasa,
        costoMercanciaUsd: costoMercanciaEstimado,
        gastoFleteRetiroUsd: fleteRetiro,
        gastoEmbalajeUsd: embalaje,
        gananciaBrutaUsd: gananciaBruta,
        gananciaNetaUsd: gananciaNeta,
        reparto: {
          reinversion: Math.round(gananciaNeta * 0.5 * 100) / 100,
          reserva: Math.round(gananciaNeta * 0.2 * 100) / 100,
          sueldo: Math.round(gananciaNeta * 0.2 * 100) / 100,
          ahorro: Math.round(gananciaNeta * 0.1 * 100) / 100,
        },
        estado: "pendiente",
        createdAt: now,
        updatedAt: now,
      };

      await saveOrder(orderData);
    }

    // 2. Intentar actualizar estado en tabla dedicada
    const { error: tableError } = await supabaseAdmin
      .from("carritos_abandonados")
      .update({
        estado: "completado",
        updated_at: now,
      })
      .eq("session_id", cleanSessionId);

    if (!tableError) {
      return NextResponse.json({ success: true });
    }

    // 3. Fallback: Actualizar en configuracion.data.carritos_abandonados
    const { data: configRow } = await supabaseAdmin
      .from("configuracion")
      .select("data")
      .eq("id", 1)
      .single();

    if (configRow?.data?.carritos_abandonados) {
      const carritos: any[] = configRow.data.carritos_abandonados.map((c: any) =>
        c.session_id === cleanSessionId ? { ...c, estado: "completado", updated_at: now } : c
      );

      await supabaseAdmin
        .from("configuracion")
        .update({
          data: {
            ...configRow.data,
            carritos_abandonados: carritos,
          },
        })
        .eq("id", 1);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error completando carrito:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
