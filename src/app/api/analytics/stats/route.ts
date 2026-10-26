import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProducts } from "@/lib/api/store";
import { isAdminAuthenticated } from "@/lib/actions/auth";
import { isHumanTraffic } from "@/lib/analytics/botDetection";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const isAuth = await isAdminAuthenticated();
    if (!isAuth) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get("range") || "7d";
    const filtro = searchParams.get("filtro") || "humanos"; // "humanos" | "todos"

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

    const allRawVisitas = rows || [];

    // 1. Agrupar primero por sesión individual para evaluar comportamiento e interacción
    const initialVisitorsMap = new Map<string, {
      sessionId: string;
      ciudad: string;
      estado: string;
      pais: string;
      dispositivo: string;
      navegador: string;
      primeraActividad: string;
      ultimaActividad: string;
      totalPaginasVistas: number;
      ultimaRuta: string;
      ultimoProductoNombre?: string;
      ultimoProductoSku?: string;
      productosVistos: string[];
      rutasVistas: string[];
      historial: Array<{
        hora: string;
        ruta: string;
        productoNombre?: string;
        productoSku?: string;
      }>;
    }>();

    allRawVisitas.forEach((v) => {
      const sid = v.session_id || v.id;
      if (!initialVisitorsMap.has(sid)) {
        initialVisitorsMap.set(sid, {
          sessionId: sid,
          ciudad: v.ciudad || "Caracas",
          estado: v.estado || "Distrito Capital",
          pais: v.pais || "Venezuela",
          dispositivo: v.dispositivo || "Móvil",
          navegador: v.navegador || "Chrome",
          primeraActividad: v.created_at,
          ultimaActividad: v.created_at,
          totalPaginasVistas: 0,
          ultimaRuta: v.ruta || "/",
          ultimoProductoNombre: v.producto_nombre,
          ultimoProductoSku: v.producto_sku,
          productosVistos: [],
          rutasVistas: [],
          historial: [],
        });
      }

      const visitor = initialVisitorsMap.get(sid)!;
      visitor.totalPaginasVistas += 1;

      if (new Date(v.created_at) > new Date(visitor.ultimaActividad)) {
        visitor.ultimaActividad = v.created_at;
        visitor.ultimaRuta = v.ruta || "/";
        if (v.producto_nombre) {
          visitor.ultimoProductoNombre = v.producto_nombre;
          visitor.ultimoProductoSku = v.producto_sku;
        }
      }

      if (new Date(v.created_at) < new Date(visitor.primeraActividad)) {
        visitor.primeraActividad = v.created_at;
      }

      if (v.producto_nombre && !visitor.productosVistos.includes(v.producto_nombre)) {
        visitor.productosVistos.push(v.producto_nombre);
      }
      if (v.ruta && !visitor.rutasVistas.includes(v.ruta)) {
        visitor.rutasVistas.push(v.ruta);
      }

      if (visitor.historial.length < 8) {
        visitor.historial.push({
          hora: v.created_at,
          ruta: v.ruta || "/",
          productoNombre: v.producto_nombre,
          productoSku: v.producto_sku,
        });
      }
    });

    // 2. Identificar cuáles sesiones corresponden a bots o centros de datos
    const botSessionIds = new Set<string>();
    initialVisitorsMap.forEach((visitor, sid) => {
      if (!isHumanTraffic(visitor)) {
        botSessionIds.add(sid);
      }
    });

    const totalBotsExcluidos = botSessionIds.size;
    const visitasBotsExcluidas = allRawVisitas.filter((v) => botSessionIds.has(v.session_id || v.id)).length;

    // 3. Determinar el conjunto activo según el filtro seleccionado ("humanos" o "todos")
    const allVisitas = filtro === "todos"
      ? allRawVisitas
      : allRawVisitas.filter((v) => !botSessionIds.has(v.session_id || v.id));

    const visitorsMap = new Map<string, typeof initialVisitorsMap extends Map<any, infer T> ? T : never>();
    initialVisitorsMap.forEach((v, sid) => {
      if (filtro === "todos" || !botSessionIds.has(sid)) {
        visitorsMap.set(sid, v);
      }
    });

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

    // Agregación por Estado y Ciudad con Visitantes Únicos y Total Visitas
    const estadosMap: Record<string, { total: number; uniqueSessions: Set<string> }> = {};
    const ciudadesMap: Record<string, { estado: string; count: number; uniqueSessions: Set<string> }> = {};
    const dispositivosMap: Record<string, { total: number; uniqueSessions: Set<string> }> = {
      Móvil: { total: 0, uniqueSessions: new Set() },
      Escritorio: { total: 0, uniqueSessions: new Set() },
      Tablet: { total: 0, uniqueSessions: new Set() },
    };
    const navegadoresMap: Record<string, { total: number; uniqueSessions: Set<string> }> = {};
    const productosMap: Record<string, { nombre: string; sku: string; views: number; uniqueVisitors: Set<string> }> = {};

    allVisitas.forEach((v) => {
      const sid = v.session_id || v.id;

      // Estado
      const est = v.estado || "Distrito Capital";
      if (!estadosMap[est]) {
        estadosMap[est] = { total: 0, uniqueSessions: new Set() };
      }
      estadosMap[est].total += 1;
      estadosMap[est].uniqueSessions.add(sid);

      // Ciudad
      const c = v.ciudad || "Caracas";
      if (!ciudadesMap[c]) {
        ciudadesMap[c] = { estado: est, count: 0, uniqueSessions: new Set() };
      }
      ciudadesMap[c].count += 1;
      ciudadesMap[c].uniqueSessions.add(sid);

      // Dispositivo
      const d = v.dispositivo || "Móvil";
      if (!dispositivosMap[d]) {
        dispositivosMap[d] = { total: 0, uniqueSessions: new Set() };
      }
      dispositivosMap[d].total += 1;
      dispositivosMap[d].uniqueSessions.add(sid);

      // Navegador
      const n = v.navegador || "Chrome";
      if (!navegadoresMap[n]) {
        navegadoresMap[n] = { total: 0, uniqueSessions: new Set() };
      }
      navegadoresMap[n].total += 1;
      navegadoresMap[n].uniqueSessions.add(sid);

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
        productosMap[v.producto_sku].uniqueVisitors.add(sid);
      }
    });

    // Formatear Estados ordenados por Visitantes Únicos
    const topEstados = Object.entries(estadosMap)
      .map(([nombre, data]) => ({
        nombre,
        total: data.total,
        visitantesUnicos: data.uniqueSessions.size,
        porcentaje: visitantesUnicos > 0 ? Math.round((data.uniqueSessions.size / visitantesUnicos) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.visitantesUnicos - a.visitantesUnicos);

    // Formatear Ciudades ordenadas por Visitantes Únicos
    const topCiudades = Object.entries(ciudadesMap)
      .map(([ciudad, data]) => ({
        ciudad,
        estado: data.estado,
        total: data.count,
        visitantesUnicos: data.uniqueSessions.size,
        porcentaje: visitantesUnicos > 0 ? Math.round((data.uniqueSessions.size / visitantesUnicos) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.visitantesUnicos - a.visitantesUnicos)
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
      .sort((a, b) => b.uniqueVisitors - a.uniqueVisitors);

    // Agrupación de series temporales (Timeline) con visitantes únicos y páginas vistas
    const timelineMap: Record<string, { visitas: number; sessions: Set<string> }> = {};
    if (range === "hoy" || range === "ayer") {
      // 24 Horas
      for (let h = 0; h < 24; h++) {
        const key = `${String(h).padStart(2, "0")}:00`;
        timelineMap[key] = { visitas: 0, sessions: new Set() };
      }
      allVisitas.forEach((v) => {
        const d = new Date(v.created_at);
        const veHour = new Date(d.getTime() + (d.getTimezoneOffset() + veOffset) * 60000).getHours();
        const key = `${String(veHour).padStart(2, "0")}:00`;
        if (timelineMap[key]) {
          timelineMap[key].visitas += 1;
          timelineMap[key].sessions.add(v.session_id);
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
        timelineMap[key] = { visitas: 0, sessions: new Set() };
      }

      allVisitas.forEach((v) => {
        const d = new Date(v.created_at);
        const localD = new Date(d.getTime() + (d.getTimezoneOffset() + veOffset) * 60000);
        const y = localD.getFullYear();
        const m = String(localD.getMonth() + 1).padStart(2, "0");
        const dt = String(localD.getDate()).padStart(2, "0");
        const key = `${y}-${m}-${dt}`;
        if (timelineMap[key]) {
          timelineMap[key].visitas += 1;
          timelineMap[key].sessions.add(v.session_id);
        }
      });
    }

    const timeline = Object.entries(timelineMap).map(([label, data]) => ({
      label,
      visitas: data.visitas,
      visitantesUnicos: data.sessions.size,
    }));

    // Feed de últimos VISITANTES ÚNICOS en vivo
    const ultimosVisitantes = Array.from(visitorsMap.values())
      .map((visitor) => {
        const isOnline = (now.getTime() - new Date(visitor.ultimaActividad).getTime()) <= 5 * 60 * 1000;
        return {
          ...visitor,
          isOnline,
          esHumano: !botSessionIds.has(visitor.sessionId),
        };
      })
      .sort((a, b) => new Date(b.ultimaActividad).getTime() - new Date(a.ultimaActividad).getTime())
      .slice(0, 30);

    // Feed de últimos eventos brutos (retrocompatibilidad)
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

    // Formatear Dispositivos con desglose de Visitantes Únicos y vistas
    const dispositivos = {
      Móvil: {
        total: dispositivosMap["Móvil"]?.total || 0,
        visitantesUnicos: dispositivosMap["Móvil"]?.uniqueSessions.size || 0,
        porcentaje: visitantesUnicos > 0 ? Math.round(((dispositivosMap["Móvil"]?.uniqueSessions.size || 0) / visitantesUnicos) * 100) : 0,
      },
      Escritorio: {
        total: dispositivosMap["Escritorio"]?.total || 0,
        visitantesUnicos: dispositivosMap["Escritorio"]?.uniqueSessions.size || 0,
        porcentaje: visitantesUnicos > 0 ? Math.round(((dispositivosMap["Escritorio"]?.uniqueSessions.size || 0) / visitantesUnicos) * 100) : 0,
      },
      Tablet: {
        total: dispositivosMap["Tablet"]?.total || 0,
        visitantesUnicos: dispositivosMap["Tablet"]?.uniqueSessions.size || 0,
        porcentaje: visitantesUnicos > 0 ? Math.round(((dispositivosMap["Tablet"]?.uniqueSessions.size || 0) / visitantesUnicos) * 100) : 0,
      },
    };

    // Formatear Navegadores ordenados por Visitantes Únicos
    const navegadores = Object.entries(navegadoresMap)
      .map(([nombre, data]) => ({
        nombre,
        total: data.total,
        visitantesUnicos: data.uniqueSessions.size,
        porcentaje: visitantesUnicos > 0 ? Math.round((data.uniqueSessions.size / visitantesUnicos) * 100) : 0,
      }))
      .sort((a, b) => b.visitantesUnicos - a.visitantesUnicos);

    return NextResponse.json({
      range,
      filtro,
      resumen: {
        totalVisitas,
        visitantesUnicos,
        activosAhora: activeUsersNow,
        vistasProductos,
        promedioPorUsuario: visitantesUnicos > 0 ? (totalVisitas / visitantesUnicos).toFixed(1) : "0",
        totalBotsExcluidos,
        visitasBotsExcluidas,
      },
      topEstados,
      topCiudades,
      topProductos,
      dispositivos,
      navegadores,
      timeline,
      ultimosVisitantes,
      ultimasVisitas,
      generatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Error en analytics stats API:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
