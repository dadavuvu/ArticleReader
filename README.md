# ArticleReader
웹 커뮤니티의 글을 전자책에 특화된 UI로 읽으실 수 있습니다.
## 지원 커뮤니티 목록
- 디시인사이드
- 아카라이브
## 실행 방법
해당 앱은 Puppeteer와 Termux, proot-distro Alpine을 사용합니다. **이를 사용함에 따라 배터리 성능 저하, 저장용량 부족의 가능성이 있습니다.**<br>
[안드로이드 앱](https://github.com/dadavuvu/ArticleReader/releases)을 사용해주세요.
### [초기 설치] proot-distro 설치 및 구동
```
pkg install proot-distro
proot-distro install alpine
proot-distro login alpine
apk update && apk add --no-cache nmap && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/community >> /etc/apk/repositories && \
  echo @edge http://nl.alpinelinux.org/alpine/edge/main >> /etc/apk/repositories && \
  apk update && \
  apk add --no-cache \
```
### [초기 설치] 서버 설치 스크립트
```
apk add git nodejs
git clone https://github.com/dadavuvu/ArticleReader.git
cd ArticleReader
npm i
cd ..
```
### 서버 실행 스크립트
```
cd ArticleReader
node index.js
cd ..
```
### 서버 업데이트 스크립트
```
rm -rf ArticleReader
git clone https://github.com/dadavuvu/ArticleReader.git
cd ArticleReader
npm i
cd ..
```
# TODO
- 기타 웹사이트 지원 (ex. 포스타입, 루리웹)
# ETC
조승TV
