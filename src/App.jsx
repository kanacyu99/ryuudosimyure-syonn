/**
 * @file App.jsx
 * @description
 * 粒度加積曲線ジェネレーターおよび配合比探索ツール
 *
 * --- 機能概要 ---
 * 1. **合成粒度曲線のリアルタイム表示:**
 *    - 2種類の原料（原料1, 原料2）の粒度試験結果（粒径と通過質量百分率）と配合比率を入力すると、
 *      加重平均で計算された合成粒度加積曲線がリアルタイムでグラフに描画されます。
 *    - 原料の曲線は細線で、合成曲線は太い黒線で表示されます。
 *
 * 2. **製品規格との比較:**
 *    - ドロップダウンから製品規格（例: HMS-25）を選択すると、その規格の上限値・下限値がグラフに点線で表示されます。
 *    - 現在の配合比での合成粒度が、規格の各粒径ポイントで適合しているかどうかがリアルタイムで判定され、
 *      「規格判定結果」テーブルにOK/NGで表示されます。
 *
 * 3. **最適配合比の自動探索:**
 *    - 「配合比を探索」ボタンをクリックすると、原料1の比率を0%から100%まで1%刻みで総当たりで計算し、
 *      選択した製品規格をすべて満たす配合比率の範囲を探索します。
 *    - 結果として、適合範囲（例: 45% 〜 62%）と、その中央値を推奨配合比として表示します。
 *    - 適合する比率が見つからない場合は、その旨のメッセージが表示されます。
 *
 * --- 使い方 ---
 * 1. **データ入力:**
 *    - 「原料1」「原料2」の各テキストエリアに、粒径（mm）と通過質量百分率（%）をカンマ区切りで入力します。
 *      (例: 0.075, 0.15, 0.3, ...)
 *    - 各原料のデータ点数は一致させてください。
 * 2. **配合比の調整:**
 *    - スライダーまたは入力フィールドで原料1と原料2の配合比率を調整します。グラフがリアルタイムで更新されます。
 * 3. **規格の選択と確認:**
 *    - 「製品規格を選択」ドロップダウンから比較したい規格を選びます。
 *    - 「グラフに規格範囲を表示」チェックボックスで、グラフ上の規格線の表示/非表示を切り替えられます。
 *    - 画面下部の「規格判定結果」テーブルで、現在の配合比でのOK/NG箇所を確認します。
 * 4. **配合比の探索:**
 *    - 「配合比を探索」ボタンをクリックすると、最適な配合比の探索が開始され、結果が表示されます。
 */
import React, { useState, useEffect } from 'react';
import Plot from 'react-plotly.js';

const standards = {
  'HMS-25': {
    53: { lower: 100, upper: 100 },
    37.5: { lower: 95, upper: 100 },
    31.5: { lower: null, upper: null },
    26.5: { lower: 80, upper: 95 },
    19.0: { lower: null, upper: null },
    13.2: { lower: 55, upper: 75 },
    4.75: { lower: 35, upper: 55 },
    2.36: { lower: 25, upper: 45 },
    0.425: { lower: 10, upper: 25 },
    0.075: { lower: 4, upper: 10 },
  },
  'MS-25': {
    53: { lower: 100, upper: 100 },
    37.5: { lower: 90, upper: 100 },
    31.5: { lower: null, upper: null },
    26.5: { lower: 75, upper: 95 },
    19.0: { lower: null, upper: null },
    13.2: { lower: 50, upper: 70 },
    4.75: { lower: 30, upper: 50 },
    2.36: { lower: 20, upper: 40 },
    0.425: { lower: 8, upper: 22 },
    0.075: { lower: 2, upper: 8 },
  },
  'CS-40': {
    53: { lower: 100, upper: 100 },
    37.5: { lower: 90, upper: 100 },
    31.5: { lower: null, upper: null },
    26.5: { lower: null, upper: null },
    19.0: { lower: 55, upper: 80 },
    13.2: { lower: null, upper: null },
    4.75: { lower: 30, upper: 50 },
    2.36: { lower: 20, upper: 40 },
    0.425: { lower: 8, upper: 20 },
    0.075: { lower: 0, upper: 7 },
  },
};

