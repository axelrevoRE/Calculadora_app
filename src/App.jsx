import React, { useEffect, useMemo, useState } from "react";

// —— Utilidades de formato / parseo ——————————————
const formatCurrency = (n) =>
  (isFinite(n) ? n : 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPercent = (x) => `${((isFinite(x) ? x : 0) * 100).toFixed(2)}%`;

const parseCurrency = (s) => {
  if (s == null) return 0;
  let clean = String(s).replace(/[^0-9.,-]/g, "");
  clean = clean.replace(/,/g, "");
  const firstDot = clean.indexOf(".");
  if (firstDot !== -1) {
    const before = clean.slice(0, firstDot + 1);
    const after = clean.slice(firstDot + 1).replace(/[.]/g, "");
    clean = before + after;
  }
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : parsed;
};

const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// —— Inputs con máscara ————————————————————————
function CurrencyField({ label, value, onChange, disabled = false }) {
  const [text, setText] = useState(formatCurrency(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(formatCurrency(value));
  }, [value, focused]);

  return (
    <label className="grid gap-1">
      {label && <span className="text-sm text-gray-700">{label}</span>}
      <input
        type="text"
        inputMode="decimal"
        className={`rounded-xl border p-2 ${disabled ? "bg-gray-100 opacity-70" : ""}`}
        value={text}
        disabled={disabled}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const raw = e.target.value;
          setText(raw);
          onChange(parseCurrency(raw));
        }}
        onBlur={() => {
          setFocused(false);
          setText(formatCurrency(value));
        }}
      />
    </label>
  );
}

