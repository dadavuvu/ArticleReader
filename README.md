# ArticleReader
웹 커뮤니티의 글을 전자책에 특화된 UI로 읽으실 수 있습니다.
## 지원 커뮤니티 목록
- 디시인사이드
- 아카라이브
## 실행 방법
~~살려주세요지금염병할Puppeteer때매모바일에서실행을못해요~~<br>
[안드로이드 앱](https://github.com/dadavuvu/ArticleReader/releases)을 사용해주세요.
서버 설치 및 구동 스크립트
```
pkg upgrade && pkg i git nodejs && git clone https://github.com/dadavuvu/ArticleReader.git && cd ArticleReader && npm i && cd ..
```
서버 재구동 스크립트
```
cd ArticleReader && node index.js
```
서버 업데이트 스크립트
```
rm -rf ArticleReader && git clone https://github.com/dadavuvu/ArticleReader.git && cd ArticleReader && npm i && cd ..
```
# TODO
- 기타 웹사이트 지원 (ex. 포스타입, 루리웹)
# ETC
조승TV
