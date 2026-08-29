import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage'
import { RakhiPage } from '@/pages/RakhiPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/rakhi/:profileId" element={<RakhiPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App