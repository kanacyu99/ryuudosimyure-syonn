import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

function App() {
  const [material1, setMaterial1] = useState({
    sizes: '0.075, 0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 9.5, 19',
    percentages: '5, 10, 20, 30, 40, 50, 60, 80, 100',
    ratio: 50,
  });
  const [material2, setMaterial2] = useState({
    sizes: '0.075, 0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 9.5, 19',
    percentages: '15, 25, 35, 45, 55, 65, 75, 90, 100',
    ratio: 50,
  });

  const [syntheticData, setSyntheticData] = useState(null);

  const handleRatio1Change = (e) => {
    const newRatio1 = parseFloat(e.target.value);
    if (!isNaN(newRatio1) && newRatio1 >= 0 && newRatio1 <= 100) {
      setMaterial1({ ...material1, ratio: newRatio1 });
      setMaterial2({ ...material2, ratio: 100 - newRatio1 });
    }
  };

  const handleRatio2Change = (e) => {
    const newRatio2 = parseFloat(e.target.value);
    if (!isNaN(newRatio2) && newRatio2 >= 0 && newRatio2 <= 100) {
      setMaterial2({ ...material2, ratio: newRatio2 });
      setMaterial1({ ...material1, ratio: 100 - newRatio2 });
    }
  };

  useEffect(() => {
    const sizes1Str = material1.sizes.split(',');
    const percentages1Str = material1.percentages.split(',');
    const sizes2Str = material2.sizes.split(',');
    const percentages2Str = material2.percentages.split(',');

    if (
      sizes1Str.length !== percentages1Str.length ||
      sizes2Str.length !== percentages2Str.length ||
      sizes1Str.length !== sizes2Str.length ||
      sizes1Str.includes('') ||
      percentages1Str.includes('') ||
      sizes2Str.includes('') ||
      percentages2Str.includes('')
    ) {
      setSyntheticData(null); // データが不完全な場合は合成データをクリア
      return;
    }

    const sizes1 = sizes1Str.map(Number);
    const percentages1 = percentages1Str.map(Number);
    const ratio1 = material1.ratio / 100;

    const sizes2 = sizes2Str.map(Number);
    const percentages2 = percentages2Str.map(Number);
    const ratio2 = material2.ratio / 100;

    if (sizes1.some(isNaN) || percentages1.some(isNaN) || sizes2.some(isNaN) || percentages2.some(isNaN)) {
      setSyntheticData(null); // 数値に変換できないデータが含まれている場合はクリア
      return;
    }

    const syntheticPercentages = percentages1.map((p1, index) => {
      const p2 = percentages2[index];
      return p1 * ratio1 + p2 * ratio2;
    });

    setSyntheticData({
      sizes: sizes1,
      percentages: syntheticPercentages,
    });
  }, [material1, material2]);

  const createPlotData = () => {
    const traces = [];

    // Material 1
    // Material 1
    const sizes1Str = material1.sizes.split(',');
    const percentages1Str = material1.percentages.split(',');
    if (sizes1Str.length === percentages1Str.length && !sizes1Str.includes('') && !percentages1Str.includes('')) {
      traces.push({
        x: sizes1Str.map(Number),
        y: percentages1Str.map(Number),
        mode: 'lines+markers',
        name: '原料1',
        type: 'scatter',
        line: { width: 2 }
      });
    }

    // Material 2
    const sizes2Str = material2.sizes.split(',');
    const percentages2Str = material2.percentages.split(',');
    if (sizes2Str.length === percentages2Str.length && !sizes2Str.includes('') && !percentages2Str.includes('')) {
      traces.push({
        x: sizes2Str.map(Number),
        y: percentages2Str.map(Number),
        mode: 'lines+markers',
        name: '原料2',
        type: 'scatter',
        line: { width: 2 }
      });
    }

    // Synthetic
    if (syntheticData) {
      traces.push({
        x: syntheticData.sizes,
        y: syntheticData.percentages,
        mode: 'lines+markers',
        name: '合成粒度',
        type: 'scatter',
        line: { color: 'black', width: 5 }
      });
    }

    return traces;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>粒度加積曲線ジェネレーター</h1>
      <div style={{ display: 'flex', gap: '20px' }}>
        <div>
          <h2>原料1</h2>
          <label>配合比 (%):</label>
          <input
            type="number"
            value={material1.ratio}
            onChange={handleRatio1Change}
          />
          <br />
          <label>粒径 (mm) (カンマ区切り):</label>
          <br />
          <textarea
            rows="5"
            cols="30"
            value={material1.sizes}
            onChange={(e) => setMaterial1({ ...material1, sizes: e.target.value })}
          />
          <br />
          <label>通過質量百分率 (%) (カンマ区切り):</label>
          <br />
          <textarea
            rows="5"
            cols="30"
            value={material1.percentages}
            onChange={(e) => setMaterial1({ ...material1, percentages: e.target.value })}
          />
        </div>
        <div>
          <h2>原料2</h2>
          <label>配合比 (%):</label>
          <input
            type="number"
            value={material2.ratio}
            onChange={handleRatio2Change}
          />
          <br />
          <label>粒径 (mm) (カンマ区切り):</label>
          <br />
          <textarea
            rows="5"
            cols="30"
            value={material2.sizes}
            onChange={(e) => setMaterial2({ ...material2, sizes: e.target.value })}
          />
          <br />
          <label>通過質量百分率 (%) (カンマ区切り):</label>
          <br />
          <textarea
            rows="5"
            cols="30"
            value={material2.percentages}
            onChange={(e) => setMaterial2({ ...material2, percentages: e.target.value })}
          />
        </div>
      </div>

      <Plot
        data={createPlotData()}
        layout={{
          title: '粒度加積曲線',
          xaxis: {
            title: '粒径 (mm)',
            type: 'log',
            autorange: true,
          },
          yaxis: {
            title: '通過質量百分率 (%)',
            range: [0, 101],
          },
          width: 800,
          height: 600,
          margin: { t: 50, b: 50, l: 50, r: 50 },
          showlegend: true
        }}
      />
    </div>
  );
}

export default App;
