import React, {useState, useEffect, useParams} from 'react';
import axios from 'axios';
import Navbar from './Navbar';
import config from '../config.json';

export default function Email() {
  const { id } = useParams();
  const [email, setEmail] = useState({
    id: "",
    author: "",
    content: ""
  });
  const [audioSource, setAudioSource] = useState("");
  const audioRef = useRef();

  function loadEmail() {
    axios.get(config.BASE_URL + '/api/get-email', {params: {id: id}})
    .then(function(response) {
      if (response.data.status == "OK") {
        setEmail(response.data.data);
      }
      else {
        alert(response.data.error);
      }
    })
    .catch(function(err) {
      console.log(err);
      alert("Error loading email: " + err.message);
    });
  }

  function listen(id) {
    axios.get(config.BASE_URL + '/api/emails/text-to-speech', {params: {id}})
    .then(function(response) {
      if (response.data.status == "OK") {
        updateAudio(config.BASE_URL + "/api/get-audio/?id=" + id);
      }
      else {
        alert(response.data.error);
      }
    });
  }

  const updateAudio = (source) => {
    console.log(source);
    setAudioSource(source);
  }

  useEffect(() => {
    if(audioRef.current) {
      audioRef.current.pause();
      audioRef.current.load();
      audioRef.current.play();
    } 
  }, [audioSource]);

  useEffect(() => {
    loadEmail();
  }, [])
  return (
    <>
      <Navbar />
      <div className="small-container">
        <div className="post">
          <div style={{textAlign: "right"}}>
            <button className="btn btn-primary btn-sm" onClick={(e) => listen(email.id)}>Listen</button>
          </div>
          <p><b>{email.author}</b></p>
          <p>{email.content}</p>
        </div>
        <hr />
      </div>
      <audio controls="controls" style={{visibility: "hidden"}} ref={audioRef}>
        <source src={audioSource} type="audio/mp3"></source>
        Your browser does not support the audio format.
      </audio>
    </>
  )
}
