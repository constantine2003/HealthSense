import React from "react";
import "../styles/history.css";
import Navbar from "../components/navbar2";
import BackButton from "../components/backbutton";
import { FiActivity, FiThermometer, FiHeart, FiBarChart } from 'react-icons/fi';
import { MdHeight, MdMonitorWeight } from 'react-icons/md';

const checkupHistory = [
  { id: 1, date: "Jan 23, 2026", time: "14:20", status: "success", stats: { spo2: "99", temp: "36.6", height: "1.75", weight: "60", bmi: "22.5", bp: "120/80", } },
  { id: 2, date: "Jan 25, 2026", time: "14:20", status: "success", stats: { spo2: "99", temp: "36.6", height: "1.75", weight: "60", bmi: "22.5", bp: "120/80", } },
  { id: 3, date: "Jan 22, 2026", time: "14:20", status: "success", stats: { spo2: "99", temp: "36.6", height: "1.75", weight: "60", bmi: "22.5", bp: "120/80", } },
  { id: 3, date: "Jan 22, 2026", time: "14:20", status: "success", stats: { spo2: "99", temp: "36.6", height: "1.75", weight: "60", bmi: "22.5", bp: "120/80", } },
];

const History = () => {
  return (
    <div className="main-container">
      <Navbar />
      <div className="history-content">
        <div className="history-body">
          <div className="history-box">
            <div className="top">
              <BackButton />
              <p className="toptext">History</p>
            </div>

            <div className="history-list">
              {checkupHistory.map((item) => (
                <div key={item.id} className="history-item">
                  <div className="date-section">
                    <span className="date-text">{item.date}</span>
                    <span className="time-text">{item.time}</span>
                  </div>

                  <div className="stats-preview">
                    <div className="mini-stat"><FiActivity /> {item.stats.spo2}%</div>
                    <div className="mini-stat"><FiThermometer /> {item.stats.temp}°C</div>
                    <div className="mini-stat"><FiBarChart /> {item.stats.bmi}</div>
                    <div className="mini-stat"><MdMonitorWeight /> {item.stats.weight}kg</div>
                    <div className="mini-stat"><MdHeight /> {item.stats.height}m</div>
                    <div className="mini-stat"><FiHeart /> {item.stats.bp}</div>
                    
                  </div>

                  <div className={`status-indicator ${item.status}`}>
                    {item.status === 'success' ? 'Normal' : 'Alert'}
                  </div>

                  <button className="details-arrow">View details</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;