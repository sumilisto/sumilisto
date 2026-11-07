import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { getOrders, saveOrder, updateOrder, updateOrderStatus, deleteOrder, getAllProductsAdmin } from "@/lib/supabase/queries";
import { generateOrderCode } from "@/lib/orders/orderCode";
import { Order, OrderItem, OrderStatus } from "@/types/order";
import { formatUsd, formatVes, calculateVesTotal } from "@/lib/currency/format";

// GET /api/orders — Listar todos los pedidos (admin)
export async function GET() {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const orders = await getOrders();
    return NextResponse.json({ ok: true, orders });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// POST /api/orders — Registrar un pedido manual desde el panel
export async function POST(req: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      clienteNombre,
      clienteTelefono,
      zonaEntrega,
      direccion,
      metodoPago,
      notas,
      items,
      gastoFleteRetiroUsd,
      gastoEmbalajeUsd,
      tasaBcv,
    } = body;

    if (!clienteNombre || !clienteTelefono || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Nombre, teléfono y al menos un producto son obligatorios" },
        { status: 400 }
      );
    }

    // Traer productos para calcular costos reales
    const allProducts = await getAllProductsAdmin();
    const parsedTasa = Number(tasaBcv) || 880.12;

    // Calcular montos y costos exactos
    let totalUsd = 0;
    let costoMercanciaTotal = 0;

    const formattedItems: OrderItem[] = items.map((it: any) => {
      const prod = allProducts.find((p) => p.sku === it.sku || p.id === it.productoId);
      const variant = (prod?.variantes || []).find((v) => v.sku === it.sku || v.color === it.color);

      const cantidad = Number(it.cantidad) || 1;
      const tarifa = it.tarifa === "gran_mayor" ? "gran_mayor" : "mayor";

      const unidadesPorPaquete = tarifa === "gran_mayor"
        ? (variant?.minGranMayor || prod?.minGranMayor || 100)
        : (variant?.minMayor || prod?.minMayor || 50);

      const precioPaquete = tarifa === "gran_mayor"
        ? (variant?.precioGranMayorUsd || prod?.precioGranMayorUsd || Number(it.precioPaquete) || 0)
        : (variant?.precioMayorUsd || prod?.precioMayorUsd || Number(it.precioPaquete) || 0);

      const costoPaquete = tarifa === "gran_mayor"
        ? (variant?.costoGranMayorUsd || prod?.costoGranMayorUsd || Number(it.costoPaquete) || precioPaquete * 0.75)
        : (variant?.costoMayorUsd || prod?.costoMayorUsd || Number(it.costoPaquete) || precioPaquete * 0.75);

      const paquetes = cantidad / unidadesPorPaquete;
      const subtotal = it.subtotalUsd !== undefined ? Number(it.subtotalUsd) : Math.round(precioPaquete * paquetes * 100) / 100;
      const costoTotalItem = it.costoTotalUsd !== undefined ? Number(it.costoTotalUsd) : Math.round(costoPaquete * paquetes * 100) / 100;

      totalUsd += subtotal;
      costoMercanciaTotal += costoTotalItem;

      return {
        sku: String(it.sku || prod?.sku || "SKU"),
        nombre: String(it.nombre || prod?.nombre || "Producto"),
        presentacion: it.presentacion ? String(it.presentacion) : undefined,
        color: it.color ? String(it.color) : undefined,
        cantidad,
        precioUnitarioUsd: precioPaquete,
        costoUnitarioUsd: costoPaquete,
        subtotalUsd: subtotal,
        tarifa,
      };
    });

    totalUsd = Math.round(totalUsd * 100) / 100;
    costoMercanciaTotal = Math.round(costoMercanciaTotal * 100) / 100;

    const fleteRetiro = gastoFleteRetiroUsd !== undefined ? Number(gastoFleteRetiroUsd) : 5.0;
    const embalaje = gastoEmbalajeUsd !== undefined ? Number(gastoEmbalajeUsd) : 0.5;

    const gananciaBruta = Math.max(0, Math.round((totalUsd - costoMercanciaTotal) * 100) / 100);
    const gananciaNeta = Math.max(0, Math.round((gananciaBruta - fleteRetiro - embalaje) * 100) / 100);

    const totalVes = calculateVesTotal(totalUsd, parsedTasa);
    // Obtener pedidos existentes para garantizar que el código de 4 dígitos no se repita
    const existingOrders = await getOrders();
    const existingCodes = existingOrders.map((o) => o.codigo);
    const orderCode = generateOrderCode(existingCodes); // #SUMI-XXXX de 4 dígitos no correlativos garantizado único
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      codigo: orderCode,
      origen: "manual",
      clienteNombre: String(clienteNombre).trim(),
      clienteTelefono: String(clienteTelefono).trim(),
      zonaEntrega: String(zonaEntrega || "").trim(),
      direccion: String(direccion || "").trim(),
      metodoPago: String(metodoPago || "Pago Móvil / Transferencia Bs (Tasa BCV)").trim(),
      notas: notas ? String(notas).trim() : undefined,
      items: formattedItems,
      totalUsd,
      totalVes,
      tasaBcv: parsedTasa,
      costoMercanciaUsd: costoMercanciaTotal,
      gastoFleteRetiroUsd: fleteRetiro,
      gastoEmbalajeUsd: embalaje,
      gananciaBrutaUsd: gananciaBruta,
      gananciaNetaUsd: gananciaNeta,
      reparto: {
        reinversion: Math.round(gananciaNeta * 0.5 * 100) / 100, // 50%
        reserva: Math.round(gananciaNeta * 0.2 * 100) / 100, // 20%
        sueldo: Math.round(gananciaNeta * 0.2 * 100) / 100, // 20%
        ahorro: Math.round(gananciaNeta * 0.1 * 100) / 100, // 10%
      },
      estado: "pendiente",
      createdAt: now,
      updatedAt: now,
    };

    const saved = await saveOrder(newOrder);
    if (!saved) {
      return NextResponse.json({ error: "No se pudo guardar el pedido" }, { status: 500 });
    }

    // Preparar el texto estructurado de WhatsApp para enviar al cliente
    const tasaBcvStr = parsedTasa.toLocaleString("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    let whatsappText = `_*SUMILISTO*_\n`;
    whatsappText += `Resumen de su pedido *${orderCode}*\n\n`;
    whatsappText += `Cliente: _*${newOrder.clienteNombre}*_\n`;
    whatsappText += `Teléfono: ${newOrder.clienteTelefono}\n`;
    if (newOrder.zonaEntrega) whatsappText += `Zona: ${newOrder.zonaEntrega}\n`;
    if (newOrder.direccion) whatsappText += `Dirección: ${newOrder.direccion}\n`;
    whatsappText += `Método de Pago Acordado: ${newOrder.metodoPago}\n`;
    if (newOrder.notas) whatsappText += `Observaciones: ${newOrder.notas}\n`;

    whatsappText += `\nDETALLES DE ARTÍCULOS:\n`;
    newOrder.items.forEach((it, idx) => {
      const tarifaDesc = it.tarifa === "gran_mayor" ? "Gran Mayor" : "Mayor";
      const pres = it.presentacion
        ? ` (${it.presentacion})`
        : it.color
        ? ` (${it.color})`
        : "";
      whatsappText += `${idx + 1}. ${it.nombre}${pres} - _*${it.cantidad} unds (${tarifaDesc}) = ${formatUsd(it.subtotalUsd)}*_\n`;
    });

    whatsappText += `\nTotal a pagar (BCV ${tasaBcvStr}): _*${formatUsd(totalUsd)} = ${formatVes(totalVes)}*_\n\n`;
    whatsappText += `_Gracias por preferir a *Sumilisto* para tus suministros mayoristas._\n`;
    whatsappText += `_*¡Feliz día!*_`;

    // Normalizar número telefónico del cliente para abrir su chat de WhatsApp
    let rawPhone = newOrder.clienteTelefono.replace(/[^0-9]/g, "");
    if (rawPhone.startsWith("0")) {
      rawPhone = "58" + rawPhone.slice(1);
    } else if (!rawPhone.startsWith("58") && rawPhone.length === 10) {
      rawPhone = "58" + rawPhone;
    }

    const whatsappUrl = `https://wa.me/${rawPhone}?text=${encodeURIComponent(whatsappText)}`;

    return NextResponse.json({
      ok: true,
      order: newOrder,
      whatsappText,
      whatsappUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// PATCH /api/orders — Actualizar estado o régimen fiscal (con/sin IVA) del pedido
export async function PATCH(req: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { orderId, estado, conIva } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId es requerido" }, { status: 400 });
    }

    const updates: Partial<Order> = {};

    if (estado !== undefined) {
      updates.estado = estado as OrderStatus;
      if (estado === "cancelado") {
        updates.cancelledAt = new Date().toISOString();
      } else {
        updates.cancelledAt = undefined;
      }
    }

    if (conIva !== undefined) {
      updates.conIva = Boolean(conIva);
    }

    const ok = await updateOrder(orderId, updates);
    if (!ok) {
      return NextResponse.json({ error: "No se pudo actualizar el pedido" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, updates });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

// DELETE /api/orders — Eliminar un pedido
export async function DELETE(req: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get("id");

    if (!orderId) {
      return NextResponse.json({ error: "id es requerido" }, { status: 400 });
    }

    const ok = await deleteOrder(orderId);
    return NextResponse.json({ ok });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
