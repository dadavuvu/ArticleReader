# ArticleReader
웹 커뮤니티의 글을 전자책에 특화된 UI로 읽으실 수 있습니다.
## 지원 커뮤니티 목록
- 디시인사이드
## 실행 방법
휴대전화로 로컬 서버를 열어 실행합니다.<br>
서버 설치 및 구동 스크립트
```
pkg i git && git clone https://github.com/dadavuvu/ArticleReader.git && cd ArticleReader && npm i index.js && node index.js
```
서버 재구동 스크립트
```
cd ArticleReader && node index.js
```
서버 업데이트 스크립트
```
rm -rf ArticleReader && git clone https://github.com/dadavuvu/ArticleReader.git && cd ArticleReader && npm i index.js && node index.js
```
이후 [안드로이드 앱](https://github.com/dadavuvu/ArticleReader/releases)을 사용하거나, [웹](http://127.0.0.1:5050)에서 사용해주세요.
# TODO
- 기타 웹사이트 지원 (ex. 아카라이브, 루리웹)
# ETC
조승게이병신
