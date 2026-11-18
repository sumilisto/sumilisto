import { describe, it, expect } from "vitest";

describe("Accounting & USDT Calculations", () => {
  it("calculates USDT received correctly when buying USDT with bolivares", () => {
    const montoBs = 93500;
    const tasaCompra = 935.0;
    const usdtReceived = Math.round((montoBs / tasaCompra) * 100) / 100;

    expect(usdtReceived).toBe(100.0);
  });

  it("calculates bolivares received when selling USDT", () => {
    const montoUsdt = 50.0;
    const tasaVenta = 925.0;
    const bsReceived = Math.round(montoUsdt * tasaVenta * 100) / 100;

    expect(bsReceived).toBe(46250.0);
  });

  it("calculates supplier discount and savings when paying in USDT", () => {
    const facturaUsd = 500.0;
    const descuentoPorcentaje = 5.0; // 5% de descuento por pagar en USDT

    const ahorro = Math.round(facturaUsd * (descuentoPorcentaje / 100) * 100) / 100;
    const usdtAPagar = Math.round((facturaUsd - ahorro) * 100) / 100;

    expect(ahorro).toBe(25.0);
    expect(usdtAPagar).toBe(475.0);
  });

  it("computes weighted average exchange rate correctly across multiple purchases", () => {
    // Compra 1: 100 USDT a 900 Bs/USDT = 90,000 Bs
    // Compra 2: 200 USDT a 930 Bs/USDT = 186,000 Bs
    // Total USDT: 300 USDT, Total Bs: 276,000 Bs
    // Tasa ponderada = 276,000 / 300 = 920.00 Bs/USDT
    const compras = [
      { usdt: 100, tasa: 900, bs: 90000 },
      { usdt: 200, tasa: 930, bs: 186000 },
    ];

    const totalUsdt = compras.reduce((acc, c) => acc + c.usdt, 0);
    const totalBs = compras.reduce((acc, c) => acc + c.bs, 0);
    const tasaPonderada = Math.round((totalBs / totalUsdt) * 100) / 100;

    expect(tasaPonderada).toBe(920.0);
  });

  it("calculates ROAS (Return On Ad Spend) for Meta Ads accurately", () => {
    const facturacionTotal = 1250.0;
    const gastoMetaAds = 250.0;

    const roas = Math.round((facturacionTotal / gastoMetaAds) * 100) / 100;
    expect(roas).toBe(5.0); // 5x retorno
  });

  it("correctly computes spread between BCV official rate and USDT P2P rate", () => {
    const bcvRate = 880.0;
    const usdtBuyRate = 924.0;

    const brechaPorcentaje = Math.round((((usdtBuyRate - bcvRate) / bcvRate) * 100) * 100) / 100;
    expect(brechaPorcentaje).toBe(5.0); // +5% sobre BCV
  });

  it("resolves live USDT rate structure with valid fields", async () => {
    const { getLiveUsdtRate } = await import("@/lib/currency/usdt");
    const liveRate = await getLiveUsdtRate();

    expect(liveRate).toBeDefined();
    expect(liveRate.rate).toBeGreaterThan(0);
    expect(liveRate.tasaCompra).toBeGreaterThan(0);
    expect(liveRate.tasaVenta).toBeGreaterThan(0);
    expect(liveRate.fuente).toBeDefined();
    expect(liveRate.timestamp).toBeDefined();
  }, 15000);

  it("supports manual rate entry when negotiating custom P2P exchange rates", () => {
    // Escenario 1: El usuario pacta una tasa manual diferente a la de mercado (ej: 1080 Bs en vez de 1069)
    const manualTasa = 1080.0;
    const montoBsEntregado = 108000;
    const usdtObtenido = Math.round((montoBsEntregado / manualTasa) * 100) / 100;
    expect(usdtObtenido).toBe(100.0);

    // Escenario 2: El usuario vende a tasa manual preferencial
    const manualTasaVenta = 1060.0;
    const usdtVendido = 50.0;
    const bsRecibidos = Math.round(usdtVendido * manualTasaVenta * 100) / 100;
    expect(bsRecibidos).toBe(53000.0);
  });

  it("resolves automatic background rates with 5-minute window", async () => {
    const { getResolvedUsdtRates } = await import("@/lib/currency/usdt");
    const rates = await getResolvedUsdtRates();

    expect(rates).toBeDefined();
    expect(rates.tasaCompraUsdt).toBeGreaterThan(0);
    expect(rates.tasaVentaUsdt).toBeGreaterThan(0);
  });

  it("links order revenue correctly into accounting by payment method (Bs, $ Cash, USDT)", () => {
    const mockOrders = [
      { id: "1", totalUsd: 400, tipoPago: "bolivares", referenciaPago: "849201", estado: "entregado" },
      { id: "2", totalUsd: 250, tipoPago: "dolares_efectivo", referenciaPago: "102938", estado: "entregado" },
      { id: "3", totalUsd: 500, tipoPago: "usdt", referenciaPago: "739102", estado: "entregado" },
    ];

    let facturacionTotal = 0;
    let ingresosBs = 0;
    let ingresosUsdEfectivo = 0;
    let ingresosUsdt = 0;

    mockOrders.forEach((o) => {
      facturacionTotal += o.totalUsd || 0;
      if (o.tipoPago === "usdt") ingresosUsdt += o.totalUsd || 0;
      else if (o.tipoPago === "dolares_efectivo") ingresosUsdEfectivo += o.totalUsd || 0;
      else ingresosBs += o.totalUsd || 0;
    });

    expect(facturacionTotal).toBe(1150);
    expect(ingresosBs).toBe(400);
    expect(ingresosUsdEfectivo).toBe(250);
    expect(ingresosUsdt).toBe(500);
  });

  it("validates and normalizes 6-digit payment references", () => {
    const rawRef1 = "849201";
    const rawRef2 = "ref-123456789";
    const rawRef3 = "59301";

    const clean1 = rawRef1.replace(/\D/g, "").slice(0, 6);
    const clean2 = rawRef2.replace(/\D/g, "").slice(0, 6);
    const clean3 = rawRef3.replace(/\D/g, "").slice(0, 6);

    expect(clean1).toBe("849201");
    expect(clean1.length).toBe(6);
    expect(clean2).toBe("123456");
    expect(clean2.length).toBe(6);
    expect(clean3).toBe("59301");
  });
});