/**
 * 対数線形補間を行うヘルパー関数。
 * 粒度分布曲線のような対数スケールのX軸を持つグラフ上で、
 * 既知の点 (xPoints, yPoints) を基に、任意のx座標に対するy座標を計算する。
 * @param {number} x - 補間したいx座標（粒径）。
 * @param {number[]} xPoints - 既知の点のx座標（粒径）の配列。
 * @param {number[]} yPoints - 既知の点のy座標（通過率）の配列。
 * @returns {number | null} - 補間されたy座標の値。計算不可能な場合はnull。
 */
const interpolate = (x, xPoints, yPoints) => {
  if (xPoints.length === 0) return null;

  const logX = Math.log(x);
  const logXPoints = xPoints.map(p => Math.log(p));

  // Find the two points that bracket x
  let i = 0;
  while (i < logXPoints.length - 1 && logXPoints[i] < logX) {
    i++;
  }
  if (i === 0) return yPoints[0];

  const x1 = logXPoints[i - 1];
  const y1 = yPoints[i - 1];
  const x2 = logXPoints[i];
  const y2 = yPoints[i];

  if (x1 === x2) return y1;

  // Perform linear interpolation in log space
  const interpolatedY = y1 + (y2 - y1) * (logX - x1) / (x2 - x1);
  return interpolatedY;
};


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
  const [selectedStandard, setSelectedStandard] = useState(Object.keys(standards)[0]);
  const [showStandard, setShowStandard] = useState(true);
  const [searchResult, setSearchResult] = useState(null);
  const [specCheckResults, setSpecCheckResults] = useState([]);

  // useEffectフック: 合成データまたは選択規格が変更されたときに、規格判定を再実行する
  useEffect(() => {
    if (!syntheticData || !standards[selectedStandard]) {
      setSpecCheckResults([]);
      return;
    }

    const standard = standards[selectedStandard];
    const syntheticSizes = syntheticData.sizes;
    const syntheticPercentages = syntheticData.percentages;

    const results = Object.keys(standard)
      .map(Number)
      .sort((a, b) => b - a) // Display in descending order
      .map(size => {
        const { lower, upper } = standard[size];
        if (lower === null && upper === null) {
          return null; // Skip sizes with no spec
        }

        const interpolatedValue = interpolate(size, syntheticSizes, syntheticPercentages);
        const roundedValue = interpolatedValue ? parseFloat(interpolatedValue.toFixed(2)) : null;

        let status = 'OK';
        if (roundedValue !== null) {
          if ((lower !== null && roundedValue < lower) || (upper !== null && roundedValue > upper)) {
            status = 'NG';
          }
        } else {
            status = 'データなし';
        }

        return {
          size,
          lower,
          value: roundedValue,
          upper,
          status,
        };
      }).filter(Boolean); // Remove null entries

    setSpecCheckResults(results);
  }, [syntheticData, selectedStandard]);

  /**
   * 「配合比を探索」ボタンがクリックされたときに実行される関数。
   * 原料1の比率を0%から100%まで1%刻みで総当たりし、選択中の製品規格を
   * すべて満たす配合比率の範囲を見つけ出す。
   */
  const handleSearch = () => {
    // --- 1. 入力データの前処理と検証 ---
    const sizes1Str = material1.sizes.split(',');
    const percentages1Str = material1.percentages.split(',');
    const sizes2Str = material2.sizes.split(',');
    const percentages2Str = material2.percentages.split(',');

    if (
      sizes1Str.length !== percentages1Str.length ||
      sizes2Str.length !== percentages2Str.length ||
      sizes1Str.length !== sizes2Str.length ||
      sizes1Str.some(s => s.trim() === '') ||
      percentages1Str.some(p => p.trim() === '') ||
      sizes2Str.some(s => s.trim() === '') ||
      percentages2Str.some(p => p.trim() === '')
    ) {
      alert('原料のデータが不完全です。粒径と通過質量百分率のすべてのフィールドを入力してください。');
      return;
    }

    const sizes1 = sizes1Str.map(Number);
    const percentages1 = percentages1Str.map(Number);
    const sizes2 = sizes2Str.map(Number);
    const percentages2 = percentages2Str.map(Number);

    if (sizes1.some(isNaN) || percentages1.some(isNaN) || sizes2.some(isNaN) || percentages2.some(isNaN)) {
      alert('原料データに無効な数値が含まれています。');
      return;
    }

    const standard = standards[selectedStandard];
    const standardSizes = Object.keys(standard).map(Number).filter(size => standard[size].lower !== null || standard[size].upper !== null);

    const validRatios = [];

    for (let ratio1Percent = 0; ratio1Percent <= 100; ratio1Percent++) {
      const ratio1 = ratio1Percent / 100;
      const ratio2 = 1 - ratio1;

      const syntheticPercentages = percentages1.map((p1, index) => p1 * ratio1 + percentages2[index] * ratio2);

      let isOk = true;
      for (const size of standardSizes) {
        const interpolatedValue = interpolate(size, sizes1, syntheticPercentages);
        if (interpolatedValue === null) {
          isOk = false;
          break;
        }

        const { lower, upper } = standard[size];
        if ((lower !== null && interpolatedValue < lower) || (upper !== null && interpolatedValue > upper)) {
          isOk = false;
          break;
        }
      }

      if (isOk) {
        validRatios.push(ratio1Percent);
      }
    }

    if (validRatios.length > 0) {
      const min = Math.min(...validRatios);
      const max = Math.max(...validRatios);
      const recommended = Math.round((min + max) / 2);
      setSearchResult({
        message: `適合する配合比が見つかりました。`,
        range: `${min}% 〜 ${max}%`,
        recommended: recommended,
      });
    } else {
      setSearchResult({
        message: 'この2原料では規格を満たす配合比がありません。',
        range: null,
        recommended: null,
      });
    }
  };

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

    // Standard lines
    if (showStandard && standards[selectedStandard]) {
      const standard = standards[selectedStandard];
      const standardSizes = Object.keys(standard).map(Number).sort((a, b) => a - b);

      const upperLine = {
        x: standardSizes,
        y: standardSizes.map(size => standard[size].upper),
        mode: 'lines',
        name: `${selectedStandard} 上限`,
        type: 'scatter',
        line: { color: 'grey', dash: 'dash' }
      };
      const lowerLine = {
        x: standardSizes,
        y: standardSizes.map(size => standard[size].lower),
        mode: 'lines',
        name: `${selectedStandard} 下限`,
        type: 'scatter',
        line: { color: 'grey', dash: 'dash' }
      };

      traces.push(upperLine, lowerLine);
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

      <div style={{ marginTop: '20px', marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h2>製品規格と配合比探索</h2>
        <label htmlFor="standard-select">製品規格を選択:</label>
        <select
          id="standard-select"
          value={selectedStandard}
          onChange={(e) => setSelectedStandard(e.target.value)}
          style={{ marginRight: '20px' }}
        >
          {Object.keys(standards).map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <label>
          <input
            type="checkbox"
            checked={showStandard}
            onChange={(e) => setShowStandard(e.target.checked)}
          />
          グラフに規格範囲を表示
        </label>

        <button onClick={handleSearch} style={{ marginLeft: '20px', padding: '10px 20px' }}>
          配合比を探索
        </button>

        {searchResult && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f0f0' }}>
            <p>{searchResult.message}</p>
            {searchResult.range && (
              <p>
                推奨配合比 (原料1): {searchResult.recommended}%<br />
                適合範囲 (原料1): {searchResult.range}
              </p>
            )}
          </div>
        )}
      </div>

      {specCheckResults.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>規格判定結果 ({selectedStandard})</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #ccc' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>粒径 (mm)</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>下限値 (%)</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>合成値 (%)</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>上限値 (%)</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>判定</th>
              </tr>
            </thead>
            <tbody>
              {specCheckResults.map((result) => (
                <tr
                  key={result.size}
                  style={{
                    borderBottom: '1px solid #eee',
                    backgroundColor: result.status === 'NG' ? '#ffe6e6' : 'transparent',
                  }}
                >
                  <td style={{ padding: '8px' }}>{result.size}</td>
                  <td style={{ padding: '8px' }}>{result.lower ?? 'N/A'}</td>
                  <td style={{ padding: '8px' }}>{result.value ?? 'N/A'}</td>
                  <td style={{ padding: '8px' }}>{result.upper ?? 'N/A'}</td>
                  <td style={{ padding: '8px', fontWeight: 'bold', color: result.status === 'NG' ? 'red' : 'green' }}>
                    {result.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
