document.addEventListener('DOMContentLoaded', async function () {
  const urlParams = new URL(window.location.href).searchParams;
  if (!urlParams.has('id') || !urlParams.has('no')) return document.write("MISSING_PARAMETERS");
  let data = await fetch(`http://127.0.0.1:5050/proxy/dc/mgallery/board/view/?id=${urlParams.get("id")}&no=${urlParams.get("no")}`)
  const parser = new DOMParser();
  data = parser.parseFromString(await data.text(), 'text/html')

  if (data.querySelector(".delet")) return document.write("UNKNOWN_GALLERY");
  if (data.head.innerHTML.indexOf('alert("해당 갤러리는 존재하지 않습니다.");') != -1) return document.write("UNKNOWN_ARTICLE");

  const content = data.querySelector(".write_div")

  for (const element of content.querySelectorAll("img")) {
    console.dir(element)
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
    
    // element.parentNode.innerHTML = `<div class="image-container">${element.parentNode.innerHTML}</div>`
    // 씨 발놈의 이미지
    // element.remove()
  }

  for (const element of content.querySelectorAll("#spoiler_warning")) {
    element.remove()
  }

  for (const element of content.querySelectorAll("a")) {
    if (element.href.indexOf("https://gall.dcinside.com/mgallery/board/view") != -1) {
      element.setAttribute("target", "")
      element.href = "/dcinside.html?" + new URL(element.href).searchParams.toString()
    }
  }

  document.querySelector('.content').innerHTML = content.innerHTML

  Loaded()
});