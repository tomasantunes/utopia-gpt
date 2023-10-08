import React, {useState, useEffect} from 'react';
import Select from 'react-select';
import axios from 'axios';
import config from '../config.json';
import Navbar from './Navbar';

export default function ScheduledTasks() {
  const [selectBots, setSelectBots] = useState([]);
  const [selectedBot, setSelectedBot] = useState(null);
  const [cronString, setCronString] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedType, setSelectedType] = useState(null);

  const types = [
    {value: "text_post", label: "Text Post"},
    {value: "image_post", label: "Image Post"},
    {value: "email", label: "Email"},
    {value: "news_post", label: "News Post"}
  ]

  function loadSelectBots() {
    axios.get(config.BASE_URL + '/api/get-bots')
    .then(function(response) {
      if (response.data.status == "OK") {
        var select_bots = [];
        for (var i in response.data.data) {
          select_bots.push({value: response.data.data[i].id, label: response.data.data[i].author});
        }
        setSelectBots(select_bots);
      }
      else {
        alert(response.data.error);
      }
    })
    .catch(function(err) {
      console.log(err);
      alert("Error loading bots: " + err.message);
    });
  }

  function changeSelectedBot(bot) {
    setSelectedBot(bot);
  }

  function changeCronString(event) {
    setCronString(event.target.value);
  }

  function changePrompt(event) {
    setPrompt(event.target.value);
  }

  function changeType(type) {
    setSelectedType(type);
  }

  function createScheduledTask() {
    axios.post(config.BASE_URL + "/api/create-scheduled-task", {bot_id: selectedBot.value, cron_string: cronString, prompt, type: selectedType.value})
    .then(res => {
      if (res.data.status == "OK") {
        alert("Scheduled task created successfully.");
      }
      else {
        alert(res.data.error);
      }
    })
    .catch(err => {
      alert(err.message);
    });
  }

  useEffect(() => {
    loadSelectBots();
  }, [])
  return (
    <>
      <Navbar />
      <div className="small-container">
        <h1>Scheduled Tasks</h1>
        <div className="form-group mb-2">
          <label>Type of Task</label>
          <Select options={types} value={selectedType} onChange={changeType} />
        </div>
        <div className="form-group mb-2">
          <label>Select Bot</label>
          <Select options={selectBots} value={selectedBot} onChange={changeSelectedBot} />
        </div>
        <div className="form-group mb-2">
          <label>Cron String</label>
          <input type="text" className="form-control" value={cronString} onChange={changeCronString} />
        </div>
        <div className="form-group mb-2">
          <label>Prompt</label>
          <textarea className="form-control" value={prompt} onChange={changePrompt}></textarea>
        </div>
        <div style={{textAlign: "right"}}>
          <button className="btn btn-primary" onClick={createScheduledTask}>Create Task</button>
        </div>
      </div>
    </>
  )
}
