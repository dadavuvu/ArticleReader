const pageSize = 6;
let currentPage = 0;
const cards = document.querySelectorAll('.book-card');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

function getRecentBooks() {
    try { return JSON.parse(localStorage.ArticleReaderRecentBooks || "[]"); }
    catch (e) { return []; }
}

function deleteCard(item) {
    const books = getRecentBooks();
    const index = books.findIndex(b => b.boardId === item.boardId && b.articleNo === item.articleNo);
    if (index === -1) return; // 없으면 종료

    books.splice(index, 1); // 해당 아이템만 제거
    localStorage.ArticleReaderRecentBooks = JSON.stringify(books);
    renderPage();
}

function renderPage() {
    const list = getRecentBooks();
    const maxPage = Math.max(0, Math.ceil(list.length / pageSize) - 1);
    if (currentPage > maxPage) currentPage = maxPage;
    const start = currentPage * pageSize;

    function attachCardEvents(card, item) {
        if (!item) {
            card.querySelector('img').src = '/placeholder.png';
            card.querySelector('.title').textContent = '';
            card.querySelector('.author').textContent = '';
            return;
        }

        const img = card.querySelector('img');
        const title = card.querySelector('.title');
        const author = card.querySelector('.author');

        img.src = item.thumbnail || '/placeholder.png';
        title.textContent = item.title || '';
        author.textContent = item.author || '';

        let pressTimer;
        const longPressDuration = 800;

        const startHandler = () => {
            pressTimer = setTimeout(() => {
                deleteCard(item);
                pressTimer = null;
            }, longPressDuration);
        };

        const endHandler = () => {
            if (pressTimer) {
                clearTimeout(pressTimer);
                // 일반 클릭 → 이동
                const url = `${encodeURIComponent(item.source)}?boardId=${encodeURIComponent(item.boardId)}&articleNo=${encodeURIComponent(item.articleNo)}`;
                window.location.href = url;
            }
        };

        card.addEventListener('touchstart', startHandler, { passive: true });
        card.addEventListener('touchend', endHandler);
        card.addEventListener('mousedown', startHandler);
        card.addEventListener('mouseup', endHandler);
    }

    cards.forEach((card, i) => {
        const item = list[start + i];
        attachCardEvents(card, item);
    });

    prevBtn.disabled = currentPage === 0;
    nextBtn.disabled = (start + pageSize) >= list.length;
    prevBtn.style.opacity = currentPage === 0 ? 0.2 : 0.4;
    nextBtn.style.opacity = (start + pageSize) >= list.length ? 0.2 : 0.4;
}

prevBtn.addEventListener('click', () => {
    if (currentPage > 0) { currentPage--; renderPage(); }
});

nextBtn.addEventListener('click', () => {
    if ((currentPage + 1) * pageSize < getRecentBooks().length) { currentPage++; renderPage(); }
});

// 다른 탭에서 recentBooks 변경될 경우
window.addEventListener('storage', (ev) => {
    if (ev.key === 'ArticleReaderRecentBooks') {
        renderPage();
    }
});

document.addEventListener('DOMContentLoaded', async function () {
    renderPage();
});