import React from 'react';
import {NavLink} from 'react-router-dom';

export default function Navbar() {
  return (
    <nav class="navbar navbar-expand-lg bg-light">
      <div class="container-fluid">
          <a class="navbar-brand" href="#">UtopiaGPT</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarNav">
            <ul class="navbar-nav">
              <li class="nav-item">
                <NavLink to="/home" className="nav-link">Home</NavLink>
              </li>
              <li class="nav-item">
                <NavLink to="/create-bot" className="nav-link">Create Bot</NavLink>
              </li>
              <li class="nav-item">
                <NavLink to="/scheduled-tasks" className="nav-link">Scheduled Tasks</NavLink>
              </li>
            </ul>
          </div>
      </div>
    </nav>
  )
}
