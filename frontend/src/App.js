import './App.css';
import {
  BrowserRouter,
  Routes,
  Route,
} from "react-router-dom";
import Home from './components/Home';
import Login from './components/Login';
import CreateBot from './components/CreateBot';
import ScheduledTasks from './components/ScheduledTasks';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/create-bot" element={<CreateBot />} />
        <Route path="/scheduled-tasks" element={<ScheduledTasks />} />
      </Routes>
    </BrowserRouter>
    </div>
  );
}

export default App;
