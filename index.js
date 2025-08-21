var fetch = require('node-fetch');
var express = require('express')
var app = express();

app.use(express.static('web'))

app.get('/proxy/dc/*', async (req, res) => {
  const url = req.url.replaceAll("/proxy/dc", "")
  const data = await fetch("https://gall.dcinside.com" + url)
  const textData = await data.text()
  res.send(textData)
})

app.listen(5050, () => {
  console.log(`http://127.0.0.1:5050`)
})