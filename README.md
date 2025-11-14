# ArticleReader
웹 커뮤니티의 글을 전자책에 특화된 UI로 읽으실 수 있습니다.
## 지원 커뮤니티 목록
- 디시인사이드
- 아카라이브
## 실행 방법
휴대전화로 로컬 서버를 열어 실행합니다.<br>
서버 첫 설치 스크립트
```
pkg upgrade && pkg install proot-distro
proot-distro install alpine
```
내부망 접속 스크립트
```
proot-distro login alpine
```
내부망 첫 설치 스크립트
```
apk update && apk add --no-cache nmap && echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
  apk update && apk add --no-cache chromium
```
서버 설치 스크립트
```
git clone https://github.com/dadavuvu/ArticleReader.git && cd ArticleReader && npm i && cd ..
```
서버 구동 스크립트
```
cd ArticleReader && node index.js && cd ..
```
서버 업데이트 스크립트
```
cd ArticleReader && bash update.sh && cd ..
```
이후 [안드로이드 앱](https://github.com/dadavuvu/ArticleReader/releases)에서 사용해주세요.
# TODO
- 좀 더 쉬운 백엔드
- 기타 웹사이트 지원 (ex. 포스타입, 루리웹)
# ETC
조승TV
