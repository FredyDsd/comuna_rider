import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'comuna_rider_cierres_v1';

export default function CalculadoraPage() {
  const [orders, setOrders] = useState(18);
  const [fuel, setFuel] = useState(4200);
  const [cash, setCash] = useState(32400);
  const [tips, setTips] = useState(5800);
  const [isRainSurge, setIsRainSurge] = useState(false);
  const [extraExpenses, setExtraExpenses] = useState(0);
  const [savedClosures, setSavedClosures] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(savedClosures));
    } catch {
      // ignore storage errors
    }
  }, [savedClosures]);

  const formatMoney = (amount) => {
    const sign = amount < 0 ? '-' : '';
    return sign + '$' + Math.abs(Math.round(amount)).toLocaleString('es-AR');
  };

  const basePayPerOrder = 2044; // promedio viaje + bonificaciones en SSJ
  const effectivePayPerOrder = isRainSurge
    ? Math.round(basePayPerOrder * 1.25)
    : basePayPerOrder;
  const ordersSubtotal = orders * effectivePayPerOrder;
  const rainBonusAmount = isRainSurge ? orders * (effectivePayPerOrder - basePayPerOrder) : 0;
  const grossEarnings = ordersSubtotal + tips;
  const totalExpenses = fuel + extraExpenses;
  const peyaDeposit = Math.max(0, Math.round(cash * 0.72));
  // Saldo neto en efectivo en mano tras restar los gastos operativos del día
  const netCashInHand = cash - totalExpenses;
  // Ganancia neta total del turno (Viajes + Plus Clima + Propinas - Gastos)
  const pocketProfit = Math.max(0, grossEarnings - totalExpenses);

  const peyaLimit = 50000;
  const debtPercentage = Math.min(100, Math.round((cash / peyaLimit) * 100));
  const remainingDebt = Math.max(0, peyaLimit - cash);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  };

  const handleRendirEfectivo = () => {
    if (cash === 0) {
      showToast('Tu cupo de efectivo ya está en $0');
      return;
    }
    setCash(0);
    showToast('¡Efectivo rendido! Cupo liberado a $0');
  };

  const handleSaveClosure = () => {
    const newEntry = {
      id: `cierre-${Date.now()}`,
      date: new Date().toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      orders,
      isRainSurge,
      totalExpenses,
      cash,
      netCashInHand,
      pocketProfit,
    };
    setSavedClosures((prev) => [newEntry, ...prev.slice(0, 9)]);
    showToast('¡Cierre diario guardado en tu historial!');
  };

  const handleDeleteClosure = (id) => {
    setSavedClosures((prev) => prev.filter((item) => item.id !== id));
    showToast('Registro de cierre eliminado');
  };

  const handleShareWhatsApp = () => {
    const text = [
      '🏍️ *Cierre de Turno — Comuna Rider Jujuy*',
      `📦 Pedidos entregados: ${orders}${isRainSurge ? ' (🌧️ Tarifa Lluvia +25%)' : ''}`,
      `💵 Efectivo cobrado: ${formatMoney(cash)}`,
      `⛽ Gastos (Nafta/Otros): -${formatMoney(totalExpenses)}`,
      `👛 *Saldo Neto en Efectivo: ${formatMoney(netCashInHand)}*`,
      `✅ *Ganancia Neta del Turno: ${formatMoney(pocketProfit)}*`,
    ].join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    showToast('Reporte copiado y listo para WhatsApp');
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col w-full pb-6 space-y-4 pt-2">
      {/* Status Chip & Context Banner */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-container text-on-primary-container shadow-sm">
            <span className="material-symbols-outlined text-sm font-bold">calculate</span>
          </span>
          <span className="font-headline-md text-headline-md text-on-surface tracking-tight">
            Cierre de Caja Diario
          </span>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></span>
          Valores Jujuy Hoy
        </span>
      </div>

      {/* 1. Tarjeta Límite de Deuda / Efectivo a Rendir PeYa */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3 relative overflow-hidden border border-surface-container/50">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-primary-container"></div>
        <div className="flex items-start justify-between gap-2 pl-1">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-base text-primary">account_balance_wallet</span>
              <span className="font-label-md text-label-md uppercase tracking-wider font-bold">
                Cupo de Efectivo PeYa
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-headline-xl-mobile text-headline-xl-mobile text-on-surface tracking-tight font-extrabold">
                {formatMoney(cash)}
              </span>
              <span className="font-body-sm text-body-sm text-secondary font-medium">/ $50.000 corte</span>
            </div>
          </div>
          {/* Badge de Alerta */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-extrabold ${
              debtPercentage >= 75
                ? 'bg-error-container text-on-error-container'
                : 'bg-surface-container-high text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-xs">warning</span>
            {debtPercentage}% del tope
          </span>
        </div>

        {/* Barra de Progreso con graduación */}
        <div className="space-y-1.5 pl-1">
          <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-primary-fixed to-primary-container rounded-full transition-all duration-300"
              style={{ width: `${debtPercentage}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-secondary">
            <span className="inline-flex items-center gap-1 font-body-sm text-body-sm text-on-surface-variant font-bold">
              <span className="material-symbols-outlined text-xs text-primary">priority_high</span>
              Te quedan <span className="text-primary font-bold ml-0.5">{formatMoney(remainingDebt)}</span> de margen
            </span>
            <span className="font-label-sm text-label-sm text-secondary">Bloqueo a $50k</span>
          </div>
        </div>

        {/* Botón directo Pagar Deuda */}
        <div className="pt-1 pl-1">
          <button
            type="button"
            onClick={handleRendirEfectivo}
            className="w-full h-12 bg-primary-container text-on-primary-container rounded-full font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-md active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-lg">payments</span>
            <span>Rendir Efectivo (MP / Ualá / PagoFácil)</span>
          </button>
        </div>
      </div>

      {/* 2. Controles Deslizadores Interactivos (Sliders Táctiles) */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-4 border border-surface-container/50">
        <div className="flex items-center justify-between pb-1">
          <div>
            <h3 className="font-label-lg text-label-lg text-on-surface tracking-tight font-extrabold">
              Variables del Turno
            </h3>
            <span className="font-body-sm text-body-sm text-secondary">Ajuste táctil rápido</span>
          </div>
          {/* Toggle Plus por Clima (+25%) */}
          <button
            type="button"
            onClick={() => {
              setIsRainSurge((prev) => !prev);
              showToast(!isRainSurge ? '🌧️ Plus por Clima (+25%) activado' : 'Tarifa base normal activada');
            }}
            className={`h-9 px-3 rounded-full font-label-sm text-label-sm font-extrabold flex items-center gap-1.5 transition-all active:scale-95 shadow-xs ${
              isRainSurge
                ? 'bg-primary-container text-on-primary-container'
                : 'bg-surface-container-low text-on-surface border border-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-base">rainy</span>
            <span>Clima +25%</span>
          </button>
        </div>

        {/* Slider 1: Pedidos Realizados */}
        <div className="space-y-1.5 bg-surface-container-low p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-primary-container/10 text-primary flex items-center justify-center">
                <span className="material-symbols-outlined text-base">delivery_dining</span>
              </span>
              <div>
                <span className="font-label-md text-label-md text-on-surface block font-bold">
                  Pedidos Entregados
                </span>
                <span className="font-body-sm text-body-sm text-secondary">
                  {isRainSurge ? 'Tarifa Lluvia (+25% activo)' : 'Base + Tarifa dinámica'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-lg flex items-center justify-center active:scale-90 font-bold"
                onClick={() => setOrders((prev) => Math.max(0, prev - 1))}
              >
                -
              </button>
              <span className="font-label-lg text-label-lg text-primary w-9 text-center font-extrabold">
                {orders}
              </span>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-lg flex items-center justify-center active:scale-90 font-bold"
                onClick={() => setOrders((prev) => Math.min(40, prev + 1))}
              >
                +
              </button>
            </div>
          </div>
          <input
            className="w-full accent-primary-container h-2 bg-surface-container-high rounded-full cursor-pointer"
            max="40"
            min="0"
            step="1"
            type="range"
            value={orders}
            onChange={(e) => setOrders(parseInt(e.target.value, 10))}
          />
          <div className="flex justify-between font-label-sm text-label-sm text-secondary">
            <span>0 viajes</span>
            <span>
              Subtotal estimado: <strong className="text-on-surface font-bold">{formatMoney(ordersSubtotal)}</strong>
            </span>
            <span>40 viajes</span>
          </div>
        </div>

        {/* Slider 2: Gasto en Nafta / Pendientes Jujuy */}
        <div className="space-y-1.5 bg-surface-container-low p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-base">local_gas_station</span>
              </span>
              <div>
                <span className="font-label-md text-label-md text-on-surface block font-bold">
                  Nafta YPF &amp; Pendientes
                </span>
                <span className="font-body-sm text-body-sm text-secondary">Cuyaya, Perales, Nieva</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-lg flex items-center justify-center active:scale-90 font-bold"
                onClick={() => setFuel((prev) => Math.max(0, prev - 500))}
              >
                -
              </button>
              <span className="font-label-lg text-label-lg text-on-surface w-16 text-right font-extrabold">
                {formatMoney(fuel)}
              </span>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-lg flex items-center justify-center active:scale-90 font-bold"
                onClick={() => setFuel((prev) => Math.min(15000, prev + 500))}
              >
                +
              </button>
            </div>
          </div>
          <input
            className="w-full accent-primary-container h-2 bg-surface-container-high rounded-full cursor-pointer"
            max="15000"
            min="0"
            step="200"
            type="range"
            value={fuel}
            onChange={(e) => setFuel(parseInt(e.target.value, 10))}
          />
          <div className="flex justify-between font-label-sm text-label-sm text-secondary">
            <span>$0 (Bici)</span>
            <span className="text-on-surface-variant font-medium">~{(fuel / 1100).toFixed(1)} Lts Súper</span>
            <span>$15.000</span>
          </div>
        </div>

        {/* Slider 3: Efectivo Cobrado en Mano */}
        <div className="space-y-1.5 bg-surface-container-low p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-surface-container-highest text-on-surface flex items-center justify-center">
                <span className="material-symbols-outlined text-base">attach_money</span>
              </span>
              <div>
                <span className="font-label-md text-label-md text-on-surface block font-bold">
                  Cobrado en Efectivo
                </span>
                <span className="font-body-sm text-body-sm text-secondary">Cash en mano de clientes</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-lg flex items-center justify-center active:scale-90 font-bold"
                onClick={() => setCash((prev) => Math.max(0, prev - 1000))}
              >
                -
              </button>
              <span className="font-label-lg text-label-lg text-on-surface w-20 text-right font-extrabold">
                {formatMoney(cash)}
              </span>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-lg flex items-center justify-center active:scale-90 font-bold"
                onClick={() => setCash((prev) => Math.min(50000, prev + 1000))}
              >
                +
              </button>
            </div>
          </div>
          <input
            className="w-full accent-primary-container h-2 bg-surface-container-high rounded-full cursor-pointer"
            max="50000"
            min="0"
            step="500"
            type="range"
            value={cash}
            onChange={(e) => setCash(parseInt(e.target.value, 10))}
          />
          <div className="flex justify-between font-label-sm text-label-sm text-secondary">
            <span>$0</span>
            <span className="text-primary font-bold">Rendición diaria</span>
            <span>$50.000</span>
          </div>
        </div>

        {/* Slider 4: Propinas */}
        <div className="space-y-1.5 bg-surface-container-low p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-tertiary-container/10 text-tertiary flex items-center justify-center">
                <span className="material-symbols-outlined text-base">volunteer_activism</span>
              </span>
              <div>
                <span className="font-label-md text-label-md text-on-surface block font-bold">
                  Propinas Recibidas
                </span>
                <span className="font-body-sm text-body-sm text-secondary">Físico + App del día</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-lg flex items-center justify-center active:scale-90 font-bold"
                onClick={() => setTips((prev) => Math.max(0, prev - 500))}
              >
                -
              </button>
              <span className="font-label-lg text-label-lg text-tertiary w-16 text-right font-extrabold">
                {formatMoney(tips)}
              </span>
              <button
                type="button"
                className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-lg flex items-center justify-center active:scale-90 font-bold"
                onClick={() => setTips((prev) => Math.min(20000, prev + 500))}
              >
                +
              </button>
            </div>
          </div>
          <input
            className="w-full accent-tertiary-container h-2 bg-surface-container-high rounded-full cursor-pointer"
            max="20000"
            min="0"
            step="200"
            type="range"
            value={tips}
            onChange={(e) => setTips(parseInt(e.target.value, 10))}
          />
          <div className="flex justify-between font-label-sm text-label-sm text-secondary">
            <span>$0</span>
            <span className="text-tertiary font-bold">100% tuyo</span>
            <span>$20.000</span>
          </div>
        </div>

        {/* Gastos Extra Rápidos (Parche / Bebida / Comida en turno) */}
        <div className="flex items-center justify-between bg-surface-container-low p-3 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-full bg-error-container text-on-error-container flex items-center justify-center">
              <span className="material-symbols-outlined text-base">build</span>
            </span>
            <div>
              <span className="font-label-md text-label-md text-on-surface block font-bold">
                Otros Gastos (Gomería / Refrigerio)
              </span>
              <span className="font-body-sm text-body-sm text-secondary">Se descuentan del efectivo</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-lg flex items-center justify-center active:scale-90 font-bold"
              onClick={() => setExtraExpenses((prev) => Math.max(0, prev - 500))}
            >
              -
            </button>
            <span className="font-label-lg text-label-lg text-error w-16 text-right font-extrabold">
              {formatMoney(extraExpenses)}
            </span>
            <button
              type="button"
              className="w-8 h-8 rounded-full bg-surface-container-highest text-on-surface font-label-lg flex items-center justify-center active:scale-90 font-bold"
              onClick={() => setExtraExpenses((prev) => Math.min(20000, prev + 500))}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* 3. Tarjeta de Balance Neto Real del Día */}
      <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-3 border border-surface-container/50">
        <div className="flex items-center justify-between pb-1">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">receipt_long</span>
            <h3 className="font-headline-md text-headline-md text-on-surface font-extrabold">Balance Neto Real</h3>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high font-label-sm text-label-sm text-secondary font-bold">
            {isRainSurge ? '🌧️ Tarifa Lluvia +25%' : 'Turno Tarde/Noche'}
          </span>
        </div>

        {/* Desglose Financiero */}
        <div className="space-y-2 pt-1 font-body-md text-body-md">
          <div className="flex items-center justify-between text-on-surface">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              Ganancia Bruta Generada ({orders} viajes + propinas)
            </span>
            <span className="font-label-lg text-label-lg text-on-surface font-bold">
              {formatMoney(grossEarnings)}
            </span>
          </div>
          {isRainSurge && (
            <div className="flex items-center justify-between text-tertiary">
              <span className="flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                (+) Plus por Clima Incluido (+25%)
              </span>
              <span className="font-label-md text-label-md font-bold">
                +{formatMoney(rainBonusAmount)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-error"></span>
              (-) Gastos Totales (Nafta y Otros)
            </span>
            <span className="font-label-md text-label-md text-error font-bold">
              -{formatMoney(totalExpenses)}
            </span>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-primary-container"></span>
              (-) Estimado a Rendir a PeYa
            </span>
            <span className="font-label-md text-label-md text-error font-bold">
              -{formatMoney(peyaDeposit)}
            </span>
          </div>
        </div>

        {/* Saldo Neto en Efectivo tras restar gastos */}
        <div className="mt-2 p-3 rounded-lg bg-surface-container-low flex items-center justify-between border border-surface-container-high">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary block font-extrabold">
              Saldo Neto en Efectivo (En Mano)
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">
              Efectivo cobrado ({formatMoney(cash)}) menos gastos (-{formatMoney(totalExpenses)})
            </span>
          </div>
          <div className="text-right">
            <span className="font-headline-md text-headline-md text-on-surface font-extrabold">
              {formatMoney(netCashInHand)}
            </span>
          </div>
        </div>

        {/* Highlight Ganancia de Bolsillo Neta */}
        <div className="mt-2 p-3.5 rounded-lg bg-surface-container-low flex items-center justify-between shadow-xs border border-tertiary-container/20">
          <div>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary block font-extrabold">
              Tu Ganancia de Bolsillo Neta
            </span>
            <span className="font-body-sm text-body-sm text-tertiary flex items-center gap-1 font-bold">
              <span className="material-symbols-outlined text-xs">savings</span>
              Libre tras descontar gastos
            </span>
          </div>
          <div className="text-right">
            <span className="font-headline-xl-mobile text-headline-xl-mobile text-tertiary tracking-tight font-extrabold">
              {formatMoney(pocketProfit)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Acceso Rápido: Guardar Registro y Exportar */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <button
          type="button"
          onClick={handleSaveClosure}
          className="h-12 bg-inverse-surface text-inverse-on-surface rounded-full font-label-lg text-label-lg font-bold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-lg">bookmark_add</span>
          <span>Guardar Día</span>
        </button>
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="h-12 bg-surface-container-highest text-on-surface font-label-lg text-label-lg font-bold rounded-full flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-lg text-tertiary">share</span>
          <span>Reporte WhatsApp</span>
        </button>
      </div>

      {/* 5. Historial de Cierres Guardados */}
      {savedClosures.length > 0 && (
        <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm space-y-2.5 border border-surface-container/50">
          <div className="flex items-center justify-between">
            <h4 className="font-label-lg text-label-lg text-on-surface font-extrabold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base text-primary">history</span>
              Historial de Cierres Guardados
            </h4>
            <span className="font-label-sm text-label-sm text-secondary font-bold">
              {savedClosures.length} {savedClosures.length === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          <div className="space-y-2">
            {savedClosures.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-surface-container-low p-2.5 rounded-lg"
              >
                <div>
                  <p className="font-label-md text-label-md text-on-surface font-bold">
                    {item.date} • {item.orders} viajes {item.isRainSurge ? '🌧️' : ''}
                  </p>
                  <p className="font-body-sm text-body-sm text-secondary">
                    Efectivo neto: <strong className="text-on-surface">{formatMoney(item.netCashInHand)}</strong> • Ganancia:{' '}
                    <strong className="text-tertiary">{formatMoney(item.pocketProfit)}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteClosure(item.id)}
                  className="w-7 h-7 rounded-full bg-error-container text-on-error-container flex items-center justify-center active:scale-90"
                  title="Eliminar registro"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Micro-aviso Comunitario Jujuy */}
      <div className="flex items-center justify-center gap-1.5 text-center py-2 text-secondary font-body-sm text-body-sm">
        <span className="material-symbols-outlined text-sm text-primary">local_shipping</span>
        <span>Ajustado con base $2.044/envío + pendiente promedio Jujuy</span>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-4 py-2.5 rounded-full shadow-xl font-body-sm text-body-sm flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom duration-200">
          <span className="material-symbols-outlined text-tertiary-fixed text-base">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
