import { Router } from "express";
import axios from "axios";

const router = Router();

//Funcional or API
router.post("/", async (req, res) => {
  const { body } = req;
  const { prompt } = body;
  console.log(body);

  const { data } = await axios.post("http://localhost:11434/api/generate/", {
    model: "phi3",
    prompt: prompt,
    stream: false,
  });

  console.log(data.response);
  res.json({ response: data.response });
});

router.post("/init", async (req, res) => {
  const { body } = req;
  const { prompt } = body;
  console.log(body);

  const { data } = await axios.post("http://localhost:11434/api/generate/", {
    model: "phi3",
    prompt: "",
    stream: false,
  });

  console.log(data.response);
  res.json({ response: data.response });
});

export default router;
