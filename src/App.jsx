import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

const PRESETS = {
  road_base: [53, 37.5, 31.5, 26.5, 19.0, 13.2, 4.75, 2.36, 0.425, 0.075],
  demo: [0.075, 0.15, 0.3, 0.6, 1.18, 2.36, 4.75, 9.5, 19],
};

function App() {
  const [sieveSizes, setSieveSizes] = useState(PRESETS.demo);
  const [materials, setMaterials] = useState([
    {
      name: '原料1',
      ratio: 50,
      percentages: Array(sieveSizes.length).fill(''),
    },
    {
      name: '原料2',
      ratio: 50,
      percentages: Array(sieveSizes.length).fill(''),
    },
  ]);
  const [syntheticData, setSyntheticData] = useState(null);

  const handlePresetChange = (event) => {
    const newSieveSizes = PRESETS[event.target.value];
    setSieveSizes(newSieveSizes);
    setMaterials(
      materials.map((m) => ({
        ...m,
        percentages: Array(newSieveSizes.length).fill(''),
      }))
    );
  };

  const handlePercentageChange = (materialIndex, sieveIndex, value) => {
    const newMaterials = [...materials];
    newMaterials[materialIndex].percentages[sieveIndex] = value;
    setMaterials(newMaterials);
  };

  const handleRatioChange = (materialIndex, value) => {
    const newMaterials = [...materials];
    const newRatio = Math.max(0, Math.min(100, Number(value)));
    newMaterials[materialIndex].ratio = newRatio;

    if (materials.length === 2) {
      const otherIndex = 1 - materialIndex;
      newMaterials[otherIndex].ratio = 100 - newRatio;
    }
    setMaterials(newMaterials);
  };

  useEffect(() => {
    const totalRatio = materials.reduce((sum, m) => sum + m.ratio, 0);
    const normalizedMaterials = materials.map(m => ({
      ...m,
      normalizedRatio: (m.ratio / totalRatio) || 0,
    }));

    const syntheticPercentages = sieveSizes.map((_, sieveIndex) => {
      let weightedSum = 0;
      let totalWeight = 0;

      normalizedMaterials.forEach(material => {
        const percentage = parseFloat(material.percentages[sieveIndex]);
        if (!isNaN(percentage)) {
          weightedSum += percentage * material.normalizedRatio;
          totalWeight += material.normalizedRatio;
        }
      });

      return totalWeight > 0 ? weightedSum / totalWeight : null;
    });

    const validSyntheticData = syntheticPercentages.some(p => p !== null);

    if (validSyntheticData) {
      setSyntheticData({
        sizes: sieveSizes,
        percentages: syntheticPercentages,
      });
    } else {
      setSyntheticData(null);
    }
  }, [materials, sieveSizes]);

  const createPlotData = () => {
    const traces = [];

    materials.forEach((material, index) => {
      const x = [];
      const y = [];
      sieveSizes.forEach((size, i) => {
        const percentage = parseFloat(material.percentages[i]);
        if (!isNaN(percentage)) {
          x.push(size);
          y.push(percentage);
        }
      });

      if (x.length > 0) {
        traces.push({
          x,
          y,
          mode: 'lines+markers',
          name: material.name,
          type: 'scatter',
          line: { width: 2 },
        });
      }
    });

    if (syntheticData) {
      const x = [];
      const y = [];
      syntheticData.sizes.forEach((size, i) => {
        if (syntheticData.percentages[i] !== null) {
          x.push(size);
          y.push(syntheticData.percentages[i]);
        }
      });

      if (x.length > 0) {
        traces.push({
          x,
          y,
          mode: 'lines+markers',
          name: '合成粒度',
          type: 'scatter',
          line: { color: 'black', width: 5 },
        });
      }
    }

    return traces;
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>粒度加積曲線ジェネレーター</h1>

      <div>
        <label>粒径セット（プリセット）の切替: </label>
        <select onChange={handlePresetChange} defaultValue="demo">
          <option value="demo">既存のデモ用</option>
          <option value="road_base">路盤材向け</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        {materials.map((material, matIndex) => (
          <div key={matIndex}>
            <h2>{material.name}</h2>
            <label>配合比 (%): </label>
            <input
              type="number"
              value={material.ratio}
              onChange={(e) => handleRatioChange(matIndex, e.target.value)}
              min="0"
              max="100"
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>各ふるい（粒径）ごと入力</h3>
        <table border="1" style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={{ padding: '8px' }}>粒径 (mm)</th>
              {materials.map((material, index) => (
                <th key={index} style={{ padding: '8px' }}>
                  {material.name} 通過質量百分率 (%)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sieveSizes.map((size, sieveIndex) => (
              <tr key={sieveIndex}>
                <td style={{ padding: '8px' }}>{size}</td>
                {materials.map((_, matIndex) => (
                  <td key={matIndex} style={{ padding: '8px' }}>
                    <input
                      type="number"
                      value={materials[matIndex].percentages[sieveIndex]}
                      onChange={(e) => handlePercentageChange(matIndex, sieveIndex, e.target.value)}
                      style={{ width: '90%' }}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
          showlegend: true,
        }}
      />
    </div>
  );
}

export default App;
