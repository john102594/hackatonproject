import axios from "axios";
import { Ollama } from "@langchain/community/llms/ollama";

const modelo = async (prompt) => {
  const ollama = new Ollama({
    baseUrl: "http://localhost:11434", // Default value
    model: "phi3", // Default value
  });
  const stream = await ollama.stream(prompt);
  const chunks = [];
  for await (const chunk of stream) {
    console.log(chunk);
  }
  console.log(chunks.join(""));
  return chunks.join("");
};

export default modelo;
