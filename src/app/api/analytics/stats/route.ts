import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProducts } from "@/lib/api/store";
import { isAdminAuthenticated } from "@/lib/actions/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "7d";

    const now = new Date();
    // Hora de Venezuela es UTC-4 (240 minutos)
    const veOffset = -4 * 60;
    const localNow = new Date(now.getTime() + (now.getTimezoneOffset() + veOffset) * 60000);

    let startDate: Date;
    let endDate: Date | null = null;

    if (range === "hoy") {
      const todayStart = new Date(localNow);
      todayStart.setHours(0, 0, 0, 0);
      startDate = new Date(todayStart.getTime() - (todayStart.getTimezoneOffset() + veOffset) * 60000);
    } else if (range === "ayer") {
      const yestStart = new Date(localNow);
      yestStart.setDate(yestStart.getDate() - 1);
      yestStart.setHours(0, 0, 0, 0);

      const yestEnd = new Date(localNow);
      yestEnd.setHours(0, 0, 0, 0);

      startDate = new Date(yestStart.getTime() - (yestStart.getTimezoneOffset() + veOffset) * 60000);
      endDate = new Date(yestEnd.getTime() - (yestEnd.getTimezoneOffset() + veOffset) * 60000);
    } else if (range === "30d") {
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (range === "todo") {
      startDate = new Date(2020, 0, 1);
    } else {
      // Por defecto 7 días
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Consulta de visitas en el rango
    let query = supabaseAdmin
      .from("analitica_visitas")
      .select("*")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: false });

    if (endDate) {
      query = query.lt("created_at", endDate.toISOString());
    }

    const { data: rows, error } = await query.limit(2000);

    if (error) {
      console.error("Error consultando analítica:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allVisitas = rows || [];

    // Calcular Activos Ahora (últimos 5 minutos)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const { data: activeNowRows } = await supabaseAdmin
      .from("analitica_visitas")
      .select("session_id")
      .gte("created_at", fiveMinutesAgo);

    const activeUsersNow = new Set((activeNowRows || []).map((r) => r.session_id)).size;

    // Métricas clave
    const totalVisitas = allVisitas.length;
    const uniqueSessions = new Set(allVisitas.map((v) => v.session_id));
    const visitantesUnicos = uniqueSessions.size;

    const productoVisitas = allVisitas.filter((v) => Boolean(v.producto_sku || v.producto_nombre));
    const vistasProductos = productoVisitas.length;

    // Agregación por Estado
    const estadosMap: Record<string, number> = {};
    const ciudadesMap: Record<string, { estado: string; count: number }> = {};
    const dispositivosMap: Record<string, number> = { Móvil: 0, Escritorio: 0, Tablet: 0 };
    const navegadoresMap: Record<string, number> = {};
    const productosMap: Record<string, { nombre: string; sku: string; views: number; uniqueVisitors: Set<string> }> = {};

    allVisitas.forEach((v) => {
      // Estado
      const est = v.estado || "Distrito Capital";
      estadosMap[est] = (estadosMap[est] || 0) + 1;

      // Ciudad
      const c = v.ciudad || "Caracas";
      if (!ciudadesMap[c]) {
        ciudadesMap[c] = { estado: est, count: 0 };
      }
      ciudadesMap[c].count += 1;

      // Dispositivo
      const d = v.dispositivo || "Móvil";
      dispositivosMap[d] = (dispositivosMap[d] || 0) + 1;

      // Navegador
      const n = v.navegador || "Chrome";
      navegadoresMap[n] = (navegadoresMap[n] || 0) + 1;

      // Productos
      if (v.producto_sku) {
        if (!productosMap[v.producto_sku]) {
          productosMap[v.producto_sku] = {
            nombre: v.producto_nombre || v.producto_sku,
            sku: v.producto_sku,
            views: 0,
            uniqueVisitors: new Set(),
          };
        }
        productosMap[v.producto_sku].views += 1;
        productosMap[v.producto_sku].uniqueVisitors.add(v.session_id);
      }
    });

    // Formatear Estados ordenados
    const topEstados = Object.entries(estadosMap)
      .map(([nombre, total]) => ({
        nombre,
        total,
        porcentaje: totalVisitas > 0 ? Math.round((total / totalVisitas) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total);

    // Formatear Ciudades ordenadas
    const topCiudades = Object.entries(ciudadesMap)
      .map(([ciudad, data]) => ({
        ciudad,
        estado: data.estado,
        total: data.count,
        porcentaje: totalVisitas > 0 ? Math.round((data.count / totalVisitas) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // Cruzar productos con catálogo para foto y slug
    const catalogProducts = await getProducts().catch(() => []);
    const topProductos = Object.values(productosMap)
      .map((p) => {
        const match = catalogProducts.find(
          (c) => c.sku === p.sku || (c.variantes || []).some((v) => v.sku === p.sku)
        );
        return {
          sku: p.sku,
          nombre: match ? match.nombre : p.nombre,
          slug: match ? match.slug : "",
          categoria: match ? match.categoria : "Catálogo",
          fotoUrl: match?.fotos?.[0]?.url || "",
          views: p.views,
          uniqueVisitors: p.uniqueVisitors.size,
          porcentaje: totalVisitas > 0 ? Math.round((p.views / totalVisitas) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.views - a.views);

    // Agrupación de series temporales (Timeline)
    const timelineMap: Record<string, number> = {};
    if (range === "hoy" || range === "ayer") {
      // 24 Horas
      for (let h = 0; h < 24; h++) {
        const key = `${String(h).padStart(2, "0")}:00`;
        timelineMap[key] = 0;
      }
      allVisitas.forEach((v) => {
        const d = new Date(v.created_at);
        // Ajustar a hora VE
        const veHour = new Date(d.getTime() + (d.getTimezoneOffset() + veOffset) * 60000).getHours();
        const key = `${String(veHour).padStart(2, "0")}:00`;
        if (timelineMap[key] !== undefined) {
          timelineMap[key] += 1;
        }
      });
    } else {
      // Agrupado por fecha (últimos 7 o 30 días)
      const numDays = range === "30d" ? 30 : 7;
      for (let i = numDays - 1; i >= 0; i--) {
        const day = new Date(localNow);
        day.setDate(day.getDate() - i);
        const y = day.getFullYear();
        const m = String(day.getMonth() + 1).padStart(2, "0");
        const dt = String(day.getDate()).padStart(2, "0");
        const key = `${y}-${m}-${dt}`;
        timelineMap[key] = 0;
      }

      allVisitas.forEach((v) => {
        const d = new Date(v.created_at);
        const localD = new Date(d.getTime() + (d.getTimezoneOffset() + veOffset) * 60000);
        const y = localD.getFullYear();
        const m = String(localD.getMonth() + 1).padStart(2, "0");
        const dt = String(localD.getDate()).padStart(2, "0");
        const key = `${y}-${m}-${dt}`;
        if (timelineMap[key] !== undefined) {
          timelineMap[key] += 1;
        }
      });
    }

    const timeline = Object.entries(timelineMap).map(([label, count]) => ({
      label,
      visitas: count,
    }));

    // Feed de últimas visitas en vivo (últimas 30)
    const ultimasVisitas = allVisitas.slice(0, 30).map((v) => ({
      id: v.id,
      fecha: v.created_at,
      ciudad: v.ciudad || "Caracas",
      estado: v.estado || "Distrito Capital",
      ruta: v.ruta,
      productoNombre: v.producto_nombre,
      productoSku: v.producto_sku,
      dispositivo: v.dispositivo || "Móvil",
      navegador: v.navegador || "Chrome",
    }));

    return NextResponse.json({
      range,
      resumen: {
        totalVisitas,
        visitantesUnicos,
        activosAhora: activeUsersNow,
        vistasProductos,
        promedioPorUsuario: visitantesUnicos > 0 ? (totalVisitas / visitantesUnicos).toFixed(1) : "0",
      },
      topEstados,
      topCiudades,
      topProductos,
      dispositivos: dispositivosMap,
      navegadores: navegadoresMap,
      timeline,
      ultimasVisitas,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error en analytics stats API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
