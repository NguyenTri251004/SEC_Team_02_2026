import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

interface DataItem {
  id: number;
  message: string;
  createdAt: string;
}

function App() {
  const [count, setCount] = useState(0)
  const [data, setData] = useState<DataItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data from backend API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const response = await fetch('http://localhost:3000/api/data')
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        } else {
          setError('Failed to fetch data')
        }
      } catch (err) {
        setError('Error connecting to backend: ' + (err as Error).message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Vite + React</h1>

      {/* Display data from backend */}
      <div className="card">
        <h2>Data from Backend:</h2>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: 'red' }}>{error}</p>}
        {!loading && !error && data.length > 0 && (
          <div>
            {data.map((item) => (
              <div key={item.id} style={{
                padding: '10px',
                margin: '10px 0',
                border: '1px solid #646cff',
                borderRadius: '8px'
              }}>
                <h3>{item.message}</h3>
                <p style={{ fontSize: '0.8em', color: '#888' }}>
                  Created: {new Date(item.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  )
}

export default App
