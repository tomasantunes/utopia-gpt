

async function getUSNews() {
  var news = await axios.get("https://newsapi.org/v2/top-headlines?country=us&apiKey=" + secretConfig.NEWSAPI_KEY);
  return news.data.articles;
}

async function getPTNews() {
  var news = await axios.get("https://newsapi.org/v2/top-headlines?country=pt&apiKey=" + secretConfig.NEWSAPI_KEY);
  return news.data.articles;
}

async function getTechNews() {
  var news = await axios.get("https://newsapi.org/v2/top-headlines?country=us&category=technology&apiKey=" + secretConfig.NEWSAPI_KEY);
  return news.data.articles;
}