function PercentField({ label, valuePct, onChange, readOnly = false }) {
  // valuePct en 0..100 (no fracción)
  const [text, setText] = useState(\`\${(isFinite(valuePct) ? valuePct : 0).toFixed(2)}%\`);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setText(\`\${(isFinite(valuePct) ? valuePct : 0).toFixed(2)}%\`);
  }, [valuePct, focused]);

  return (
    <label className="grid gap-1">
      {label && <span className="text-sm text-gray-700">{label}</span>}
      <input
        type="text"
        inputMode="decimal"
        className={\`rounded-xl border p-2 \${readOnly ? "bg-gray-100 opacity-70" : ""}\`}
        value={text}
        readOnly={readOnly}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          const raw = e.target.value.replace(/%/g, "").replace(",", ".");
          setText(e.target.value);
          const num = parseFloat(raw);
          if (!isNaN(num)) onChange(num);
        }}
        onBlur={() => {
          setFocused(false);
          setText(\`\${(isFinite(valuePct) ? valuePct : 0).toFixed(2)}%\`);
        }}
      />
    </label>
  );
}

// —— Cálculo de VPN ————————————————————————————
function vpnDeEsquema(V, rAnualPct, p1Pct, pmPct, n, restanteEnNmas1) {
  const p1 = clamp((isFinite(p1Pct) ? p1Pct : 0) / 100, 0, 1);
  const pm = clamp((isFinite(pmPct) ? pmPct : 0) / 100, 0, 1);
  const pr = clamp(1 - (p1 + pm), 0, 1);
  const i = Math.pow(1 + (rAnualPct / 100), 1 / 12) - 1; // tasa mensual efectiva

  const pagoInicial = V * p1; // t=0
  const totalMensualidades = V * pm;
  const pagoMensual = n > 0 ? totalMensualidades / n : 0;

  let pvMensualidades = 0;
  for (let t = 1; t <= n; t++) pvMensualidades += pagoMensual / Math.pow(1 + i, t);

  const tRest = n + (restanteEnNmas1 ? 1 : 0);
  const pagoRestante = V * (pr >= 0 ? pr : 0);
  const pvRestante = tRest > 0 ? pagoRestante / Math.pow(1 + i, tRest) : pagoRestante;

  const vpn = pagoInicial + pvMensualidades + pvRestante;
  return { i, p1, pm, pr, pagoInicial, totalMensualidades, pagoMensual, pvMensualidades, pagoRestante, pvRestante, vpn, n, tRest };
}

// —— Componente principal ——————————————————————
export default function App() {
  // Compartidas
  const [valorDepto, setValorDepto] = useState(5000000);
  const [tasaAnual, setTasaAnual] = useState(12);
  const [numMensualidades, setNumMensualidades] = useState(24);

  // Modos por esquema: "pct" o "abs"
  const [modoT, setModoT] = useState("pct");
  const [modoP, setModoP] = useState("pct");

  // Tradicional
  const [t_ini_T_pct, setTIniTPct] = useState(10);   // %
  const [t_mens_T_pct, setTMensTPct] = useState(60); // %
  const [t_ini_T_abs, setTIniTAbs] = useState(500000);    // $
  const [t_mens_T_abs, setTMensTAbs] = useState(3000000); // $
  const [restEnNmas1_T, setRestEnNmas1_T] = useState(false);

  // Personalizado
  const [t_ini_P_pct, setTIniPPct] = useState(30);
  const [t_mens_P_pct, setTMensPPct] = useState(50);
  const [t_ini_P_abs, setTIniPAbs] = useState(1500000);
  const [t_mens_P_abs, setTMensPAbs] = useState(2500000);
  const [restEnNmas1_P, setRestEnNmas1_P] = useState(false);

  // Visibilidad de resultados
  const [showResT, setShowResT] = useState(true);
  const [showResP, setShowResP] = useState(true);

  const V = Number(valorDepto) || 0;
  const n = Math.max(0, Math.floor(Number(numMensualidades)) || 0);

  // Derivar % efectivos según modo
  const pctsT = useMemo(() => {
    if (modoT === "pct") {
      const p1 = clamp(t_ini_T_pct, 0, 100);
      const pm = clamp(t_mens_T_pct, 0, 100);
      const pr = clamp(100 - (p1 + pm), 0, 100);
      return { p1Pct: p1, pmPct: pm, prPct: pr };
    } else {
      const p1Pct = V > 0 ? clamp((t_ini_T_abs / V) * 100, 0, 100) : 0;
      const pmPct = V > 0 ? clamp((t_mens_T_abs / V) * 100, 0, 100) : 0;
      const prPct = clamp(100 - (p1Pct + pmPct), 0, 100);
      return { p1Pct, pmPct, prPct };
    }
  }, [modoT, t_ini_T_pct, t_mens_T_pct, t_ini_T_abs, t_mens_T_abs, V]);

  const pctsP = useMemo(() => {
    if (modoP === "pct") {
      const p1 = clamp(t_ini_P_pct, 0, 100);
      const pm = clamp(t_mens_P_pct, 0, 100);
      const pr = clamp(100 - (p1 + pm), 0, 100);
      return { p1Pct: p1, pmPct: pm, prPct: pr };
    } else {
      const p1Pct = V > 0 ? clamp((t_ini_P_abs / V) * 100, 0, 100) : 0;
      const pmPct = V > 0 ? clamp((t_mens_P_abs / V) * 100, 0, 100) : 0;
      const prPct = clamp(100 - (p1Pct + pmPct), 0, 100);
      return { p1Pct, pmPct, prPct };
    }
  }, [modoP, t_ini_P_pct, t_mens_P_pct, t_ini_P_abs, t_mens_P_abs, V]);

  // Cálculos
  const T = useMemo(
    () => vpnDeEsquema(V, tasaAnual, pctsT.p1Pct, pctsT.pmPct, n, restEnNmas1_T),
    [V, tasaAnual, pctsT.p1Pct, pctsT.pmPct, n, restEnNmas1_T]
  );
  const P = useMemo(
    () => vpnDeEsquema(V, tasaAnual, pctsP.p1Pct, pctsP.pmPct, n, restEnNmas1_P),
    [V, tasaAnual, pctsP.p1Pct, pctsP.pmPct, n, restEnNmas1_P]
  );

  const diffVPN = T.vpn - P.vpn;

  const Warning = ({ children }) => (
    <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-3 text-sm">{children}</div>
  );

  const ToggleModo = ({ value, onChange }) => (
    <div className="inline-flex overflow-hidden rounded-xl border text-xs">
      <button type="button" className={\`px-3 py-1 \${value === "pct" ? "bg-gray-900 text-white" : "bg-white"}\`} onClick={() => onChange("pct")}>% Porcentajes</button>
      <button type="button" className={\`px-3 py-1 border-l \${value === "abs" ? "bg-gray-900 text-white" : "bg-white"}\`} onClick={() => onChange("abs")}>$ Valores</button>
    </div>
  );

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold tracking-tight">Calculadora: Esquema Tradicional vs. Personalizado</h1>
      <p className="mt-1 text-gray-600">
        Variables compartidas: <span className="font-medium">Valor inicial</span>, <span className="font-medium">Tasa de descuento anual</span> y <span className="font-medium">Número de mensualidades</span>.
        En cada esquema puedes capturar <span className="font-medium">porcentajes</span> o <span className="font-medium">valores absolutos</span>.
      </p>

      {/* Entradas compartidas */}
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-medium">Valor inicial</h2>
          <CurrencyField label="Departamento" value={valorDepto} onChange={setValorDepto} />
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-medium">Tasa de descuento</h2>
          <PercentField label="Anual" valuePct={tasaAnual} onChange={setTasaAnual} />
          <div className="mt-2 text-xs text-gray-500">Tasa mensual efectiva: <span className="font-medium">{formatPercent(Math.pow(1 + tasaAnual / 100, 1/12) - 1)}</span></div>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="mb-1 text-lg font-medium">Mensualidades</h2>
          <label className="grid gap-1">
            <span className="text-sm text-gray-700">Número de mensualidades</span>
            <input type="number" min="0" step="1" className="rounded-xl border p-2" value={numMensualidades} onChange={(e) => setNumMensualidades(Number(e.target.value))} />
          </label>
        </div>
      </div>

      {/* Esquemas lado a lado */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">

        {/* Columna — Tradicional */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Esquema: Tradicional</h2>
              <ToggleModo value={modoT} onChange={(v) => setModoT(v)} />
            </div>

            {modoT === "pct" ? (
              <>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <PercentField label="% primer pago" valuePct={t_ini_T_pct} onChange={setTIniTPct} />
                  <PercentField label="% en mensualidades" valuePct={t_mens_T_pct} onChange={setTMensTPct} />
                  <PercentField label="% restante (auto)" valuePct={pctsT.prPct} onChange={() => {}} readOnly />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-gray-600">
                  <div>$ equiv.: <span className="font-medium">{formatCurrency((V * pctsT.p1Pct) / 100)}</span></div>
                  <div>$ equiv.: <span className="font-medium">{formatCurrency((V * pctsT.pmPct) / 100)}</span></div>
                  <div>$ equiv.: <span className="font-medium">{formatCurrency((V * pctsT.prPct) / 100)}</span></div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <CurrencyField label="$ primer pago" value={t_ini_T_abs} onChange={setTIniTAbs} />
                  <CurrencyField label="$ total en mensualidades" value={t_mens_T_abs} onChange={setTMensTAbs} />
                  <CurrencyField label="$ restante (auto)" value={Math.max(0, V - (t_ini_T_abs + t_mens_T_abs))} onChange={() => {}} disabled />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-gray-600">
                  <div>% equiv.: <span className="font-medium">{((t_ini_T_abs / (V || 1)) * 100).toFixed(2)}%</span></div>
                  <div>% equiv.: <span className="font-medium">{((t_mens_T_abs / (V || 1)) * 100).toFixed(2)}%</span></div>
                  <div>% equiv.: <span className="font-medium">{(Math.max(0, 100 - (((t_ini_T_abs + t_mens_T_abs) / (V || 1)) * 100))).toFixed(2)}%</span></div>
                </div>
              </>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={restEnNmas1_T} onChange={(e) => setRestEnNmas1_T(e.target.checked)} />
                Cobrar el % restante en el mes N+1
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showResT} onChange={(e) => setShowResT(e.target.checked)} />
                Mostrar resultados — Tradicional
              </label>
            </div>

            {(modoT === "pct" && (pctsT.p1Pct + pctsT.pmPct) > 100) && (
              <Warning>En Tradicional, % inicial + % mensualidades supera 100%. Ajusta para que el restante no sea negativo.</Warning>
            )}
            {(modoT === "abs" && (t_ini_T_abs + t_mens_T_abs) > V) && (
              <Warning>En Tradicional, $ primer pago + $ mensualidades supera el valor del departamento.</Warning>
            )}
          </div>

          {/* Resultados — Tradicional */}
          <div className={\`rounded-2xl bg-white p-5 shadow-sm \${showResT ? '' : 'hidden'}\`}>
            <h3 className="mb-4 text-lg font-medium">Resultados — Tradicional</h3>
            <div className="grid gap-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between"><span>Valor inicial</span><span className="font-medium">{formatCurrency(V)}</span></div>
                <div className="mt-1 flex items-center justify-between"><span>Tasa mensual efectiva</span><span className="font-medium">{formatPercent(T.i)}</span></div>
                <div className="mt-1 flex items-center justify-between"><span>Número de mensualidades</span><span className="font-medium">{T.n}</span></div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3">
                <div className="font-medium mb-1">Parámetros (ambas unidades)</div>
                <div className="grid grid-cols-3 gap-2">
                  <div><div className="text-gray-500">Primer pago</div><div>{pctsT.p1Pct.toFixed(2)}% · {formatCurrency(V * (pctsT.p1Pct/100))}</div></div>
                  <div><div className="text-gray-500">Mensualidades</div><div>{pctsT.pmPct.toFixed(2)}% · {formatCurrency(V * (pctsT.pmPct/100))}</div></div>
                  <div><div className="text-gray-500">Restante</div><div>{pctsT.prPct.toFixed(2)}% · {formatCurrency(V * (pctsT.prPct/100))}</div></div>
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between"><span>Monto por mensualidad</span><span className="font-medium">{formatCurrency(T.pagoMensual)}</span></div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between"><span>VPN Tradicional</span><span className="font-semibold">{formatCurrency(T.vpn)}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna — Personalizado */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Esquema: Personalizado</h2>
              <ToggleModo value={modoP} onChange={(v) => setModoP(v)} />
            </div>

            {modoP === "pct" ? (
              <>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <PercentField label="% primer pago" valuePct={t_ini_P_pct} onChange={setTIniPPct} />
                  <PercentField label="% en mensualidades" valuePct={t_mens_P_pct} onChange={setTMensPPct} />
                  <PercentField label="% restante (auto)" valuePct={pctsP.prPct} onChange={() => {}} readOnly />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-gray-600">
                  <div>$ equiv.: <span className="font-medium">{formatCurrency((V * pctsP.p1Pct) / 100)}</span></div>
                  <div>$ equiv.: <span className="font-medium">{formatCurrency((V * pctsP.pmPct) / 100)}</span></div>
                  <div>$ equiv.: <span className="font-medium">{formatCurrency((V * pctsP.prPct) / 100)}</span></div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <CurrencyField label="$ primer pago" value={t_ini_P_abs} onChange={setTIniPAbs} />
                  <CurrencyField label="$ total en mensualidades" value={t_mens_P_abs} onChange={setTMensPAbs} />
                  <CurrencyField label="$ restante (auto)" value={Math.max(0, V - (t_ini_P_abs + t_mens_P_abs))} onChange={() => {}} disabled />
                </div>
                <div className="mt-2 grid grid-cols-3 gap-3 text-xs text-gray-600">
                  <div>% equiv.: <span className="font-medium">{((t_ini_P_abs / (V || 1)) * 100).toFixed(2)}%</span></div>
                  <div>% equiv.: <span className="font-medium">{((t_mens_P_abs / (V || 1)) * 100).toFixed(2)}%</span></div>
                  <div>% equiv.: <span className="font-medium">{(Math.max(0, 100 - (((t_ini_P_abs + t_mens_P_abs) / (V || 1)) * 100))).toFixed(2)}%</span></div>
                </div>
              </>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={restEnNmas1_P} onChange={(e) => setRestEnNmas1_P(e.target.checked)} />
                Cobrar el % restante en el mes N+1
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={showResP} onChange={(e) => setShowResP(e.target.checked)} />
                Mostrar resultados — Personalizado
              </label>
            </div>

            {(modoP === "pct" && (pctsP.p1Pct + pctsP.pmPct) > 100) && (
              <Warning>En Personalizado, % inicial + % mensualidades supera 100%. Ajusta para que el restante no sea negativo.</Warning>
            )}
            {(modoP === "abs" && (t_ini_P_abs + t_mens_P_abs) > V) && (
              <Warning>En Personalizado, $ primer pago + $ mensualidades supera el valor del departamento.</Warning>
            )}
          </div>

          {/* Resultados — Personalizado */}
          <div className={\`rounded-2xl bg-white p-5 shadow-sm \${showResP ? '' : 'hidden'}\`}>
            <h3 className="mb-4 text-lg font-medium">Resultados — Personalizado</h3>
            <div className="grid gap-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between"><span>Valor inicial</span><span className="font-medium">{formatCurrency(V)}</span></div>
                <div className="mt-1 flex items-center justify-between"><span>Tasa mensual efectiva</span><span className="font-medium">{formatPercent(P.i)}</span></div>
                <div className="mt-1 flex items-center justify-between"><span>Número de mensualidades</span><span className="font-medium">{P.n}</span></div>
              </div>
              <div className="rounded-2xl bg-gray-50 p-3">
                <div className="font-medium mb-1">Parámetros (ambas unidades)</div>
                <div className="grid grid-cols-3 gap-2">
                  <div><div className="text-gray-500">Primer pago</div><div>{pctsP.p1Pct.toFixed(2)}% · {formatCurrency(V * (pctsP.p1Pct/100))}</div></div>
                  <div><div className="text-gray-500">Mensualidades</div><div>{pctsP.pmPct.toFixed(2)}% · {formatCurrency(V * (pctsP.pmPct/100))}</div></div>
                  <div><div className="text-gray-500">Restante</div><div>{pctsP.prPct.toFixed(2)}% · {formatCurrency(V * (pctsP.prPct/100))}</div></div>
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between"><span>Monto por mensualidad</span><span className="font-medium">{formatCurrency(P.pagoMensual)}</span></div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <div className="flex items-center justify-between"><span>VPN Personalizado</span><span className="font-semibold">{formatCurrency(P.vpn)}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Diferencia esperada */}
      <div className="mt-8 rounded-2xl border bg-white p-5 text-sm text-gray-700">
        <h3 className="mb-2 text-base font-medium">Resultado esperado</h3>
        <div className="grid gap-2">
          <div className="rounded-xl bg-gray-50 p-3 flex items-center justify-between">
            <span>Diferencia de VPN (Tradicional − Personalizado)</span>
            <span className="text-base font-semibold">{formatCurrency(diffVPN)}</span>
          </div>
          <div className="text-xs text-gray-500">Si el valor es positivo, el Tradicional tiene mayor valor presente; si es negativo, el Personalizado es más valioso.</div>
        </div>
      </div>
    </div>
  );
}
