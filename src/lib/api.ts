import axios from "axios";

export const api = axios.create({
  baseURL: "https://facilita-ai-api.onrender.com",
});

const options = {
  method: "GET",
  url: "https://youtube-mp36.p.rapidapi.com/dl",
  params: {},
  headers: {
    "X-RapidAPI-Key": "ea5ece358emsh662f2e9af3ef586p1fd73ejsn922f2f379f25",
    "X-RapidAPI-Host": "youtube-mp36.p.rapidapi.com",
  },
};

export const fetchMP3Link = async (id: String) => {
  options.params = { id };
  try {
    const response = await axios.request(options);
    if (response.status === 200 && response.data.status === "ok") {
      return response.data.link;
    } else {
      throw new Error("Falha ao obter o link do MP3.");
    }
  } catch (error) {
    console.error(error);
  }
};
