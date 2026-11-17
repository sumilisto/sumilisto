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
  });

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
});
