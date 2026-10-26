import axios from 'axios';
const BASE = "http://127.0.0.1:5000";

export async function uploadCSV(file, onUploadProgress){
  const fd = new FormData();
  fd.append("file", file);
  const res = await axios.post(BASE + "/upload", fd, { headers: {'Content-Type':'multipart/form-data'}, onUploadProgress });
  return res.data;
}

export async function cleanPath(path){
  const res = await axios.post(BASE + "/clean", { path });
  return res.data;
}

export async function analyzePath(path){
  const res = await axios.post(BASE + "/analyze", { path });
  return res.data;
}

export async function fetchOutput(path){
  const res = await axios.get(BASE + "/get_output_json", { params: { path } });
  return res.data;
}
