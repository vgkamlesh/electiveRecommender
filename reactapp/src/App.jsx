import { useEffect, useState } from 'react';
import './App.css';

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) {
      setError('No recommendation id found in URL.');
      setLoading(false);
      return;
    }

    fetch(`https://electiverecommender.onrender.com/api/recommendation/${id}`, {
      signal: controller.signal
    })
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch recommendation');
        }
        return res.json();
      })
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') {
          return;
        }
        setError('Could not load recommendation data.');
        setLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="wrap">
        <div className="panel state-panel">
          <h1>React Dashboard</h1>
          <p className="state-text">Loading recommendation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrap">
        <div className="panel state-panel">
          <h1>React Dashboard</h1>
          <p className="state-text error-text">{error}</p>
        </div>
      </div>
    );
  }

  const recommendations = Array.isArray(data?.recommendations)
    ? data.recommendations
    : [];

  const maxScore = Math.max(...recommendations.map(item => item.score), 1);
  const topThree = recommendations.slice(0, 3);

  return (
    <div className="wrap">
      <div className="panel">
        <div className="hero">
          <h1>Recommendation Dashboard</h1>
          <p className="sub">
            Student: <strong>{data.student.name}</strong>
            <span className="dot">•</span>
            GPA: <strong>{data.student.gpa}</strong>
            <span className="dot">•</span>
            Goal: <strong>{data.student.goal}</strong>
          </p>
        </div>

        {Array.isArray(data.overallWarnings) && data.overallWarnings.length > 0 && (
          <div className="warning-box">
            <h2>Important Note</h2>
            <ul>
              {data.overallWarnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="chart-card">
          <h2>Top 3 Scores</h2>

          {topThree.map(item => (
            <div className="bar-row" key={item.name}>
              <div className="bar-label">
                <span>{item.name}</span>
                <strong>{item.score}</strong>
              </div>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${(item.score / maxScore) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid">
          {recommendations.map(item => (
            <div className="mini-card" key={item.name}>
              <div className="card-top">
                <h3>{item.name}</h3>
                <span className={`badge badge-${item.difficulty.toLowerCase()}`}>
                  {item.difficulty}
                </span>
              </div>

              <p><strong>Domain:</strong> {item.domain}</p>
              <p><strong>Placement Value:</strong> {item.placementValue}</p>
              <p><strong>Higher Study Value:</strong> {item.higherStudyValue}</p>
              <p><strong>Score:</strong> {item.score}</p>

              {item.description && <p className="desc">{item.description}</p>}

              {Array.isArray(item.reasons) && item.reasons.length > 0 && (
                <div className="info-block">
                  <h4>Why recommended</h4>
                  <ul>
                    {item.reasons.map((reason, index) => (
                      <li key={index}>{reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              {Array.isArray(item.warnings) && item.warnings.length > 0 && (
                <div className="info-block warning-block">
                  <h4>Warnings</h4>
                  <ul>
                    {item.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
