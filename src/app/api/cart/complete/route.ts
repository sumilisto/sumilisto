import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { saveOrder } from "@/lib/supabase/queries";
import { Order, OrderItem } from "@/types/order";
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimit";

export async function POST(req: Request) {
  try {
    // Blindaje contra ataques de saturación / spam de órdenes: máximo 10 pedidos completados por minuto por IP
    const clientIp = getClientIp(req);
    const rateCheck = checkRateLimit(`cart_complete:${clientIp}`, 10, 60 * 1000);
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: "Demasiadas peticiones. Intenta de nuevo en un minuto." },
        { status: 429 }
      );
    }

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
      const parsedTotalUsd = Math.max(0, Math.min(Number(totalUsd) || 0, 50000));
      const parsedTotalVes = Math.max(0, Math.min(Number(totalVes) || 0, 100000000));
      const parsedTasa = Math.max(1, Math.min(Number(tasaBcv) || 880.12, 1000000));

      // Estimación de costo de mercancía base (asumiendo ~75% del precio de venta o calculado)
      const costoMercanciaEstimado = Math.round(parsedTotalUsd * 0.75 * 100) / 100;
      const fleteRetiro = 5.0; // Base por retiro
      const embalaje = 0.5; // Embalaje unitario
      const gananciaBruta = Math.max(0, Math.round((parsedTotalUsd - costoMercanciaEstimado) * 100) / 100);
      const gananciaNeta = Math.max(0, Math.round((gananciaBruta - fleteRetiro - embalaje) * 100) / 100);

      // Sanitizar items limitando a máximo 50 items
      const safeItems: OrderItem[] = items.slice(0, 50).map((i: any): OrderItem => ({
        sku: String(i.sku || "").slice(0, 50),
        nombre: String(i.nombre || "Producto").slice(0, 100),
        presentacion: i.presentacion ? String(i.presentacion).slice(0, 50) : undefined,
        color: i.color ? String(i.color).slice(0, 50) : undefined,
        cantidad: Math.max(1, Math.min(Number(i.cantidad) || 1, 10000)),
        precioUnitarioUsd: Math.max(0, Math.min(Number(i.precioUnitarioUsd) || 0, 10000)),
        subtotalUsd: Math.max(0, Math.min(Number(i.subtotalUsd) || 0, 50000)),
        tarifa: i.tarifa === "gran_mayor" ? "gran_mayor" : "mayor",
      }));

      const orderData: Order = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        codigo: String(orderCode).slice(0, 20),
        origen: "web",
        clienteNombre: String(nombre || "Cliente Web").slice(0, 100),
        clienteTelefono: String(telefono || "").slice(0, 50),
        zonaEntrega: String(zonaEntrega || "").slice(0, 100),
        direccion: String(direccion || "").slice(0, 255),
        metodoPago: String(metodoPago || "Pago Móvil / Transferencia Bs (Tasa BCV)").slice(0, 100),
        items: safeItems,
        totalUsd: parsedTotalUsd,
        totalVes: parsedTotalVes,
        tasaBcv: parsedTasa,
        costoMercanciaUsd: costoMercanciaEstimado,
        gastoFleteRetiroUsd: fleteRetiro,
        gastoEmbalajeUsd: embalaje,
        conIva: false,
        ivaMontoUsd: 0,
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
