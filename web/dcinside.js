document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URL(window.location.href).searchParams;
  if (!urlParams.has('boardId') || !urlParams.has('articleNo')) return document.write("MISSING_PARAMETERS");
  let data = await fetch(`http://127.0.0.1:5050/proxy/dc/mgallery/board/view/?id=${urlParams.get("boardId")}&no=${urlParams.get("articleNo")}`)
  const parser = new DOMParser();
  data = parser.parseFromString(await data.text(), 'text/html')

  console.log(data)

  if (data.querySelector(".delet")) return document.write("UNKNOWN_GALLERY");
  if (data.head.innerHTML.indexOf('alert("해당 갤러리는 존재하지 않습니다.");') != -1) return document.write("UNKNOWN_ARTICLE");

  const content = data.querySelector(".write_div")
  document.title = data.querySelector(".title_headtext").textContent + " " + data.querySelector(".title_subject").textContent

  if (!localStorage.ArticleReaderRecentBooks) localStorage.ArticleReaderRecentBooks = JSON.stringify([]);
  if (!urlParams.has('boardId') || !urlParams.has('articleNo')) return document.write("MISSING_PARAMETERS");
  const boardId = urlParams.get("boardId");
  const articleNo = urlParams.get("articleNo");
  let recentBooks = JSON.parse(localStorage.ArticleReaderRecentBooks);
  recentBooks.unshift({
    boardId,
    articleNo,
    title: document.title,
    author: data.querySelector(".nickname").getAttribute("title"),
    thumbnail: content.querySelector("img") && content.querySelector("img").src,
    source: "/dcinside.html"
  });
  recentBooks = recentBooks.filter((item, index, self) =>
    index === self.findIndex(el => el.boardId === item.boardId && el.articleNo === item.articleNo)
  );

  localStorage.ArticleReaderRecentBooks = JSON.stringify(recentBooks);

  for (const element of content.querySelectorAll("img")) {
    element.style.cssText = ""
    element.setAttribute("onclick", "")
    element.setAttribute("onerror", "")
    element.setAttribute("alt", "")
    if (element.getAttribute("data-original")) {
      element.src = element.getAttribute("data-original")
    }

    var div = document.createElement("div");
    div.classList.add("image-container");
    element.parentNode.insertBefore(div, element.nextSibling);
    div.appendChild(element);
  }

  for (const element of content.querySelectorAll("#spoiler_warning")) {
    element.remove()
  }

  for (const element of content.querySelectorAll("a")) {
    if (element.href.indexOf("https://gall.dcinside.com/mgallery/board/view") != -1) {
      element.setAttribute("target", "")
      const params = new URL(element.href).searchParams
      element.href = `/dcinside.html?boardId=${params.get("id")}&articleNo=${params.get("no")}`
    }
  }

  document.querySelector('.content').innerHTML = content.innerHTML

  Loaded()
});