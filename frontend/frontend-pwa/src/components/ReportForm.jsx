import { useState } from "react";
import axios from "axios";

export default function ReportForm({ onSubmit }) {
  const [form, setForm] = useState({
    type: "",
    severity: "",
    description: "",
    latitude: "",
    longitude: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const submit = async () => {
    await axios.post("http://localhost:5000/report", form);
    onSubmit();
  };

  return (
    <div>
      <input name="type" placeholder="Type" onChange={handleChange} />
      <input name="severity" placeholder="Severity" onChange={handleChange} />
      <input
        name="description"
        placeholder="Description"
        onChange={handleChange}
      />
      <input name="latitude" placeholder="Latitude" onChange={handleChange} />
      <input name="longitude" placeholder="Longitude" onChange={handleChange} />
      <button onClick={submit}>Submit</button>
    </div>
  );
}
