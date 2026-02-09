/**
 * Foresight SDK Components — "High-Level Atoms"
 *
 * These are serialized as a JS string and injected into the LivePreview iframe
 * as part of the @keystone-os/foresight virtual module.
 *
 * The AI Architect Agent uses these atoms to compose interactive What-If dashboards
 * without writing raw D3/chart code.
 *
 * Components:
 *   <ScenarioContainer>   — Wraps simulation state, manages variables + data fetch
 *   <VariableControl>     — Slider/toggle for a single what-if variable
 *   <ProjectionChart>     — Line chart rendering historical + projected data
 *   <ImpactCard>          — Shows delta impact (e.g. "You lose $50k")
 *   <SimulatedLineChart>  — Simplified alias for ProjectionChart
 *   <ParameterSlider>     — Simplified alias for VariableControl (slider only)
 */

export const FORESIGHT_SDK_MODULE = `
(function() {
  var React = window.React;
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useCallback = React.useCallback;
  var useRef = React.useRef;
  var useMemo = React.useMemo;

  // ─── Utility: Format currency ─────────────────────────────────────
  function fmt(n, decimals) {
    if (n == null) return '--';
    decimals = decimals != null ? decimals : 2;
    var abs = Math.abs(n);
    if (abs >= 1e9) return (n < 0 ? '-' : '') + '$' + (abs / 1e9).toFixed(1) + 'B';
    if (abs >= 1e6) return (n < 0 ? '-' : '') + '$' + (abs / 1e6).toFixed(1) + 'M';
    if (abs >= 1e3) return (n < 0 ? '-' : '') + '$' + (abs / 1e3).toFixed(1) + 'K';
    return (n < 0 ? '-' : '') + '$' + abs.toFixed(decimals);
  }

  function pct(n) {
    if (n == null) return '--';
    return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
  }

  // ─── useSimulation Hook ───────────────────────────────────────────
  function useSimulation(config) {
    var _d = useState(null), data = _d[0], setData = _d[1];
    var _l = useState(false), loading = _l[0], setLoading = _l[1];
    var _e = useState(null), error = _e[0], setError = _e[1];

    var run = useCallback(function(variables) {
      setLoading(true);
      setError(null);
      var body = {
        portfolio: config.portfolio || [],
        variables: variables || config.variables || [],
        timeframeMonths: config.timeframeMonths || 12,
        granularity: config.granularity || 'monthly'
      };
      return keystoneBridge.call('foresight.simulate', body, 60000)
        .then(function(result) { setData(result); return result; })
        .catch(function(err) { setError(err.message || 'Simulation failed'); return null; })
        .finally(function() { setLoading(false); });
    }, [config.portfolio, config.timeframeMonths, config.granularity]);

    return { data: data, loading: loading, error: error, run: run };
  }

  // ─── ScenarioContainer ────────────────────────────────────────────
  function ScenarioContainer(props) {
    var title = props.title || 'What-If Scenario';
    var description = props.description || '';

    return h('div', {
      style: {
        background: 'linear-gradient(135deg, rgba(16,185,129,0.05) 0%, rgba(9,9,11,0.95) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '24px',
        fontFamily: 'ui-monospace, monospace',
        color: 'white',
        minHeight: '200px',
      }
    },
      h('div', { style: { marginBottom: '20px' } },
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' } },
          h('div', { style: { width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' } }),
          h('span', { style: { fontSize: '9px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: '#71717a' } }, 'KEYSTONE FORESIGHT')
        ),
        h('h2', { style: { fontSize: '18px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: '0 0 4px 0' } }, title),
        description && h('p', { style: { fontSize: '11px', color: '#71717a', margin: 0 } }, description)
      ),
      props.children
    );
  }

  // ─── VariableControl ──────────────────────────────────────────────
  function VariableControl(props) {
    var label = props.label || 'Variable';
    var min = props.min != null ? props.min : -100;
    var max = props.max != null ? props.max : 100;
    var step = props.step != null ? props.step : 1;
    var value = props.value != null ? props.value : 0;
    var onChange = props.onChange || function() {};
    var unit = props.unit || '%';
    var type = props.type || 'slider'; // 'slider' | 'toggle'

    if (type === 'toggle') {
      return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px' } },
        h('span', { style: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa' } }, label),
        h('button', {
          onClick: function() { onChange(!value); },
          style: {
            width: '40px', height: '20px', borderRadius: '10px', border: 'none', cursor: 'pointer',
            background: value ? '#10b981' : '#3f3f46', position: 'relative', transition: 'background 0.2s'
          }
        },
          h('div', { style: { width: '16px', height: '16px', borderRadius: '50%', background: 'white', position: 'absolute', top: '2px', left: value ? '22px' : '2px', transition: 'left 0.2s' } })
        )
      );
    }

    // Slider
    var displayValue = unit === '%' ? value.toFixed(1) + '%' : unit === '$' ? fmt(value) : value.toFixed(2) + ' ' + unit;
    var isNegative = value < 0;

    return h('div', { style: { padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '8px' } },
      h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' } },
        h('span', { style: { fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#a1a1aa' } }, label),
        h('span', { style: { fontSize: '13px', fontWeight: 900, fontFamily: 'monospace', color: isNegative ? '#ef4444' : '#10b981' } }, displayValue)
      ),
      h('input', {
        type: 'range', min: min, max: max, step: step, value: value,
        onChange: function(e) { onChange(parseFloat(e.target.value)); },
        style: { width: '100%', accentColor: '#10b981', height: '4px', cursor: 'pointer' }
      })
    );
  }

  // Alias
  var ParameterSlider = VariableControl;

  // ─── ProjectionChart ──────────────────────────────────────────────
  function ProjectionChart(props) {
    var data = props.data || [];
    var height = props.height || 200;
    var label = props.label || 'Projected Value';
    var showBaseline = props.showBaseline !== false;

    if (data.length === 0) {
      return h('div', { style: { height: height + 'px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#52525b', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase' } }, 'Run simulation to see projection...');
    }

    var values = data.map(function(d) { return d.totalValue != null ? d.totalValue : d.value || 0; });
    var maxVal = Math.max.apply(null, values);
    var minVal = Math.min.apply(null, values);
    var range = maxVal - minVal || 1;
    var baselineVal = values[0] || 0;
    var chartWidth = 100; // percentage
    var padTop = 20;
    var padBot = 30;
    var chartH = height - padTop - padBot;

    // Build SVG path
    var points = values.map(function(v, i) {
      var x = (i / (values.length - 1)) * chartWidth;
      var y = padTop + chartH - ((v - minVal) / range) * chartH;
      return x.toFixed(2) + ',' + y.toFixed(2);
    });
    var linePath = 'M' + points.join(' L');
    var areaPath = linePath + ' L' + chartWidth + ',' + (padTop + chartH) + ' L0,' + (padTop + chartH) + ' Z';

    // Baseline
    var baselineY = padTop + chartH - ((baselineVal - minVal) / range) * chartH;

    // End color
    var endVal = values[values.length - 1];
    var isPositive = endVal >= baselineVal;
    var lineColor = isPositive ? '#10b981' : '#ef4444';
    var areaFill = isPositive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';

    return h('div', { style: { marginBottom: '12px' } },
      h('div', { style: { fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#71717a', marginBottom: '8px' } }, label),
      h('svg', {
        viewBox: '0 0 100 ' + height,
        width: '100%',
        height: height,
        preserveAspectRatio: 'none',
        style: { display: 'block', borderRadius: '8px', background: 'rgba(0,0,0,0.3)' }
      },
        // Area fill
        h('path', { d: areaPath, fill: areaFill }),
        // Baseline
        showBaseline && h('line', { x1: 0, y1: baselineY, x2: chartWidth, y2: baselineY, stroke: '#3f3f46', strokeWidth: '0.3', strokeDasharray: '2,2' }),
        // Line
        h('path', { d: linePath, fill: 'none', stroke: lineColor, strokeWidth: '0.6' }),
        // End dot
        h('circle', { cx: chartWidth, cy: parseFloat(points[points.length - 1].split(',')[1]), r: '1.2', fill: lineColor }),
        // Labels
        h('text', { x: 2, y: padTop - 5, fill: '#52525b', fontSize: '3.5', fontFamily: 'monospace' }, fmt(maxVal)),
        h('text', { x: 2, y: padTop + chartH + 10, fill: '#52525b', fontSize: '3.5', fontFamily: 'monospace' }, fmt(minVal)),
        h('text', { x: chartWidth - 2, y: padTop + chartH + 10, fill: '#52525b', fontSize: '3.5', fontFamily: 'monospace', textAnchor: 'end' },
          data[data.length - 1]?.date || ''
        )
      )
    );
  }

  // Alias
  var SimulatedLineChart = ProjectionChart;

  // ─── ImpactCard ───────────────────────────────────────────────────
  function ImpactCard(props) {
    var label = props.label || 'Impact';
    var currentValue = props.currentValue || 0;
    var projectedValue = props.projectedValue || 0;
    var delta = projectedValue - currentValue;
    var deltaP = currentValue !== 0 ? (delta / currentValue) * 100 : 0;
    var isPositive = delta >= 0;
    var riskFlags = props.riskFlags || [];
    var runway = props.runwayMonths;

    var color = isPositive ? '#10b981' : '#ef4444';
    var bgColor = isPositive ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
    var borderColor = isPositive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)';

    return h('div', {
      style: {
        padding: '16px', borderRadius: '12px', background: bgColor, border: '1px solid ' + borderColor,
        marginBottom: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'
      }
    },
      h('div', null,
        h('div', { style: { fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#71717a', marginBottom: '4px' } }, label),
        h('div', { style: { fontSize: '22px', fontWeight: 900, color: color, fontFamily: 'monospace', letterSpacing: '-0.03em' } },
          (isPositive ? '+' : '') + fmt(delta)
        ),
        h('div', { style: { fontSize: '11px', color: '#a1a1aa', fontFamily: 'monospace' } }, pct(deltaP))
      ),
      h('div', { style: { textAlign: 'right' } },
        h('div', { style: { fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#71717a', marginBottom: '4px' } }, 'Projected End'),
        h('div', { style: { fontSize: '16px', fontWeight: 900, color: 'white', fontFamily: 'monospace' } }, fmt(projectedValue)),
        runway != null && h('div', { style: { fontSize: '10px', color: '#ef4444', fontWeight: 700, marginTop: '4px' } },
          '\\u26A0 Runway: ' + runway.toFixed(1) + ' months'
        ),
        riskFlags.length > 0 && h('div', { style: { display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px', flexWrap: 'wrap' } },
          riskFlags.map(function(f, i) {
            return h('span', { key: i, style: { fontSize: '8px', padding: '2px 6px', borderRadius: '4px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', fontWeight: 700, textTransform: 'uppercase' } }, f);
          })
        )
      )
    );
  }

  // ─── Register on window ───────────────────────────────────────────
  window.__keystoneForesight = {
    useSimulation: useSimulation,
    ScenarioContainer: ScenarioContainer,
    VariableControl: VariableControl,
    ParameterSlider: ParameterSlider,
    ProjectionChart: ProjectionChart,
    SimulatedLineChart: SimulatedLineChart,
    ImpactCard: ImpactCard,
  };
  window.__keystoneForesight.__esModule = true;
})();
`;
