import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ResponsiveAppBar from './ResponsiveNavBar';
import Home from './pages/Home';
import Issuer from './pages/Issuer';
import Viewer from './pages/Viewer';
import Marketplace from './pages/Marketplace';
import Credits from './pages/Credits';

function App() {
  return (
    <Router>
      <ResponsiveAppBar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/issuer" element={<Issuer />} />
        <Route path="/viewer" element={<Viewer />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/credits" element={<Credits />} />
      </Routes>
    </Router>
  );
}

export default App;
