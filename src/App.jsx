import React, { useState } from 'react';
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


  const handleCalculate = () => {
    const sizes1 = material1.sizes.split(',').map(Number);
    const percentages1 = material1.percentages.split(',').map(Number);
    const ratio1 = material1.ratio / 100;

    const sizes2 = material2.sizes.split(',').map(Number);
    const percentages2 = material2.percentages.split(',').map(Number);
    const ratio2 = material2.ratio / 100;

    // Assumption: sizes1 and sizes2 are the same. We'll use sizes1 for the x-axis.
    // A more robust implementation would handle differing size arrays.
    if (sizes1.length !== percentages1.length || sizes2.length !== percentages2.length || sizes1.length !== sizes2.length) {
      alert('各原料の粒径と通過質量百分率のデータ数が一致していることを確認してください。');
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
  };

  const createPlotData = () => {
    const traces = [];

    // Material 1
    traces.push({
      x: material1.sizes.split(',').map(Number),
      y: material1.percentages.split(',').map(Number),
      mode: 'lines+markers',
      name: '原料1',
      type: 'scatter'
    });

    // Material 2
    traces.push({
      x: material2.sizes.split(',').map(Number),
      y: material2.percentages.split(',').map(Number),
      mode: 'lines+markers',
      name: '原料2',
      type: 'scatter'
    });

    // Synthetic
    if (syntheticData) {
      traces.push({
        x: syntheticData.sizes,
        y: syntheticData.percentages,
        mode: 'lines+markers',
        name: '合成粒度',
        type: 'scatter',
        line: { color: 'red', width: 4 }
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

      <button onClick={handleCalculate} style={{ marginTop: '20px', padding: '10px 20px' }}>
        合成粒度を計算
      </button>

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
