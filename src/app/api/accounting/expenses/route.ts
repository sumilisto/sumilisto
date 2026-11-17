import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { saveExpense, deleteExpense } from "@/lib/supabase/queries";
import { Expense } from "@/types/accounting";
import { createSafeErrorResponse } from "@/lib/security/errors";

export async function POST(req: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { id, fecha, categoria, concepto, montoUsd, montoBs, tasaCambio, metodoPago, notas } = body;

    if (!concepto || typeof concepto !== "string" || !concepto.trim()) {
      return NextResponse.json({ error: "El concepto o descripción es obligatorio" }, { status: 400 });
    }

    const parsedMontoUsd = Number(montoUsd);
    if (isNaN(parsedMontoUsd) || parsedMontoUsd <= 0) {
      return NextResponse.json({ error: "El monto en USD debe ser un número mayor a cero" }, { status: 400 });
    }

    const newExpense: Expense = {
      id: id || `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fecha: fecha || new Date().toISOString().split("T")[0],
      categoria: categoria || "otros",
      concepto: concepto.trim(),
      montoUsd: Math.round(parsedMontoUsd * 100) / 100,
      montoBs: montoBs !== undefined ? Number(montoBs) : undefined,
      tasaCambio: tasaCambio !== undefined ? Number(tasaCambio) : undefined,
      metodoPago: metodoPago || "usdt",
      notas: notas ? String(notas).trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    const saved = await saveExpense(newExpense);
    if (!saved) {
      return NextResponse.json({ error: "Error al guardar el gasto en base de datos" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, expense: newExpense });
  } catch (error: any) {
    return createSafeErrorResponse(error, "No se pudo procesar el registro del gasto.", 500, true);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de gasto requerido" }, { status: 400 });
    }

    const deleted = await deleteExpense(id);
    if (!deleted) {
      return NextResponse.json({ error: "No se pudo eliminar el gasto" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return createSafeErrorResponse(error, "Error al eliminar el gasto.", 500, true);
  }
}
