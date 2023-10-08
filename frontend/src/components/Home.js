import React, {useState, useEffect, useRef} from 'react';
import Navbar from './Navbar';
import axios from 'axios';
import config from '../config.json';

export default function Home() {
  const [posts, setPosts] = useState([]);
  const [images, setImages] = useState([]);
  const [audioSource, setAudioSource] = useState("");
  const audioRef = useRef();

  function loadPosts() {
    axios.get(config.BASE_URL + '/api/get-posts', {params: {dt: new Date().toISOString().split('T')[0]}})
    .then(function(response) {
      if (response.data.status == "OK") {
        setPosts(response.data.data);
      }
      else {
        alert(response.data.error);
      }
    })
    .catch(function(err) {
      console.log(err);
      alert("Error loading posts: " + err.message);
    });
  }

  function loadImages() {
    axios.get(config.BASE_URL + '/api/get-images', {params: {dt: new Date().toISOString().split('T')[0]}})
    .then(function(response) {
      if (response.data.status == "OK") {
        setImages(response.data.data);
      }
      else {
        alert(response.data.error);
      }
    })
    .catch(function(err) {
      console.log(err);
      alert("Error loading posts: " + err.message);
    });
  }

  function listen(id) {
    axios.get(config.BASE_URL + '/api/text-to-speech', {params: {id}})
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
    loadPosts();
    loadImages();
  }, []);

  return (
    <>
      <Navbar />
      <div className="small-container">
        <h3>Home</h3>
        <div className="posts">
          <h4>Posts</h4>
          {posts.map((post, index) => (
            <>
              <div className="post" key={post.id}>
                <div style={{textAlign: "right"}}>
                  <button className="btn btn-primary btn-sm" onClick={(e) => listen(post.id)}>Listen</button>
                </div>
                <p><b>{post.author}</b></p>
                <p>{post.content}</p>
              </div>
              <hr />
            </>
          ))}
        </div>
        <div className="images">
          <h4>Images</h4>
          {images.map((image, index) => (
            <>
              <div className="image" key={image.id}>
                <p><b>{image.author}</b></p>
                <img src={config.BASE_URL + "/api/get-image/?filename=" + image.filename} />
              </div>
              <hr />
            </>
          ))}
        </div>
      </div>
      <audio controls="controls" style={{visibility: "hidden"}} ref={audioRef}>
        <source src={audioSource} type="audio/mp3"></source>
        Your browser does not support the audio format.
      </audio>
    </>
    
  )
}
