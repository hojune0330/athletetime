// Client-side entry point
import React from 'react'
import ReactDOM from 'react-dom/client'
import { InteractiveAppV2 } from './components/InteractiveAppV2'

// CSS 임포트가 필요한 경우
// import './index.css'

// DOM이 로드된 후 React 앱 마운트
if (typeof document !== 'undefined') {
  const container = document.getElementById('root')
  if (container) {
    const root = ReactDOM.createRoot(container)
    root.render(
      <React.StrictMode>
        <InteractiveAppV2 />
      </React.StrictMode>
    )
  }
}