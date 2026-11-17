import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { saveUsdtTransaction, deleteUsdtTransaction, updateUsdtRates } from "@/lib/supabase/queries";
import { UsdtTransaction, UsdtRates } from "@/types/accounting";
import { createSafeErrorResponse } from "@/lib/security/errors";

// POST /api/accounting/usdt — Guardar operación USDT (compra, venta, o pago a proveedor)
export async function POST(req: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const {
      id,
      fecha,
      tipo,
      montoUsdt,
      tasaBsPorUsdt,
      montoBs,
      proveedorNombre,
      montoOriginalUsd,
      descuentoPorcentaje,
      ahorroUsd,
      plataforma,
      referencia,
      notas,
    } = body;

    const parsedMontoUsdt = Number(montoUsdt);
    if (isNaN(parsedMontoUsdt) || parsedMontoUsdt <= 0) {
      return NextResponse.json({ error: "El monto en USDT debe ser mayor a 0" }, { status: 400 });
    }

    const newTx: UsdtTransaction = {
      id: id || `usdt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fecha: fecha || new Date().toISOString().split("T")[0],
      tipo: tipo || "compra",
      montoUsdt: Math.round(parsedMontoUsdt * 100) / 100,
      tasaBsPorUsdt: tasaBsPorUsdt !== undefined && !isNaN(Number(tasaBsPorUsdt)) ? Number(tasaBsPorUsdt) : undefined,
      montoBs: montoBs !== undefined && !isNaN(Number(montoBs)) ? Number(montoBs) : undefined,
      proveedorNombre: proveedorNombre ? String(proveedorNombre).trim() : undefined,
      montoOriginalUsd: montoOriginalUsd !== undefined && !isNaN(Number(montoOriginalUsd)) ? Number(montoOriginalUsd) : undefined,
      descuentoPorcentaje: descuentoPorcentaje !== undefined && !isNaN(Number(descuentoPorcentaje)) ? Number(descuentoPorcentaje) : undefined,
      ahorroUsd: ahorroUsd !== undefined && !isNaN(Number(ahorroUsd)) ? Number(ahorroUsd) : undefined,
      plataforma: plataforma ? String(plataforma).trim() : undefined,
      referencia: referencia ? String(referencia).trim() : undefined,
      notas: notas ? String(notas).trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    const saved = await saveUsdtTransaction(newTx);
    if (!saved) {
      return NextResponse.json({ error: "Error al guardar operación USDT" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, transaction: newTx });
  } catch (error: any) {
    return createSafeErrorResponse(error, "No se pudo registrar la operación USDT.", 500, true);
  }
}

// PUT /api/accounting/usdt — Actualizar tasas de referencia Compra / Venta USDT
export async function PUT(req: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { tasaCompraUsdt, tasaVentaUsdt } = body;

    const parsedCompra = Number(tasaCompraUsdt);
    const parsedVenta = Number(tasaVentaUsdt);

    if (isNaN(parsedCompra) || parsedCompra <= 0 || isNaN(parsedVenta) || parsedVenta <= 0) {
      return NextResponse.json({ error: "Las tasas de compra y venta deben ser números válidos mayores a cero" }, { status: 400 });
    }

    const rates: UsdtRates = {
      tasaCompraUsdt: parsedCompra,
      tasaVentaUsdt: parsedVenta,
      ultimaActualizacion: new Date().toISOString(),
    };

    const updated = await updateUsdtRates(rates);
    if (!updated) {
      return NextResponse.json({ error: "Error al actualizar tasas USDT en base de datos" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, rates });
  } catch (error: any) {
    return createSafeErrorResponse(error, "No se pudieron actualizar las tasas USDT.", 500, true);
  }
}

// DELETE /api/accounting/usdt?id=... — Eliminar operación USDT
export async function DELETE(req: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de operación requerido" }, { status: 400 });
    }

    const deleted = await deleteUsdtTransaction(id);
    if (!deleted) {
      return NextResponse.json({ error: "No se pudo eliminar la operación USDT" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return createSafeErrorResponse(error, "Error al eliminar operación USDT.", 500, true);
  }
}
