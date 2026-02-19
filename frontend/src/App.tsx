import { HashRouter, Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import ClientPage from './pages/ClientPage'
import ValidatorPage from './pages/ValidatorPage'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/client" element={<ClientPage />} />
        <Route path="/validator" element={<ValidatorPage />} />
      </Routes>
    </HashRouter>
  )
}
