document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URL(window.location.href).searchParams;
  if (!urlParams.has('channelId')) return document.write("MISSING_PARAMETERS");
  if (urlParams.has('articleNo') && !urlParams.get('articleNo') == "") location.href = `arcalive.html?channelId=${urlParams.get("channelId")}&articleNo=${urlParams.get("articleNo")}`
  let data = await fetch(`/proxy/arcalive/${urlParams.get("channelId")}`)
  const parser = new DOMParser();
  data = parser.parseFromString(await data.text(), 'text/html')

  console.log(data)

  if (data.querySelector(".error-code")) return document.write(data.querySelector(".error-code").textContent);

  const content = data.querySelector(".article-list>.list-table")
  document.title = data.querySelector(".head>a>span").textContent

  let finalContent = document.createElement("div")
  finalContent.className = "article-list"

  for (const element of content.querySelectorAll("a.vrow.column")) {
    if (!element.querySelector(".user-info>span:nth-child(1)")) continue;
    let elementContent = document.createElement("a")
    elementContent.className = "article-item"
    const hrefMatch = element.href.match(/\/b\/(.*?)\/(\d+)(?:\?p=\d+)?/);
    if (hrefMatch) {
      const channelId = hrefMatch[1];
      const articleNo = hrefMatch[2];
      elementContent.href = `arcalive.html?channelId=${channelId}&articleNo=${articleNo}`;
    }
    elementContent.innerHTML = `${element.querySelector(".badge.badge-success") ? `<span class="article-category">${element.querySelector(".badge.badge-success").textContent}</span>` : ""}
    <span class="article-title">${element.querySelector(".title") ? element.querySelector(".title").textContent : element.querySelector(".vcol.col-title").textContent}</span>
    <span class="article-author">${element.querySelector(".user-info>span:nth-child(1)").textContent}</span>
    `
    finalContent.appendChild(elementContent)
  }

  document.querySelector('.content').appendChild(finalContent)
  document.querySelector('.loading').remove();
});